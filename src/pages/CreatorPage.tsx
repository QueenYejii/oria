import { AppHeader } from "../components/layout/AppHeader";
import { SpaceCard } from "../components/spaces/SpaceCard";
import { Link, useParams } from "react-router-dom";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import { shortenAddress } from "../lib/utils/format";

export function CreatorPage() {
  const { address } = useParams();
  const { activeNetwork } = useActiveNetwork();
  const spaces = useSpaces({ creator: address, network: activeNetwork }).filter(
    (space) =>
      (!address || space.creator.toLowerCase() === address.toLowerCase()) &&
      space.network === activeNetwork,
  );

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page creator-page">
        <section className="creator-hero">
          <div>
            <p className="eyebrow">Creator profile</p>
            <h1>{address ? shortenAddress(address) : "Unknown creator"}</h1>
            <p>
              Public Spaces registered or imported for this creator on the active Shelby network.
            </p>
          </div>
          <Link className="button secondary" to="/spaces">
            Browse all Spaces
          </Link>
        </section>

        {spaces.length > 0 ? (
          <section className="space-list">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <h2>No Spaces found for this creator.</h2>
            <p>Once the discovery API indexes this creator, Spaces will appear here.</p>
          </section>
        )}
      </main>
    </>
  );
}
