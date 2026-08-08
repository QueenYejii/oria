import { createContext, useMemo, useState, type PropsWithChildren } from "react";
import { shelbyNetworks } from "../config/networks";
import type { OriaNetwork } from "../types/network";

type NetworkContextValue = {
  activeNetwork: OriaNetwork;
  setActiveNetwork: (network: OriaNetwork) => void;
  networkConfig: (typeof shelbyNetworks)[OriaNetwork];
};

export const NetworkContext = createContext<NetworkContextValue | null>(null);

const initialNetwork = "shelbynet" as const;

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
