import { shelbyNetworks } from "../../config/networks";
import { useActiveNetwork } from "../../hooks/useActiveNetwork";
import type { OriaNetwork } from "../../types/network";

export function NetworkSwitcher() {
  const { activeNetwork, setActiveNetwork } = useActiveNetwork();
  const networkIds = Object.keys(shelbyNetworks) as OriaNetwork[];

  return (
    <div className="network-pill" aria-label="Active network options">
      {networkIds.map((networkId) => {
        const network = shelbyNetworks[networkId];
        const label = networkId === "testnet" ? "Testnet" : network.label;

        return (
          <button
            key={networkId}
            aria-pressed={activeNetwork === networkId}
            className={`network-option ${activeNetwork === networkId ? "active" : ""}`}
            title={network.label}
            type="button"
            onClick={() => setActiveNetwork(networkId)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
