import { Network } from "@aptos-labs/ts-sdk";
import type { OriaNetworkConfig } from "../types/network";

export const shelbyNetworks = {
  shelbynet: {
    id: "shelbynet",
    label: "Shelbynet",
    mode: "Experimental",
    available: true,
    aptosNetwork: Network.SHELBYNET,
    aptosNodeUrl: "https://api.shelbynet.shelby.xyz/v1",
    aptosIndexerUrl: "https://api.shelbynet.shelby.xyz/v1/graphql",
    shelbyRpcUrl: "https://api.shelbynet.shelby.xyz/shelby",
    shelbyIndexerUrl: "https://api.shelbynet.shelby.xyz/v1/graphql",
    shelbyLocationHint: "shelbynet-1",
    description: "Best for live Shelbynet publishing while the network is actively evolving.",
  },
  testnet: {
    id: "testnet",
    label: "Shelby Testnet",
    mode: "Retired",
    available: false,
    aptosNetwork: Network.TESTNET,
    aptosNodeUrl: "https://api.testnet.aptoslabs.com/v1",
    aptosIndexerUrl: "https://api.testnet.aptoslabs.com/v1/graphql",
    shelbyRpcUrl: "https://api.testnet.shelby.xyz/shelby",
    shelbyIndexerUrl: "https://api.testnet.aptoslabs.com/v1/graphql",
    description: "Shelby Testnet has been retired. Use Shelbynet for active publishing.",
  },
} as const satisfies Record<string, OriaNetworkConfig>;
