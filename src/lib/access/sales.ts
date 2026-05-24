import { getDiscoveryApiUrl } from "../discovery/client";
import type { OriaNetwork } from "../../types/network";
import type { SpacePaymentCurrency } from "../../types/space";

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
  source?: "receipt_mirror" | "registry_purchases_table" | "chain_transaction_scan";
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
  source: "registry_purchases_table" | "registry_purchases_table_with_tx_scan";
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
