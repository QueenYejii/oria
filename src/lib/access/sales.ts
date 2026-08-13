import type { OriaNetwork } from "../../types/network";
import type { SpacePaymentCurrency } from "../../types/space";
import { shelbyNetworks } from "../../config/networks";
import { getRegistryAddress, getRegistryModuleName } from "../registry/client";
import { getDiscoveryApiUrl } from "../discovery/client";

export type CreatorSaleRecord = {
  spaceId: string;
  creator: string;
  network: OriaNetwork;
  manifestBlobName: string;
  buyer: string;
  amountOctas: number;
  currency?: SpacePaymentCurrency;
  updatedAtMicros: number;
  paidAt?: number;
  txHash?: string;
  spaceTitle?: string;
  transactionVersion?: string;
  isEstimated?: boolean;
  source?:
    | "receipt_mirror"
    | "registry_purchases_table"
    | "registry_purchases_table_direct"
    | "chain_transaction_scan";
};

export type CreatorSalesPayload = {
  creator: string;
  sales: CreatorSaleRecord[];
  spaces: Array<{
    spaceId: string;
    registryModule?: string;
    creator: string;
    network: OriaNetwork;
    manifestBlobName: string;
    priceOctas: number;
    currency?: SpacePaymentCurrency;
    buyerCount: number;
    buyers: string[];
    estimatedRevenueOctas: number;
    updatedAtMicros: number;
  }>;
  summary: {
    paidSpaces: number;
    sales: number;
    estimatedRevenueOctas: number;
  };
  source:
    | "registry_purchases_table"
    | "registry_purchases_table_with_tx_scan"
    | "registry_purchases_table_direct";
  receiptStore?: {
    mode: string;
    persistent: boolean;
  };
};

export type DirectSpaceRecord = {
  spaceId: string;
  registryModule: string;
  creator: string;
  network: OriaNetwork;
  manifestBlobName: string;
  priceOctas: number;
  currency: SpacePaymentCurrency;
  visibility: number;
  updatedAtMicros: number;
};

type SaleSource = CreatorSaleRecord["source"];

function canonicalAddress(value: string | undefined) {
  const raw = String(value || "").toLowerCase().replace(/^0x/, "");
  return `0x${raw.replace(/^0+/, "") || "0"}`;
}

function saleTimestamp(sale: CreatorSaleRecord) {
  return sale.paidAt || (sale.updatedAtMicros ? Math.floor(Number(sale.updatedAtMicros) / 1000) : 0);
}

function isPlaceholderTitle(title?: string) {
  return !title || title === "Paid Space" || title === "Indexed paid Space";
}

function isSameSale(left: CreatorSaleRecord, right: CreatorSaleRecord) {
  if (
    left.network !== right.network ||
    left.spaceId !== right.spaceId ||
    canonicalAddress(left.buyer) !== canonicalAddress(right.buyer)
  ) {
    return false;
  }

  if (left.txHash && right.txHash) {
    return left.txHash.toLowerCase() === right.txHash.toLowerCase();
  }

  return true;
}

function mergeSaleRecords(existing: CreatorSaleRecord, incoming: CreatorSaleRecord) {
  const sourcePriority: Record<Exclude<SaleSource, undefined>, number> = {
    registry_purchases_table_direct: 1,
    registry_purchases_table: 2,
    chain_transaction_scan: 3,
    receipt_mirror: 4,
  };
  const preferredTitle = !isPlaceholderTitle(incoming.spaceTitle)
    ? incoming.spaceTitle
    : existing.spaceTitle;
  const incomingSource = incoming.source;
  const existingSource = existing.source;
  const source =
    incomingSource &&
    (!existingSource || sourcePriority[incomingSource] >= sourcePriority[existingSource])
      ? incomingSource
      : existingSource;

  return {
    ...existing,
    ...incoming,
    amountOctas: Number(incoming.amountOctas || 0) > 0 ? incoming.amountOctas : existing.amountOctas,
    currency: incoming.currency ?? existing.currency ?? "APT",
    txHash: incoming.txHash ?? existing.txHash,
    paidAt: incoming.paidAt ?? existing.paidAt,
    transactionVersion: incoming.transactionVersion ?? existing.transactionVersion,
    isEstimated:
      incoming.txHash || incoming.isEstimated === false || existing.txHash || existing.isEstimated === false
        ? false
        : existing.isEstimated ?? incoming.isEstimated,
    spaceTitle: preferredTitle,
    source,
  };
}

