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
    currency: receipt.currency === "APT" ? "APT" : "APT",
    spaceTitle: String(receipt.spaceTitle || "Paid Space"),
    paidAt: Number(receipt.paidAt || Date.now()),
    source: "receipt_mirror",
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
  const receipt = normalizeReceipt(input);
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
