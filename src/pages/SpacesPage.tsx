import { AppHeader } from "../components/layout/AppHeader";
import { Link } from "react-router-dom";
import { SpaceCard } from "../components/spaces/SpaceCard";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";

export function SpacesPage() {
  const { activeNetwork } = useActiveNetwork();
  const spaces = useSpaces().filter((space) => space.network === activeNetwork);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page">
        <section className="collection-heading">
          <p className="eyebrow">Spaces</p>
          <h1>Published on the active network.</h1>
          <p>
            These Spaces are stored locally as Oria metadata and point to Shelby blobs owned by
            the publishing wallet.
          </p>
        </section>

        {spaces.length > 0 ? (
          <section className="space-list">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <h2>No Spaces on this network yet.</h2>
            <p>Create your first Space, then return here to browse it.</p>
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
