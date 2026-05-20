import type { AccountInfo } from "@aptos-labs/wallet-adapter-core";

export function getAccountAddress(account: AccountInfo | null | undefined) {
  if (!account) return "";

  const address = account.address;

  if (typeof address === "string") return address;
  if (typeof address === "object" && address && "toString" in address) {
    return address.toString();
  }

  return String(address);
}

export function normalizeNetworkName(value: string | undefined) {
  return value?.toLowerCase().replace(/\s+/g, "") ?? "";
}
