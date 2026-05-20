import { useContext } from "react";
import { NetworkContext } from "../providers/NetworkProvider";

export function useActiveNetwork() {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error("useActiveNetwork must be used inside NetworkProvider");
  }

  return context;
}
