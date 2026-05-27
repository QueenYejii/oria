import { aptos, getConfig, getRecord } from "./_discovery.js";

const RECEIPTS_KEY = "oria:receipts:v1";
const memoryReceipts = new Map();

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function normalizeAddress(value) {
  return String(value || "").toLowerCase();
}

function canonicalAddress(value) {
  const raw = String(value || "").toLowerCase().replace(/^0x/, "");
  const trimmed = raw.replace(/^0+/, "") || "0";
  return `0x${trimmed}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getTransactionByHash(txHash) {
  let lastError = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await aptos(`/transactions/by_hash/${encodeURIComponent(txHash)}`);
    } catch (error) {
      lastError = error;
      if (attempt < 7) await sleep(750);
    }
  }

  throw lastError || new Error("Transaction was not found.");
}

function assertReceiptTransaction(receipt, transaction, spaceRecord) {
  const { registryAddress, registryModule: defaultRegistryModule } = getConfig();
  const registryModule = receipt.registryModule || spaceRecord?.registryModule || defaultRegistryModule;
  const payload = transaction?.payload || {};
  const expectedFunction =
    receipt.currency === "SHELBY_USD"
      ? `${canonicalAddress(registryAddress)}::${registryModule}::purchase_space_shelby_usd`
      : `${canonicalAddress(registryAddress)}::${registryModule}::purchase_space`;
  const actualFunction = String(payload.function || "").replace(/^0x0+/, "0x").toLowerCase();
  const args = Array.isArray(payload.arguments) ? payload.arguments : [];

  if (!transaction || transaction.type !== "user_transaction") {
    throw new Error("Receipt transaction is not a user transaction.");
  }

  if (!transaction.success) {
    throw new Error(`Receipt transaction did not execute successfully: ${transaction.vm_status || "unknown status"}.`);
  }

  if (canonicalAddress(transaction.sender) !== canonicalAddress(receipt.payer)) {
    throw new Error("Receipt payer does not match the transaction sender.");
  }

  if (actualFunction !== expectedFunction) {
    throw new Error("Receipt transaction is not an Oria purchase call.");
  }

  if (canonicalAddress(args[0]) !== canonicalAddress(registryAddress) || String(args[1]) !== receipt.spaceId) {
    throw new Error("Receipt transaction does not unlock this Space.");
  }

  if (spaceRecord && canonicalAddress(spaceRecord.creator) !== canonicalAddress(receipt.creator)) {
    throw new Error("Receipt creator does not match the registered Space creator.");
  }

  if (spaceRecord && String(spaceRecord.network) !== String(receipt.network)) {
    throw new Error("Receipt network does not match the registered Space.");
  }
}

async function verifyReceipt(input) {
  const receipt = normalizeReceipt(input);
  const [transaction, spaceRecord] = await Promise.all([
    getTransactionByHash(receipt.txHash),
    getRecord(receipt.spaceId),
  ]);

  assertReceiptTransaction(receipt, transaction, spaceRecord);

  return {
    ...receipt,
    registryModule: receipt.registryModule || spaceRecord?.registryModule,
    amountOctas: Number(spaceRecord?.priceOctas || receipt.amountOctas || 0),
    creator: spaceRecord?.creator || receipt.creator,
    network: spaceRecord?.network || receipt.network,
    paidAt: transaction.timestamp ? Math.floor(Number(transaction.timestamp) / 1000) : receipt.paidAt,
    chainStatus: "verified",
    verifiedAt: Date.now(),
    transactionVersion: transaction.version ? String(transaction.version) : undefined,
  };
}

function normalizeReceipt(input) {
  const receipt = typeof input === "object" && input ? input : {};
  const receiptId =
    String(receipt.receiptId || "") ||
    `oria-${String(receipt.network || "shelbynet")}-${String(receipt.spaceId || "").slice(-8)}-${String(receipt.txHash || "").slice(-8)}`;

  if (!receipt.spaceId || !receipt.network || !receipt.payer || !receipt.creator || !receipt.txHash) {
    throw new Error("spaceId, network, payer, creator, and txHash are required.");
  }

  return {
    receiptId,
    spaceId: String(receipt.spaceId),
    network: String(receipt.network),
    payer: String(receipt.payer),
    buyer: String(receipt.payer),
    creator: String(receipt.creator),
    txHash: String(receipt.txHash),
    amountOctas: Number(receipt.amountOctas || 0),
    currency: receipt.currency === "SHELBY_USD" ? "SHELBY_USD" : "APT",
    spaceTitle: String(receipt.spaceTitle || "Indexed paid Space"),
    paidAt: Number(receipt.paidAt || Date.now()),
    source: "receipt_mirror",
    registryModule: receipt.registryModule ? String(receipt.registryModule) : undefined,
    chainStatus: String(receipt.chainStatus || "pending"),
    createdAt: Date.now(),
  };
}

async function redisCommand(command) {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Receipt store ${response.status}: ${text}`);
  }

  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

export async function saveReceipt(input) {
  const receipt = await verifyReceipt(input);
  const redis = getRedisConfig();

  if (redis) {
    await redisCommand(["HSET", RECEIPTS_KEY, receipt.receiptId, JSON.stringify(receipt)]);
  } else {
    memoryReceipts.set(receipt.receiptId, receipt);
  }

  return receipt;
}

export async function listReceipts(filters = {}) {
  const redis = getRedisConfig();
  const rawRecords = redis
    ? await redisCommand(["HVALS", RECEIPTS_KEY])
    : [...memoryReceipts.values()];
  const records = (rawRecords || [])
    .map((record) => {
      if (typeof record === "string") {
        try {
          return JSON.parse(record);
        } catch {
          return null;
        }
      }

      return record;
    })
    .filter(Boolean);
  const creator = filters.creator ? normalizeAddress(filters.creator) : null;
  const payer = filters.payer ? normalizeAddress(filters.payer) : null;
  const spaceId = filters.spaceId ? String(filters.spaceId) : null;
  const network = filters.network ? String(filters.network) : null;

  return records
    .filter((receipt) => !creator || normalizeAddress(receipt.creator) === creator)
    .filter((receipt) => !payer || normalizeAddress(receipt.payer || receipt.buyer) === payer)
    .filter((receipt) => !spaceId || receipt.spaceId === spaceId)
    .filter((receipt) => !network || receipt.network === network)
    .sort((a, b) => Number(b.paidAt || 0) - Number(a.paidAt || 0));
}

export function getReceiptStoreStatus() {
  return {
    mode: getRedisConfig() ? "upstash_redis" : "memory",
    persistent: Boolean(getRedisConfig()),
  };
}
