import { AppHeader } from "../components/layout/AppHeader";
import { Link } from "react-router-dom";
import { SpaceCard } from "../components/spaces/SpaceCard";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import { getPreviewKind } from "../lib/utils/files";
import { formatBytes } from "../lib/utils/format";
import { useMemo, useRef, useState } from "react";
import { useGsapStagger } from "../hooks/useGsapStagger";
import type { Space, SpaceVisibility } from "../types/space";

type SortMode = "newest" | "largest" | "files";
type MediaFilter = "all" | "Image" | "Video" | "Audio" | "PDF" | "JSON" | "Archive" | "File";
type VisibilityFilter = "all" | SpaceVisibility;

function spaceMatchesMedia(space: Space, media: MediaFilter) {
  if (media === "all") return true;
  return space.files.some((file) => getPreviewKind(file.mimeType) === media);
}

function getSpaceSize(space: Space) {
  return space.files.reduce((sum, file) => sum + file.size, 0);
}

export function SpacesPage() {
  const { activeNetwork } = useActiveNetwork();
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [media, setMedia] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const gridRef = useRef<HTMLElement | null>(null);
  const allSpaces = useSpaces({ network: activeNetwork, q: query, limit: 36 }).filter(
    (space) => space.network === activeNetwork,
  );

  const spaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allSpaces
      .filter((space) => {
        const matchesQuery =
          !normalizedQuery ||
          [space.title, space.description, space.creator, space.id]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesVisibility = visibility === "all" || space.visibility === visibility;

        return matchesQuery && matchesVisibility && spaceMatchesMedia(space, media);
      })
      .sort((a, b) => {
        if (sort === "largest") return getSpaceSize(b) - getSpaceSize(a);
        if (sort === "files") return b.files.length - a.files.length;
        return b.createdAt - a.createdAt;
      });
  }, [allSpaces, media, query, sort, visibility]);

  const totalBytes = allSpaces.reduce((sum, space) => sum + getSpaceSize(space), 0);
  const paidCount = allSpaces.filter((space) => space.visibility === "paid").length;
  useGsapStagger(gridRef, [spaces.map((space) => space.id).join("|")], ".space-card");

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page">
        <section className="collection-heading">
          <p className="eyebrow">Spaces</p>
          <h1>Discover Shelby-backed Spaces.</h1>
          <p>
            Browse public releases, paid unlocks, creator archives, and large-media bundles published
            on the active Shelby network.
          </p>
        </section>

        <section className="market-stats" aria-label="Marketplace summary">
          <article>
            <span>Spaces</span>
            <strong>{allSpaces.length}</strong>
          </article>
          <article>
            <span>Storage indexed</span>
            <strong>{formatBytes(totalBytes)}</strong>
          </article>
          <article>
            <span>Paid drops</span>
            <strong>{paidCount}</strong>
          </article>
          <article>
            <span>Network</span>
            <strong>{activeNetwork}</strong>
          </article>
        </section>

        <section className="market-filters" aria-label="Search and filter Spaces">
          <label className="search-field">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, creator, Space id..."
            />
          </label>

          <label>
            <span>Visibility</span>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}>
              <option value="all">All access</option>
              <option value="public">Public</option>
              <option value="wallet_gated">Wallet gated</option>
              <option value="paid">Paid</option>
            </select>
          </label>

          <label>
            <span>Media</span>
            <select value={media} onChange={(event) => setMedia(event.target.value as MediaFilter)}>
              <option value="all">All media</option>
              <option value="Image">Images</option>
              <option value="Video">Video</option>
              <option value="Audio">Audio</option>
              <option value="PDF">PDF</option>
              <option value="JSON">JSON</option>
              <option value="Archive">Archives</option>
              <option value="File">Files</option>
            </select>
          </label>

          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="newest">Newest</option>
              <option value="largest">Largest</option>
              <option value="files">Most files</option>
            </select>
          </label>
        </section>

        {spaces.length > 0 ? (
          <section ref={gridRef} className="space-list marketplace-grid">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </section>
        ) : (
          <section className="empty-state">
            <h2>No Spaces found for this view.</h2>
            <p>Adjust the filters or publish a Space on {activeNetwork} to start the gallery.</p>
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
