import { Network } from "@aptos-labs/ts-sdk";
import type { OriaNetworkConfig } from "../types/network";

export const shelbyNetworks = {
  shelbynet: {
    id: "shelbynet",
    label: "Shelbynet",
    mode: "Experimental",
    aptosNetwork: Network.SHELBYNET,
    aptosNodeUrl: "https://api.shelbynet.shelby.xyz/v1",
    aptosIndexerUrl: "https://api.shelbynet.shelby.xyz/v1/graphql",
    shelbyRpcUrl: "https://api.shelbynet.shelby.xyz/shelby",
    shelbyIndexerUrl:
      "https://api.shelbynet.aptoslabs.com/nocode/v1/public/alias/shelby/shelbynet/v1/graphql",
    description: "Best for protocol experiments where reset risk is acceptable.",
  },
  testnet: {
    id: "testnet",
    label: "Shelby Testnet",
    mode: "Default",
    aptosNetwork: Network.TESTNET,
    aptosNodeUrl: "https://api.testnet.aptoslabs.com/v1",
    aptosIndexerUrl: "https://api.testnet.aptoslabs.com/v1/graphql",
    shelbyRpcUrl: "https://api.testnet.shelby.xyz/shelby",
    shelbyIndexerUrl:
      "https://api.testnet.aptoslabs.com/nocode/v1/public/alias/shelby/testnet/v1/graphql",
    description: "Best for stable demos, portfolio flows, and repeatable testing.",
  },
} as const satisfies Record<string, OriaNetworkConfig>;
