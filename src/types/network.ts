import type { Network } from "@aptos-labs/ts-sdk";

export type OriaNetwork = "testnet" | "shelbynet";

export type OriaNetworkConfig = {
  id: OriaNetwork;
  label: string;
  mode: string;
  aptosNetwork: Network;
  aptosNodeUrl: string;
  aptosIndexerUrl: string;
  shelbyRpcUrl: string;
  description: string;
};
