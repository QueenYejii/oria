import { createContext, useMemo, useState, type PropsWithChildren } from "react";
import { shelbyNetworks } from "../config/networks";
import type { OriaNetwork } from "../types/network";

type NetworkContextValue = {
  activeNetwork: OriaNetwork;
  setActiveNetwork: (network: OriaNetwork) => void;
  networkConfig: (typeof shelbyNetworks)[OriaNetwork];
};

export const NetworkContext = createContext<NetworkContextValue | null>(null);

const initialNetwork = (() => {
  const value = import.meta.env.VITE_DEFAULT_ORIA_NETWORK;
  return value === "testnet" ? "testnet" : "shelbynet";
})();

export function NetworkProvider({ children }: PropsWithChildren) {
  const [activeNetwork, setActiveNetwork] = useState<OriaNetwork>(initialNetwork);

  const value = useMemo(
    () => ({
      activeNetwork,
      setActiveNetwork,
      networkConfig: shelbyNetworks[activeNetwork],
    }),
    [activeNetwork]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
