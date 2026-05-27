import { Network } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { shelbyNetworks } from "../../config/networks";
import type { OriaNetwork } from "../../types/network";

const sdkNetworkByOriaNetwork = {
  testnet: Network.TESTNET,
  shelbynet: Network.SHELBYNET,
} as const satisfies Record<OriaNetwork, Network>;

function getShelbyApiKey(network: OriaNetwork) {
  if (network === "shelbynet") {
    return (
      (import.meta.env.VITE_SHELBYNET_API_KEY as string | undefined) ||
      (import.meta.env.VITE_SHELBY_API_KEY as string | undefined)
    );
  }

  return (
    (import.meta.env.VITE_SHELBY_TESTNET_API_KEY as string | undefined) ||
    (import.meta.env.VITE_SHELBY_API_KEY as string | undefined)
  );
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