export function mergeCreatorSales(records: CreatorSaleRecord[]) {
  const merged: CreatorSaleRecord[] = [];

  for (const record of records) {
    if (!record.spaceId || !record.buyer || !record.creator) continue;
    const existingIndex = merged.findIndex((item) => isSameSale(item, record));

    if (existingIndex < 0) {
      merged.push({ ...record, currency: record.currency ?? "APT" });
      continue;
    }

    merged[existingIndex] = mergeSaleRecords(merged[existingIndex], record);
  }

  return merged.sort((left, right) => saleTimestamp(right) - saleTimestamp(left));
}

export function getRevenueByCurrency(records: CreatorSaleRecord[]) {
  const totals = new Map<SpacePaymentCurrency, number>();

  for (const record of records) {
    const currency = record.currency ?? "APT";
    totals.set(currency, (totals.get(currency) ?? 0) + Number(record.amountOctas || 0));
  }

  return totals;
}

export function mergeCreatorSalesPayload(
  primary: CreatorSalesPayload | null | undefined,
  fallback: CreatorSalesPayload | null | undefined,
) {
  if (!primary && !fallback) return null;

  const sales = mergeCreatorSales([...(primary?.sales ?? []), ...(fallback?.sales ?? [])]);
  const spacesByKey = new Map<string, CreatorSalesPayload["spaces"][number]>();

  for (const space of [...(fallback?.spaces ?? []), ...(primary?.spaces ?? [])]) {
    const key = `${space.network}:${space.spaceId}`;
    const existing = spacesByKey.get(key);
    if (!existing) {
      spacesByKey.set(key, { ...space, buyers: [...space.buyers] });
      continue;
    }

    const buyers = Array.from(new Set([...existing.buyers, ...space.buyers]));
    spacesByKey.set(key, {
      ...existing,
      ...space,
      buyers,
      buyerCount: buyers.length,
      estimatedRevenueOctas: buyers.length * Number(space.priceOctas || existing.priceOctas || 0),
    });
  }

  const spaces = [...spacesByKey.values()];
  const source =
    primary?.sales.length
      ? primary.source
      : fallback?.source ?? primary?.source ?? "registry_purchases_table_direct";
  return {
    ...(fallback ?? {}),
    ...(primary ?? {}),
    creator: primary?.creator ?? fallback?.creator ?? "",
    spaces,
    sales,
    summary: {
      paidSpaces: Math.max(primary?.summary.paidSpaces ?? 0, fallback?.summary.paidSpaces ?? 0),
      sales: sales.length,
      estimatedRevenueOctas: sales.reduce((sum, sale) => sum + Number(sale.amountOctas || 0), 0),
    },
    source,
    receiptStore: primary?.receiptStore ?? fallback?.receiptStore,
  } satisfies CreatorSalesPayload;
}

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject {
  return typeof value === "object" && value !== null ? (value as JsonObject) : {};
}

function aptosHeaders() {
  const apiKey = import.meta.env.VITE_APTOS_API_KEY as string | undefined;
  return {
    accept: "application/json",
    "content-type": "application/json",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  };
}

