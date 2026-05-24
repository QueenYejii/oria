import type { OriaNetwork } from "../../types/network";

export type RegistrySpaceRecord = {
  spaceId: string;
  registryModule?: string;
  creator: string;
  network: OriaNetwork;
  manifestBlobName: string;
  manifestHash: string | number[];
  manifestVersion: number;
  visibility: number;
  accessRule: number;
  priceOctas: number;
  createdAtMicros: number;
  updatedAtMicros: number;
};

export type RegistryAccessRecord = {
  hasPurchased: boolean;
  isAllowlisted: boolean;
};

export function getDiscoveryApiUrl() {
  return (import.meta.env.VITE_ORIA_DISCOVERY_API_URL as string | undefined) || (import.meta.env.PROD ? "/api" : undefined);
}

async function discoveryFetch<T>(path: string) {
  const baseUrl = getDiscoveryApiUrl();
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`);
  if (!response.ok) {
    throw new Error(`Discovery API returned ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function listRegistrySpaces(params: {
  network?: OriaNetwork;
  creator?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params.network) query.set("network", params.network);
  if (params.creator) query.set("creator", params.creator);
  if (params.q) query.set("q", params.q);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));

  const payload = await discoveryFetch<{ spaces: RegistrySpaceRecord[] }>(`/spaces?${query}`);
  return payload?.spaces ?? [];
}

export async function getRegistrySpace(spaceId: string) {
  const payload = await discoveryFetch<{ space: RegistrySpaceRecord }>(
    `/spaces/${encodeURIComponent(spaceId)}`,
  );
  return payload?.space ?? null;
}

export async function getRegistryAccess(spaceId: string, wallet?: string) {
  if (!wallet) return null;

  return discoveryFetch<RegistryAccessRecord>(
    `/spaces/${encodeURIComponent(spaceId)}/access/${encodeURIComponent(wallet)}`,
  );
}
