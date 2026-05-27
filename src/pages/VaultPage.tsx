import { AppHeader } from "../components/layout/AppHeader";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Link } from "react-router-dom";
import { SpaceCard } from "../components/spaces/SpaceCard";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useOwnerSpaces } from "../hooks/useSpaces";
import { getAccountAddress } from "../lib/wallet/address";

export function VaultPage() {
  const wallet = useWallet();
  const { activeNetwork } = useActiveNetwork();
  const address = getAccountAddress(wallet.account);
  const spaces = useOwnerSpaces({ creator: address || undefined, network: activeNetwork });

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page">
        <section className="collection-heading">
          <p className="eyebrow">Vault</p>
          <h1>Your published work.</h1>
          <p>
            Manage the Spaces connected to your wallet on the active Shelby network.
          </p>
        </section>

        {!wallet.connected ? (
          <section className="empty-state">
            <h2>Connect a wallet to open your Vault.</h2>
            <p>Use the wallet control in the header, then published Spaces will appear here.</p>
          </section>
        ) : spaces.length > 0 ? (
          <section className="space-list">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <h2>Your Vault is empty on {activeNetwork}.</h2>
            <p>Publish a Space from this wallet and it will appear here for management.</p>
            <div className="empty-actions">
              <Link className="button primary" to="/create">
                Create a Space
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
