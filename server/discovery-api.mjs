import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 8787);
const registryAddress = process.env.ORIA_REGISTRY_ADDRESS;
const nodeUrl =
  process.env.APTOS_NODE_URL ?? process.env.VITE_APTOS_NODE_URL ?? "https://api.testnet.aptoslabs.com/v1";

const moduleAddress = registryAddress;
const registryType = moduleAddress
  ? `${moduleAddress}::space_registry::Registry`
  : undefined;
const spaceRecordType = moduleAddress
  ? `${moduleAddress}::space_registry::SpaceRecord`
  : undefined;

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": process.env.CORS_ORIGIN ?? "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
}

async function aptos(path, init) {
  const response = await fetch(`${nodeUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Aptos ${response.status}: ${text}`);
  }

  return response.json();
}

async function getRegistry() {
  if (!registryAddress || !registryType || !spaceRecordType) {
    throw new Error("ORIA_REGISTRY_ADDRESS is required.");
  }

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

async function listRecords(query) {
  const registry = await getRegistry();
  const handle = tableHandle(registry.spaces);
  const ids = Array.isArray(registry.space_ids) ? registry.space_ids : [];
  const records = await Promise.all(
    ids.map((spaceId) => getTableItem(handle, "0x1::string::String", spaceRecordType, spaceId)),
  );
  const normalized = records.map(normalizeRecord);
  const q = query.get("q")?.toLowerCase();
  const creator = query.get("creator")?.toLowerCase();
  const network = query.get("network");
  const visibility = query.get("visibility");
  const limit = Math.min(Number(query.get("limit") ?? 50), 100);

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

async function getRecord(spaceId) {
  const registry = await getRegistry();
  const handle = tableHandle(registry.spaces);
  const record = await getTableItem(handle, "0x1::string::String", spaceRecordType, spaceId);
  return normalizeRecord(record);
}

async function getAccess(spaceId, wallet) {
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

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (url.pathname === "/health") {
      sendJson(response, 200, { ok: true, registryAddress, nodeUrl });
      return;
    }

    if (url.pathname === "/spaces") {
      sendJson(response, 200, { spaces: await listRecords(url.searchParams) });
      return;
    }

    const creatorMatch = url.pathname.match(/^\/creators\/([^/]+)$/);
    if (creatorMatch) {
      const creator = decodeURIComponent(creatorMatch[1]);
      const query = new URLSearchParams(url.searchParams);
      query.set("creator", creator);
      sendJson(response, 200, { creator, spaces: await listRecords(query) });
      return;
    }

    const accessMatch = url.pathname.match(/^\/spaces\/([^/]+)\/access\/([^/]+)$/);
    if (accessMatch) {
      sendJson(response, 200, await getAccess(decodeURIComponent(accessMatch[1]), accessMatch[2]));
      return;
    }

    const spaceMatch = url.pathname.match(/^\/spaces\/([^/]+)$/);
    if (spaceMatch) {
      sendJson(response, 200, { space: await getRecord(decodeURIComponent(spaceMatch[1])) });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`Oria discovery API listening on http://127.0.0.1:${port}`);
});
