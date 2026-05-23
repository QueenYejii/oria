import type { LocalPaymentRecord } from "./payments";
import { getDiscoveryApiUrl } from "../discovery/client";

export type ChainPaymentRecord = LocalPaymentRecord & {
  eventIndex?: number;
  transactionVersion?: string;
};

export async function listChainPayments(params: {
  buyer?: string;
  creator?: string;
  spaceId?: string;
  limit?: number;
}): Promise<{
  payments: ChainPaymentRecord[];
  source: "indexer" | "indexer_unavailable" | "disabled";
  error?: string;
}> {
  const baseUrl = getDiscoveryApiUrl();
  if (!baseUrl) return { payments: [] as ChainPaymentRecord[], source: "disabled" };

  const query = new URLSearchParams();
  if (params.buyer) query.set("buyer", params.buyer);
  if (params.creator) query.set("creator", params.creator);
  if (params.spaceId) query.set("spaceId", params.spaceId);
  if (params.limit) query.set("limit", String(params.limit));

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/payments?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Payment index returned ${response.status}.`);
  }

  return (await response.json()) as {
    payments: ChainPaymentRecord[];
    source: "indexer" | "indexer_unavailable" | "disabled";
    error?: string;
  };
}
