import { Network } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { shelbyNetworks } from "../../config/networks";
import type { OriaNetwork } from "../../types/network";

const sdkNetworkByOriaNetwork = {
  testnet: Network.TESTNET,
  shelbynet: Network.SHELBYNET,
} as const satisfies Record<OriaNetwork, Network>;

const networkApiKeyEnv = {
  shelbynet: "VITE_SHELBYNET_API_KEY",
  testnet: "VITE_SHELBY_TESTNET_API_KEY",
} as const satisfies Record<OriaNetwork, string>;

function normalizeApiKey(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getShelbyApiKey(network: OriaNetwork) {
  const env = import.meta.env as Record<string, string | undefined>;
  return normalizeApiKey(env[networkApiKeyEnv[network]]) || normalizeApiKey(env.VITE_SHELBY_API_KEY) || undefined;
}

export function getShelbyApiKeyEnvName(network: OriaNetwork) {
  return networkApiKeyEnv[network];
}

export function hasShelbyApiKey(network: OriaNetwork) {
  return Boolean(getShelbyApiKey(network));
}

export function createShelbyClient(network: OriaNetwork) {
  const config = shelbyNetworks[network];
  const apiKey = getShelbyApiKey(network);

  return new ShelbyClient({
    network: sdkNetworkByOriaNetwork[network],
    apiKey,
    rpc: {
      baseUrl: config.shelbyRpcUrl,
      apiKey,
    },
    indexer: {
      baseUrl: import.meta.env.VITE_SHELBY_INDEXER_URL || config.shelbyIndexerUrl,
      apiKey,
    },
  });
}
