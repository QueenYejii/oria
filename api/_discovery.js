const defaultNodeUrl = "https://api.shelbynet.shelby.xyz/v1";

function getConfig() {
  const registryAddress = process.env.ORIA_REGISTRY_ADDRESS || process.env.VITE_ORIA_REGISTRY_ADDRESS;
  const nodeUrl = process.env.APTOS_NODE_URL || process.env.VITE_APTOS_NODE_URL || defaultNodeUrl;

  if (!registryAddress) {
    throw new Error("ORIA_REGISTRY_ADDRESS is required.");
  }

  return {
    registryAddress,
    nodeUrl,
    registryType: `${registryAddress}::space_registry::Registry`,
    spaceRecordType: `${registryAddress}::space_registry::SpaceRecord`,
  };
}

export function sendJson(response, status, payload) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("access-control-allow-origin", process.env.CORS_ORIGIN || "*");
  response.setHeader("access-control-allow-methods", "GET,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.status(status).json(payload);
}

export function handleOptions(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return true;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return true;
  }

  return false;
}

async function aptos(path, init) {
  const { nodeUrl } = getConfig();
  const response = await fetch(`${nodeUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Aptos ${response.status}: ${text}`);
  }

  return response.json();
}

async function getRegistry() {
  const { registryAddress, registryType } = getConfig();
  const resource = await aptos(
    `/accounts/${registryAddress}/resource/${encodeURIComponent(registryType)}`,
  );
  return resource.data;
}

async function getTableItem(handle, keyType, valueType, key) {
  return aptos(`/tables/${handle}/item`, {
    method: "POST",
    body: JSON.stringify({
      key_type: keyType,
      value_type: valueType,
      key,
    }),
  });
}

function tableHandle(table) {
  return typeof table === "object" && table ? table.handle : undefined;
}

function normalizeRecord(record) {
  return {
    spaceId: record.space_id,
    creator: record.creator,
    network: record.network,
    manifestBlobName: record.manifest_blob_name,
    manifestHash: record.manifest_hash,
    manifestVersion: Number(record.manifest_version),
    visibility: Number(record.visibility),
    accessRule: Number(record.access_rule),
    priceOctas: Number(record.price_octas),
    createdAtMicros: Number(record.created_at_micros),
    updatedAtMicros: Number(record.updated_at_micros),
  };
}

export async function listRecords(searchParams) {
  const { spaceRecordType } = getConfig();
  const registry = await getRegistry();
  const handle = tableHandle(registry.spaces);
  const ids = Array.isArray(registry.space_ids) ? registry.space_ids : [];
  const records = await Promise.all(
    ids.map((spaceId) => getTableItem(handle, "0x1::string::String", spaceRecordType, spaceId)),
  );
  const normalized = records.map(normalizeRecord);
  const q = searchParams.get("q")?.toLowerCase();
  const creator = searchParams.get("creator")?.toLowerCase();
  const network = searchParams.get("network");
  const visibility = searchParams.get("visibility");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  return normalized
    .filter((record) => !creator || record.creator.toLowerCase() === creator)
    .filter((record) => !network || record.network === network)
    .filter((record) => !visibility || String(record.visibility) === visibility)
    .filter(
      (record) =>
        !q ||
        record.spaceId.toLowerCase().includes(q) ||
        record.creator.toLowerCase().includes(q) ||
        record.manifestBlobName.toLowerCase().includes(q),
    )
    .sort((a, b) => b.createdAtMicros - a.createdAtMicros)
    .slice(0, limit);
}

export async function getRecord(spaceId) {
  const { spaceRecordType } = getConfig();
  const registry = await getRegistry();
  const handle = tableHandle(registry.spaces);
  const record = await getTableItem(handle, "0x1::string::String", spaceRecordType, spaceId);
  return normalizeRecord(record);
}

export async function getAccess(spaceId, wallet) {
  const registry = await getRegistry();
  const purchasesHandle = tableHandle(registry.purchases);
  const allowlistsHandle = tableHandle(registry.allowlists);
  let purchases = [];
  let allowlist = [];

  try {
    purchases = await getTableItem(
      purchasesHandle,
      "0x1::string::String",
      "vector<address>",
      spaceId,
    );
  } catch {
    purchases = [];
  }

  try {
    allowlist = await getTableItem(
      allowlistsHandle,
      "0x1::string::String",
      "vector<address>",
      spaceId,
    );
  } catch {
    allowlist = [];
  }

  const normalizedWallet = wallet.toLowerCase();
  return {
    hasPurchased: purchases.some((item) => String(item).toLowerCase() === normalizedWallet),
    isAllowlisted: allowlist.some((item) => String(item).toLowerCase() === normalizedWallet),
  };
}

export function getHealthPayload() {
  const { registryAddress, nodeUrl } = getConfig();
  return {
    ok: true,
    registryAddress,
    nodeUrl,
  };
}
