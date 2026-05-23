import { getDiscoveryApiUrl } from "../discovery/client";
import type { OriaNetwork } from "../../types/network";

export type CreatorSaleRecord = {
  spaceId: string;
  creator: string;
  network: OriaNetwork;
  manifestBlobName: string;
  buyer: string;
  amountOctas: number;
  updatedAtMicros: number;
  paidAt?: number;
  txHash?: string;
  spaceTitle?: string;
  source?: "receipt_mirror" | "registry_purchases_table";
};

export type CreatorSalesPayload = {
  creator: string;
  sales: CreatorSaleRecord[];
  spaces: Array<{
    spaceId: string;
    creator: string;
    network: OriaNetwork;
    manifestBlobName: string;
    priceOctas: number;
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
  source: "registry_purchases_table";
  receiptStore?: {
    mode: string;
    persistent: boolean;
  };
};

export async function getCreatorSales(address: string) {
  const baseUrl = getDiscoveryApiUrl();
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/sales/${encodeURIComponent(address)}`);
  if (!response.ok) {
    throw new Error(`Creator sales returned ${response.status}.`);
  }

  return (await response.json()) as CreatorSalesPayload;
}
