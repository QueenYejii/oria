import type { OriaNetwork } from "../../types/network";

export function getTransactionExplorerUrl(txHash: string, network: OriaNetwork) {
  const searchParams = new URLSearchParams();

  if (network === "shelbynet") {
    searchParams.set("network", "shelbynet");
  } else {
    searchParams.set("network", "testnet");
  }

  return `https://explorer.aptoslabs.com/txn/${txHash}?${searchParams.toString()}`;
}
