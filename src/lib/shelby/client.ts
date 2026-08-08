import { Network } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { shelbyNetworks } from "../../config/networks";
import type { OriaNetwork } from "../../types/network";

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
  if (network !== "shelbynet") {
    throw new Error("Shelby Testnet has been retired. Switch Oria to Shelbynet to publish or retrieve blobs.");
  }

  const config = shelbyNetworks[network];
  const apiKey = getShelbyApiKey(network);
  const env = import.meta.env as Record<string, string | undefined>;
  const locationHint = normalizeApiKey(env.VITE_SHELBY_LOCATION_HINT) || config.shelbyLocationHint;

  return new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey,
    locationHint,
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
