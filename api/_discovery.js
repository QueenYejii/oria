const defaultNodeUrl = "https://api.shelbynet.shelby.xyz/v1";
const cache = new Map();
const registryTtlMs = 15_000;
const recordTtlMs = 30_000;
const txLookupTtlMs = 5 * 60_000;

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

export function getConfig(moduleOverride) {
  const registryAddress = process.env.ORIA_REGISTRY_ADDRESS || process.env.VITE_ORIA_REGISTRY_ADDRESS;
  const registryModule = moduleOverride || process.env.ORIA_REGISTRY_MODULE || process.env.VITE_ORIA_REGISTRY_MODULE || "space_registry";
  const nodeUrl = process.env.APTOS_NODE_URL || process.env.VITE_APTOS_NODE_URL || defaultNodeUrl;
  const indexerUrl = process.env.APTOS_INDEXER_URL || process.env.VITE_APTOS_INDEXER_URL;

  if (!registryAddress) {
    throw new Error("ORIA_REGISTRY_ADDRESS is required.");
  }

  return {
    registryAddress,
    registryModule,
    nodeUrl,
    indexerUrl,
    registryType: `${registryAddress}::${registryModule}::Registry`,
    spaceRecordType: `${registryAddress}::${registryModule}::SpaceRecord`,
    purchaseEventType: `${registryAddress}::${registryModule}::SpacePurchased`,
  };
}

