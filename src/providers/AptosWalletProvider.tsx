import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import type { AvailableWallets } from "@aptos-labs/wallet-adapter-core";
import type { PropsWithChildren } from "react";
import { useActiveNetwork } from "../hooks/useActiveNetwork";

const supportedWallets: AvailableWallets[] = [
  "Continue with Google",
  "Continue with Apple",
  "Petra",
  "Nightly",
  "Pontem Wallet",
  "Backpack",
  "MSafe",
  "OKX Wallet",
  "Bitget Wallet",
  "Gate Wallet",
  "Cosmostation Wallet",
];

export function AptosWalletProvider({ children }: PropsWithChildren) {
  const { activeNetwork, networkConfig } = useActiveNetwork();

  return (
    <AptosWalletAdapterProvider
      key={activeNetwork}
      autoConnect
      optInWallets={supportedWallets}
      dappConfig={{
        network: networkConfig.aptosNetwork,
        crossChainWallets: true,
        aptosApiKeys: import.meta.env.VITE_APTOS_API_KEY
          ? { [networkConfig.aptosNetwork]: import.meta.env.VITE_APTOS_API_KEY }
          : undefined,
      }}
      disableTelemetry
      onError={(error) => {
        console.error("Aptos wallet adapter error", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
