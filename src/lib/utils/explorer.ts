import type { OriaNetwork } from "../../types/network";

export function getTransactionExplorerUrl(txHash: string, network: OriaNetwork) {
  const searchParams = new URLSearchParams();

  if (network === "shelbynet") {
    searchParams.set("network", "custom");
    searchParams.set("nodeUrl", "https://api.shelbynet.shelby.xyz/v1");
  } else {
    searchParams.set("network", "testnet");
  }

  return `https://explorer.aptoslabs.com/txn/${txHash}?${searchParams.toString()}`;
}
