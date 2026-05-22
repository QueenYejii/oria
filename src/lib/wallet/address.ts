import { Network } from "@aptos-labs/ts-sdk";
import type { AccountInfo, NetworkInfo } from "@aptos-labs/wallet-adapter-core";

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

const shelbynetChainId = 113;

function isShelbynetRpcUrl(value: string | undefined) {
  return normalizeNetworkName(value).includes("api.shelbynet.shelby.xyz");
}

export function isWalletNetworkCompatible(params: {
  walletNetwork: NetworkInfo | null | undefined;
  expectedNetwork: Network;
}) {
  const walletName = normalizeNetworkName(params.walletNetwork?.name);
  const expectedName = normalizeNetworkName(params.expectedNetwork);

  if (!walletName) return false;
  if (walletName === expectedName) return true;

  if (params.expectedNetwork === Network.SHELBYNET && walletName === Network.CUSTOM) {
    return (
      params.walletNetwork?.chainId === shelbynetChainId ||
      isShelbynetRpcUrl(params.walletNetwork?.url) ||
      !params.walletNetwork?.url
    );
  }

  return false;
}

export function getWalletNetworkLabel(network: NetworkInfo | null | undefined) {
  if (!network?.name) return "unknown";

  if (normalizeNetworkName(network.name) === Network.CUSTOM && network.chainId === shelbynetChainId) {
    return "Shelbynet";
  }

  if (normalizeNetworkName(network.name) === Network.CUSTOM && isShelbynetRpcUrl(network.url)) {
    return "Shelbynet";
  }

  return network.name;
}
