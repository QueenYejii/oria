import { Network } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { shelbyNetworks } from "../../config/networks";
import type { OriaNetwork } from "../../types/network";

const sdkNetworkByOriaNetwork = {
  testnet: Network.TESTNET,
  shelbynet: Network.SHELBYNET,
} as const satisfies Record<OriaNetwork, Network>;

export function createShelbyClient(network: OriaNetwork) {
  const config = shelbyNetworks[network];

  return new ShelbyClient({
    network: sdkNetworkByOriaNetwork[network],
    apiKey: import.meta.env.VITE_SHELBY_API_KEY || undefined,
    rpc: {
      baseUrl: config.shelbyRpcUrl,
      apiKey: import.meta.env.VITE_SHELBY_API_KEY || undefined,
    },
    indexer: {
      baseUrl: import.meta.env.VITE_SHELBY_INDEXER_URL || config.shelbyIndexerUrl,
      apiKey: import.meta.env.VITE_SHELBY_API_KEY || undefined,
    },
  });
}
