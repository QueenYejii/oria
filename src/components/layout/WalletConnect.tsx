import { useWallet } from "@aptos-labs/wallet-adapter-react";
import type { AdapterNotDetectedWallet, AdapterWallet } from "@aptos-labs/wallet-adapter-core";
import { WalletReadyState } from "@aptos-labs/wallet-adapter-core";
import { useState } from "react";
import { getAccountAddress } from "../../lib/wallet/address";
import { shortenAddress } from "../../lib/utils/format";

function isDetectedWallet(wallet: AdapterWallet | AdapterNotDetectedWallet): wallet is AdapterWallet {
  return wallet.readyState === WalletReadyState.Installed;
}

function getWalletInitial(name: string) {
  return name
    .replace(/^Continue with\s+/i, "")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function WalletConnect() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const address = getAccountAddress(wallet.account);
  const wallets = [...wallet.wallets, ...wallet.notDetectedWallets].sort((a, b) => {
    const aInstalled = a.readyState === WalletReadyState.Installed ? 0 : 1;
    const bInstalled = b.readyState === WalletReadyState.Installed ? 0 : 1;

    return aInstalled - bInstalled || a.name.localeCompare(b.name);
  });

  if (wallet.connected && address) {
    return (
      <div className="wallet-chip">
        <span>{wallet.wallet?.name ?? "Wallet"}</span>
        <strong>{shortenAddress(address)}</strong>
        <button type="button" onClick={() => wallet.disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-menu">
      <button
        className="header-action"
        type="button"
        aria-expanded={open}
        aria-label="Connect Aptos wallet"
        onClick={() => setOpen((value) => !value)}
      >
        Connect Wallet
      </button>

      {open && (
        <div className="wallet-popover" aria-label="Available wallets">
          <div className="wallet-popover-head">
            <span className="tiny-label">Available wallets</span>
            <strong>{wallets.length}</strong>
          </div>
          {wallets.length > 0 ? (
            wallets.map((item) => (
              <button
                key={item.name}
                className="wallet-option"
                type="button"
                onClick={async () => {
                  if (!isDetectedWallet(item)) {
                    window.open(item.url, "_blank", "noreferrer");
                    return;
                  }

                  setConnectingWallet(item.name);
                  try {
                    wallet.connect(item.name);
                    setOpen(false);
                  } finally {
                    setConnectingWallet(null);
                  }
                }}
              >
                <span className="wallet-icon">
                  {item.icon ? <img src={item.icon} alt="" /> : getWalletInitial(item.name)}
                </span>
                <span className="wallet-option-copy">
                  <strong>{item.name}</strong>
                  <small>{isDetectedWallet(item) ? "Ready to connect" : "Install wallet"}</small>
                </span>
                <em>
                  {connectingWallet === item.name
                    ? "Connecting"
                    : isDetectedWallet(item)
                      ? "Installed"
                      : "Install"}
                </em>
              </button>
            ))
          ) : (
            <p>No Aptos wallet detected. Install Petra or another AIP-62 wallet.</p>
          )}
        </div>
      )}
    </div>
  );
}
