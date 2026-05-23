const defaultNodeUrl = "https://api.shelbynet.shelby.xyz/v1";
const cache = new Map();
const registryCacheKey = "registry";
const registryTtlMs = 15_000;
const recordTtlMs = 30_000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCached(key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

function getConfig() {
  const registryAddress = process.env.ORIA_REGISTRY_ADDRESS || process.env.VITE_ORIA_REGISTRY_ADDRESS;
  const nodeUrl = process.env.APTOS_NODE_URL || process.env.VITE_APTOS_NODE_URL || defaultNodeUrl;
  const indexerUrl = process.env.APTOS_INDEXER_URL || process.env.VITE_APTOS_INDEXER_URL;

  if (!registryAddress) {
    throw new Error("ORIA_REGISTRY_ADDRESS is required.");
  }

  return {
    registryAddress,
    nodeUrl,
    indexerUrl,
    registryType: `${registryAddress}::space_registry::Registry`,
    spaceRecordType: `${registryAddress}::space_registry::SpaceRecord`,
    purchaseEventType: `${registryAddress}::space_registry::SpacePurchased`,
  };
}

export function sendJson(response, status, payload) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("access-control-allow-origin", process.env.CORS_ORIGIN || "*");
  response.setHeader("access-control-allow-methods", "GET,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.status(status).json(payload);
}

export function sendHtml(response, status, html) {
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.setHeader("access-control-allow-origin", process.env.CORS_ORIGIN || "*");
  response.status(status).send(html);
}

export function wantsHtml(request, url) {
  if (url.searchParams.get("format") === "html") return true;
  if (url.searchParams.get("format") === "json") return false;

  const accept = String(request.headers.accept || "");
  return accept.includes("text/html") && !accept.includes("application/json");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMicros(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Unknown";
  return new Date(Math.floor(numeric / 1000)).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function visibilityLabel(value) {
  if (Number(value) === 1) return "Wallet gated";
  if (Number(value) === 2) return "Paid";
  return "Public";
}

function shorten(value) {
  const text = String(value || "");
  if (text.length <= 18) return text;
  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

export function renderSpacesHtml(records, requestUrl) {
  const totalPrice = records.reduce((sum, record) => sum + Number(record.priceOctas || 0), 0);
  const rows = records
    .map(
      (record) => `
        <tr>
          <td>
            <strong>${escapeHtml(record.spaceId)}</strong>
            <small>${escapeHtml(record.manifestBlobName)}</small>
          </td>
          <td>${escapeHtml(shorten(record.creator))}</td>
          <td><span>${escapeHtml(record.network)}</span></td>
          <td>${escapeHtml(visibilityLabel(record.visibility))}</td>
          <td>${escapeHtml(record.manifestVersion)}</td>
          <td>${escapeHtml(formatMicros(record.createdAtMicros))}</td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Oria Discovery API</title>
  <style>
    :root {
      color-scheme: light;
      --ink: oklch(0.16 0.025 190);
      --paper: oklch(0.94 0.018 78);
      --line: color-mix(in oklch, var(--ink) 14%, transparent);
      --teal: oklch(0.46 0.105 188);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(90deg, color-mix(in oklch, var(--ink) 5%, transparent) 1px, transparent 1px),
        linear-gradient(0deg, color-mix(in oklch, var(--ink) 4%, transparent) 1px, transparent 1px),
        var(--paper);
      background-size: 48px 48px;
      font: 700 15px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { width: min(1120px, calc(100% - 32px)); margin: 48px auto; display: grid; gap: 18px; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
    h1 { margin: 0; max-width: 720px; font-size: clamp(42px, 8vw, 92px); line-height: .9; letter-spacing: 0; }
    p { margin: 10px 0 0; max-width: 640px; color: color-mix(in oklch, var(--ink) 62%, var(--paper)); }
    a { color: inherit; }
    .pill, td span {
      display: inline-flex; align-items: center; width: fit-content; padding: 8px 11px;
      border-radius: 999px; background: color-mix(in oklch, var(--teal) 12%, var(--paper));
      color: color-mix(in oklch, var(--teal) 58%, var(--ink)); font-size: 12px; font-weight: 950;
    }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .stats article, .table-wrap {
      border: 1px solid var(--line); border-radius: 22px;
      background: color-mix(in oklch, var(--paper) 76%, transparent);
      box-shadow: 0 18px 70px color-mix(in oklch, var(--ink) 7%, transparent), inset 0 1px 0 color-mix(in oklch, var(--paper) 90%, transparent);
    }
    .stats article { min-height: 116px; padding: 18px; display: grid; align-content: space-between; }
    .stats span { color: color-mix(in oklch, var(--ink) 55%, var(--paper)); font-size: 12px; text-transform: uppercase; }
    .stats strong { font-size: 34px; line-height: 1; }
    .table-wrap { overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 16px; text-align: left; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: color-mix(in oklch, var(--ink) 56%, var(--paper)); font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    td strong, td small { display: block; overflow-wrap: anywhere; }
    td small { margin-top: 4px; color: color-mix(in oklch, var(--ink) 50%, var(--paper)); font-size: 12px; }
    .empty { padding: 28px; }
    @media (max-width: 760px) {
      header, .stats { grid-template-columns: 1fr; display: grid; align-items: start; }
      table, thead, tbody, th, td, tr { display: block; }
      thead { display: none; }
      tr { border-bottom: 1px solid var(--line); }
      td { border-bottom: 0; padding: 10px 16px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <span class="pill">Oria Discovery API</span>
        <h1>Shelbynet Spaces</h1>
        <p>Readable registry view for Spaces currently indexed by Oria. Use <a href="${escapeHtml(requestUrl.pathname)}?format=json">format=json</a> for the raw API response.</p>
      </div>
    </header>
    <section class="stats">
      <article><span>Spaces</span><strong>${records.length}</strong></article>
      <article><span>Paid value</span><strong>${totalPrice / 100000000} APT</strong></article>
      <article><span>Registry</span><strong>Live</strong></article>
    </section>
    <section class="table-wrap">
      ${
        records.length
          ? `<table>
              <thead><tr><th>Space</th><th>Creator</th><th>Network</th><th>Visibility</th><th>Version</th><th>Created</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`
          : `<div class="empty"><h2>No Spaces indexed yet.</h2><p>Publish a Space in Oria, then refresh this endpoint.</p></div>`
      }
    </section>
  </main>
</body>
</html>`;
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
  const cached = getCached(registryCacheKey);
  if (cached) return cached;

  const resource = await aptos(
    `/accounts/${registryAddress}/resource/${encodeURIComponent(registryType)}`,
  );
  return setCached(registryCacheKey, resource.data, registryTtlMs);
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

function parsePagination(searchParams) {
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  return { limit, offset };
}

async function getRecordFromTable(handle, spaceRecordType, spaceId) {
  const cacheKey = `space:${spaceId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const record = await getTableItem(handle, "0x1::string::String", spaceRecordType, spaceId);
  return setCached(cacheKey, normalizeRecord(record), recordTtlMs);
}

export async function listRecordsPage(searchParams) {
  const { spaceRecordType } = getConfig();
  const registry = await getRegistry();
  const handle = tableHandle(registry.spaces);
  const ids = Array.isArray(registry.space_ids) ? registry.space_ids : [];
  const q = searchParams.get("q")?.toLowerCase();
  const creator = searchParams.get("creator")?.toLowerCase();
  const network = searchParams.get("network");
  const visibility = searchParams.get("visibility");
  const { limit, offset } = parsePagination(searchParams);
  const needsFullScan = Boolean(q || creator || network || visibility);
  const sortedIds = [...ids].reverse();
  const idsToFetch = needsFullScan ? sortedIds : sortedIds.slice(offset, offset + limit);
  const normalized = await Promise.all(
    idsToFetch.map((spaceId) => getRecordFromTable(handle, spaceRecordType, spaceId)),
  );

  const filtered = normalized
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
    .sort((a, b) => b.createdAtMicros - a.createdAtMicros);
  const pageRecords = needsFullScan ? filtered.slice(offset, offset + limit) : filtered;

  return {
    records: pageRecords,
    pagination: {
      limit,
      offset,
      count: pageRecords.length,
      total: needsFullScan ? filtered.length : ids.length,
      hasMore: offset + pageRecords.length < (needsFullScan ? filtered.length : ids.length),
    },
    cache: {
      ttlMs: recordTtlMs,
      mode: needsFullScan ? "filtered-scan" : "paged",
    },
  };
}

export async function listRecords(searchParams) {
  const page = await listRecordsPage(searchParams);
  return page.records;
}

export async function getRecord(spaceId) {
  const { spaceRecordType } = getConfig();
  const registry = await getRegistry();
  const handle = tableHandle(registry.spaces);
  return getRecordFromTable(handle, spaceRecordType, spaceId);
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
  const { registryAddress, nodeUrl, indexerUrl } = getConfig();
  return {
    ok: true,
    registryAddress,
    nodeUrl,
    indexerUrl: indexerUrl || null,
  };
}

function normalizePaymentEvent(event) {
  const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data || {};
  const paidAtMicros = Number(data.purchased_at_micros || data.paid_at_micros || 0);
  const paidAt = paidAtMicros > 0 ? Math.floor(paidAtMicros / 1000) : Date.now();
  const network = data.network || "shelbynet";
  const txHash = event.transaction_hash || event.transactionHash || String(event.transaction_version || "");

  return {
    spaceId: data.space_id,
    network,
    payer: data.buyer,
    txHash,
    paidAt,
    amountOctas: Number(data.price_octas || 0),
    currency: "APT",
    creator: data.creator,
    receiptId: `oria-${network}-${String(data.space_id || "").slice(-8)}-${String(txHash).slice(-8)}`,
    source: "registry",
    chainStatus: "verified",
    eventIndex: Number(event.event_index ?? 0),
    transactionVersion: String(event.transaction_version ?? ""),
  };
}

export async function listPaymentEvents(searchParams) {
  const { indexerUrl, purchaseEventType } = getConfig();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  if (!indexerUrl) {
    return {
      payments: [],
      source: "indexer_unavailable",
      error: "APTOS_INDEXER_URL is not configured for this deployment.",
    };
  }

  const filters = [{ type: { _eq: purchaseEventType } }];
  const buyer = searchParams.get("buyer")?.toLowerCase();
  const creator = searchParams.get("creator")?.toLowerCase();
  const spaceId = searchParams.get("spaceId");
  if (buyer) filters.push({ data: { _contains: { buyer } } });
  if (creator) filters.push({ data: { _contains: { creator } } });
  if (spaceId) filters.push({ data: { _contains: { space_id: spaceId } } });

  const response = await fetch(indexerUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `
        query OriaPayments($where: events_bool_exp!, $limit: Int!, $offset: Int!) {
          events(where: $where, order_by: {transaction_version: desc}, limit: $limit, offset: $offset) {
            type
            data
            event_index
            transaction_version
          }
        }
      `,
      variables: {
        where: { _and: filters },
        limit,
        offset,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Indexer ${response.status}: ${text}`);
  }

  const payload = await response.json();
  if (payload.errors) {
    throw new Error(payload.errors.map((error) => error.message).join(". "));
  }

  return {
    payments: (payload.data?.events || []).map(normalizePaymentEvent),
    source: "indexer",
  };
}