async function aptosJson(network: OriaNetwork, path: string, init?: RequestInit): Promise<unknown> {
  const nodeUrl = shelbyNetworks[network].aptosNodeUrl.replace(/\/$/, "");
  const response = await fetch(`${nodeUrl}${path}`, {
    ...init,
    headers: { ...aptosHeaders(), ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    throw new Error(`Aptos ${response.status}.`);
  }

  return response.json();
}

async function tableItem(network: OriaNetwork, handle: string, valueType: string, key: string) {
  return aptosJson(network, `/tables/${handle}/item`, {
    method: "POST",
    body: JSON.stringify({
      key_type: "0x1::string::String",
      value_type: valueType,
      key,
    }),
  });
}

function tableHandle(table: unknown) {
  return typeof table === "object" && table !== null && "handle" in table
    ? String((table as { handle?: string }).handle || "")
    : "";
}

function directModuleCandidates() {
  const primary = getRegistryModuleName();
  const legacy = import.meta.env.VITE_ORIA_LEGACY_REGISTRY_MODULE as string | undefined;
  return Array.from(new Set([primary, legacy].filter(Boolean))) as string[];
}

function directRecord(record: unknown, moduleName: string, network: OriaNetwork): DirectSpaceRecord {
  const value = asJsonObject(record);
  return {
    spaceId: String(value.space_id || ""),
    registryModule: moduleName,
    creator: String(value.creator || ""),
    network: (value.network || network) as OriaNetwork,
    manifestBlobName: String(value.manifest_blob_name || ""),
    priceOctas: Number(value.price_octas || 0),
    currency: (Number(value.payment_currency || 0) === 1 ? "SHELBY_USD" : "APT") as SpacePaymentCurrency,
    visibility: Number(value.visibility || 0),
    updatedAtMicros: Number(value.updated_at_micros || 0),
  };
}

async function readDirectSalesForModule(address: string, network: OriaNetwork, moduleName: string) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress) return null;

  const resourceType = `${registryAddress}::${moduleName}::Registry`;
  let resource: unknown;

  try {
    resource = await aptosJson(
      network,
      `/accounts/${encodeURIComponent(registryAddress)}/resource/${encodeURIComponent(resourceType)}`,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Aptos 404.") return null;
    throw error;
  }

  const registry = asJsonObject(asJsonObject(resource).data);
  const spacesHandle = tableHandle(registry.spaces);
  const purchasesHandle = tableHandle(registry.purchases);
  const spaceIds: string[] = Array.isArray(registry.space_ids) ? registry.space_ids.map(String) : [];
  if (!spacesHandle || !purchasesHandle || spaceIds.length === 0) {
    return {
      creator: address,
      spaces: [],
      sales: [],
      summary: { paidSpaces: 0, sales: 0, estimatedRevenueOctas: 0 },
      source: "registry_purchases_table_direct" as const,
    } satisfies CreatorSalesPayload;
  }

  const records = await Promise.all(
    spaceIds.map(async (spaceId) => {
      try {
        const record = await tableItem(network, spacesHandle, `${registryAddress}::${moduleName}::SpaceRecord`, spaceId);
        return directRecord(record, moduleName, network);
      } catch {
        return null;
      }
    }),
  );
  const paidSpaces = records.filter(
    (record): record is DirectSpaceRecord =>
      record !== null &&
      canonicalAddress(record.creator) === canonicalAddress(address) &&
      (record.network === network || !record.network) &&
      (record.visibility === 2 || record.priceOctas > 0),
  );

  const spaceSales = await Promise.all(
    paidSpaces.map(async (space) => {
      let buyers: string[] = [];
      try {
        const result = await tableItem(network, purchasesHandle, "vector<address>", space.spaceId);
        buyers = Array.isArray(result) ? result.map(String) : [];
      } catch {
        buyers = [];
      }

      return { space, buyers };
    }),
  );
  const sales = spaceSales.flatMap(({ space, buyers }) =>
    buyers.map((buyer) => ({
      spaceId: space.spaceId,
      registryModule: space.registryModule,
      creator: space.creator,
      network: space.network,
      manifestBlobName: space.manifestBlobName,
      buyer,
      amountOctas: space.priceOctas,
      currency: space.currency,
      updatedAtMicros: space.updatedAtMicros,
      isEstimated: true,
      source: "registry_purchases_table_direct" as const,
    })),
  );

  return {
    creator: address,
    spaces: spaceSales.map(({ space, buyers }) => ({
      spaceId: space.spaceId,
      registryModule: space.registryModule,
      creator: space.creator,
      network: space.network,
      manifestBlobName: space.manifestBlobName,
      priceOctas: space.priceOctas,
      currency: space.currency,
      buyerCount: buyers.length,
      buyers,
      estimatedRevenueOctas: buyers.length * space.priceOctas,
      updatedAtMicros: space.updatedAtMicros,
    })),
    sales,
    summary: {
      paidSpaces: paidSpaces.length,
      sales: sales.length,
      estimatedRevenueOctas: sales.reduce((sum, sale) => sum + sale.amountOctas, 0),
    },
    source: "registry_purchases_table_direct" as const,
  } satisfies CreatorSalesPayload;
}

async function readDirectSales(address: string, network: OriaNetwork = "shelbynet") {
  let lastError: unknown = null;

  for (const moduleName of directModuleCandidates()) {
    try {
      const payload = await readDirectSalesForModule(address, network, moduleName);
      if (payload) return payload;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  return null;
}

async function readApiSales(address: string) {
  const baseUrl = getDiscoveryApiUrl();
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/sales/${encodeURIComponent(address)}`);
  if (!response.ok) {
    throw new Error(`Creator sales returned ${response.status}.`);
  }

  return (await response.json()) as CreatorSalesPayload;
}

export async function getCreatorSales(address: string, network?: OriaNetwork) {
  let apiPayload: CreatorSalesPayload | null = null;
  let apiError: unknown = null;

  try {
    apiPayload = await readApiSales(address);
  } catch (error) {
    apiError = error;
  }

  if (apiPayload?.sales.length) return apiPayload;

  try {
    const directPayload = await readDirectSales(address, network);
    const merged = mergeCreatorSalesPayload(apiPayload, directPayload);
    if (merged) return merged;
  } catch (directError) {
    if (apiPayload) return apiPayload;
    if (apiError) throw apiError;
    throw directError;
  }

  if (apiPayload) return apiPayload;
  if (apiError) throw apiError;
  return null;
}
