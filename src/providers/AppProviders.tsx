import { BrowserRouter } from "react-router-dom";
import { QueryProvider } from "./QueryProvider";
import { NetworkProvider } from "./NetworkProvider";
import { AptosWalletProvider } from "./AptosWalletProvider";
import type { PropsWithChildren } from "react";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <NetworkProvider>
          <AptosWalletProvider>{children}</AptosWalletProvider>
        </NetworkProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