export function sendJson(response, status, payload) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("access-control-allow-origin", process.env.CORS_ORIGIN || "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
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

export async function aptos(path, init) {
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

async function getRegistry(moduleOverride) {
  const { registryAddress, registryType, registryModule } = getConfig(moduleOverride);
  const cacheKey = `registry:${registryModule}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const resource = await aptos(
    `/accounts/${registryAddress}/resource/${encodeURIComponent(registryType)}`,
  );
  return setCached(cacheKey, resource.data, registryTtlMs);
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

function normalizeRecord(record, registryModule) {
  return {
    spaceId: record.space_id,
    registryModule,
    creator: record.creator,
    network: record.network,
    manifestBlobName: record.manifest_blob_name,
    manifestHash: record.manifest_hash,
    manifestVersion: Number(record.manifest_version),
    visibility: Number(record.visibility),
    accessRule: Number(record.access_rule),
    priceOctas: Number(record.price_octas),
    paymentCurrency: Number(record.payment_currency || 0) === 1 ? "SHELBY_USD" : "APT",
    paymentAsset: record.payment_asset || record.payment_asset_address || "0x0",
    createdAtMicros: Number(record.created_at_micros),
    updatedAtMicros: Number(record.updated_at_micros),
  };
}

function parsePagination(searchParams) {
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  return { limit, offset };
}

async function getRecordFromTable(handle, spaceRecordType, spaceId, registryModule) {
  const cacheKey = `space:${registryModule}:${spaceId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const record = await getTableItem(handle, "0x1::string::String", spaceRecordType, spaceId);
  return setCached(cacheKey, normalizeRecord(record, registryModule), recordTtlMs);
}

async function listRecordsPageForModule(searchParams, moduleOverride) {
  const { spaceRecordType, registryModule } = getConfig(moduleOverride);
  const registry = await getRegistry(registryModule);
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
    idsToFetch.map((spaceId) => getRecordFromTable(handle, spaceRecordType, spaceId, registryModule)),
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

function getLegacyRegistryModule() {
  const configured =
    process.env.ORIA_LEGACY_REGISTRY_MODULE || process.env.VITE_ORIA_LEGACY_REGISTRY_MODULE || "";
  const primary = getConfig().registryModule;

  if (!configured || configured === primary) return null;
  return configured;
}

export async function listRecordsPage(searchParams) {
  const primaryPage = await listRecordsPageForModule(searchParams);
  const legacyModule = getLegacyRegistryModule();
  if (!legacyModule) return primaryPage;

  try {
    const legacyQuery = new URLSearchParams(searchParams);
    legacyQuery.set("offset", "0");
    legacyQuery.set("limit", String(Math.max(primaryPage.pagination.limit, 100)));
    const legacyPage = await listRecordsPageForModule(legacyQuery, legacyModule);
    const merged = new Map();

    for (const record of legacyPage.records) merged.set(record.spaceId, record);
    for (const record of primaryPage.records) merged.set(record.spaceId, record);

    const records = Array.from(merged.values()).sort((a, b) => b.createdAtMicros - a.createdAtMicros);
    const { limit, offset } = primaryPage.pagination;
    const pageRecords = records.slice(offset, offset + limit);

    return {
      records: pageRecords,
      pagination: {
        limit,
        offset,
        count: pageRecords.length,
        total: records.length,
        hasMore: offset + pageRecords.length < records.length,
      },
      cache: {
        ttlMs: recordTtlMs,
        mode: "primary-with-legacy-fallback",
      },
    };
  } catch {
    return primaryPage;
  }
}

export async function listRecords(searchParams) {
  const page = await listRecordsPage(searchParams);
  return page.records;
}

async function getRecordForModule(spaceId, moduleOverride) {
  const { spaceRecordType, registryModule } = getConfig(moduleOverride);
  const registry = await getRegistry(registryModule);
  const handle = tableHandle(registry.spaces);
  return getRecordFromTable(handle, spaceRecordType, spaceId, registryModule);
}

export async function getRecord(spaceId) {
  try {
    return await getRecordForModule(spaceId);
  } catch (error) {
    const legacyModule = getLegacyRegistryModule();
    if (!legacyModule) throw error;
    return getRecordForModule(spaceId, legacyModule);
  }
}

async function getAccessForModule(spaceId, wallet, moduleOverride) {
  const registry = await getRegistry(moduleOverride);
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

export async function getAccess(spaceId, wallet) {
  const primaryAccess = await getAccessForModule(spaceId, wallet);
  if (primaryAccess.hasPurchased || primaryAccess.isAllowlisted) return primaryAccess;

  const legacyModule = getLegacyRegistryModule();
  if (!legacyModule) return primaryAccess;

  try {
    const legacyAccess = await getAccessForModule(spaceId, wallet, legacyModule);
    return {
      hasPurchased: primaryAccess.hasPurchased || legacyAccess.hasPurchased,
      isAllowlisted: primaryAccess.isAllowlisted || legacyAccess.isAllowlisted,
    };
  } catch {
    return primaryAccess;
  }
}

function normalizeProfile(profile, fallbackAddress) {
  if (!profile) return null;
  const updatedAtMicros = Number(profile.updated_at_micros || profile.updatedAtMicros || 0);

  return {
    address: profile.creator || fallbackAddress,
    creator: profile.creator || fallbackAddress,
    displayName: profile.display_name || profile.displayName || "",
    bio: profile.bio || "",
    avatar: profile.avatar_blob_name || profile.avatarBlobName || "",
    avatarBlobName: profile.avatar_blob_name || profile.avatarBlobName || "",
    linksBlobName: profile.links_blob_name || profile.linksBlobName || "",
    updatedAt: updatedAtMicros > 0 ? Math.floor(updatedAtMicros / 1000) : 0,
    updatedAtMicros,
    source: "registry",
  };
}

export async function getCreatorProfile(address) {
  const { registryAddress, registryModule } = getConfig();
  const registry = await getRegistry(registryModule);
  const creatorProfilesHandle = tableHandle(registry.creator_profiles);
  if (!creatorProfilesHandle) return null;

  try {
    const profile = await getTableItem(
      creatorProfilesHandle,
      "address",
      `${registryAddress}::${registryModule}::CreatorProfile`,
      address,
    );

    return normalizeProfile(profile, address);
  } catch {
    return null;
  }
}

async function getPurchasesForSpace(spaceId, moduleOverride) {
  const registry = await getRegistry(moduleOverride);
  const purchasesHandle = tableHandle(registry.purchases);

  try {
    return await getTableItem(
      purchasesHandle,
      "0x1::string::String",
      "vector<address>",
      spaceId,
    );
  } catch {
    return [];
  }
}

async function getAccountTransactions(address, limit = 50) {
  return aptos(`/accounts/${address}/transactions?limit=${limit}`);
}

function canonicalAddress(value) {
  const raw = String(value || "").toLowerCase().replace(/^0x/, "");
  const trimmed = raw.replace(/^0+/, "") || "0";
  return `0x${trimmed}`;
}

function payloadFunctionName(transaction) {
  return String(transaction?.payload?.function || "").replace(/^0x0+/, "0x").toLowerCase();
}

async function findPurchaseTransaction(params) {
  const { registryAddress, registryModule } = getConfig(params.registryModule);
  const buyer = String(params.buyer || "").toLowerCase();
  const spaceId = String(params.spaceId || "");
  const cacheKey = `purchase-tx:${registryModule}:${buyer}:${spaceId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const expectedFunction = `${canonicalAddress(registryAddress)}::${registryModule}::purchase_space`;
    const transactions = await getAccountTransactions(buyer, 75);
    const match = (transactions || []).find((transaction) => {
      const args = Array.isArray(transaction?.payload?.arguments) ? transaction.payload.arguments : [];

      return (
        transaction?.type === "user_transaction" &&
        transaction?.success &&
        canonicalAddress(transaction.sender) === canonicalAddress(buyer) &&
        payloadFunctionName(transaction) === expectedFunction &&
        canonicalAddress(args[0]) === canonicalAddress(registryAddress) &&
        String(args[1]) === spaceId
      );
    });

    const result = match
      ? {
          txHash: match.hash,
          paidAt: match.timestamp ? Math.floor(Number(match.timestamp) / 1000) : undefined,
          transactionVersion: match.version ? String(match.version) : undefined,
          source: "chain_transaction_scan",
        }
      : null;

    return setCached(cacheKey, result, txLookupTtlMs);
  } catch {
    return setCached(cacheKey, null, 60_000);
  }
}

export async function listCreatorSales(address, searchParams = new URLSearchParams()) {
  const query = new URLSearchParams(searchParams);
  query.set("creator", String(address));
  query.set("visibility", "2");
  query.set("limit", query.get("limit") || "100");

  const spaces = await listRecords(query);
  const paidSpaces = spaces.filter((space) => Number(space.priceOctas) > 0 || Number(space.visibility) === 2);
  const salesBySpace = await Promise.all(
    paidSpaces.map(async (space) => {
      const buyers = await getPurchasesForSpace(space.spaceId, space.registryModule);

      return {
        spaceId: space.spaceId,
        registryModule: space.registryModule,
        creator: space.creator,
        network: space.network,
        manifestBlobName: space.manifestBlobName,
        priceOctas: space.priceOctas,
        buyerCount: buyers.length,
        buyers,
        estimatedRevenueOctas: buyers.length * Number(space.priceOctas || 0),
        currency: space.paymentCurrency || "APT",
        updatedAtMicros: space.updatedAtMicros,
      };
    }),
  );
  const sales = salesBySpace.flatMap((space) =>
    space.buyers.map((buyer) => ({
      spaceId: space.spaceId,
      registryModule: space.registryModule,
      creator: space.creator,
      network: space.network,
      manifestBlobName: space.manifestBlobName,
      buyer,
      amountOctas: space.priceOctas,
      currency: space.currency || "APT",
      updatedAtMicros: space.updatedAtMicros,
    })),
  );
  const enrich = searchParams.get("enrich") !== "0";
  const enrichedSales = enrich
    ? await Promise.all(
        sales.map(async (sale) => {
          const purchaseTx = await findPurchaseTransaction({
            buyer: sale.buyer,
            spaceId: sale.spaceId,
            registryModule: sale.registryModule,
          });

          return purchaseTx
            ? {
                ...sale,
                txHash: purchaseTx.txHash,
                paidAt: purchaseTx.paidAt,
                transactionVersion: purchaseTx.transactionVersion,
                source: purchaseTx.source,
              }
            : sale;
        }),
      )
    : sales;

  return {
    creator: String(address),
    spaces: salesBySpace,
    sales: enrichedSales,
    summary: {
      paidSpaces: paidSpaces.length,
      sales: enrichedSales.length,
      estimatedRevenueOctas: enrichedSales.reduce((sum, sale) => sum + Number(sale.amountOctas || 0), 0),
    },
    source: enrich ? "registry_purchases_table_with_tx_scan" : "registry_purchases_table",
  };
}

export function getHealthPayload() {
  const { registryAddress, registryModule, nodeUrl, indexerUrl } = getConfig();
  return {
    ok: true,
    registryAddress,
    registryModule,
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
    const message = payload.errors.map((error) => error.message).join(". ");
    if (message.includes("field 'events' not found")) {
      return {
        payments: [],
        source: "indexer_unavailable",
        error: "Shelbynet GraphQL is reachable, but registry purchase events are not exposed by this indexer yet.",
      };
    }

    throw new Error(message);
  }

  return {
    payments: (payload.data?.events || []).map(normalizePaymentEvent),
    source: "indexer",
  };
}
