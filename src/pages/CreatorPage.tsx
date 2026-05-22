import { AppHeader } from "../components/layout/AppHeader";
import { SpaceCard } from "../components/spaces/SpaceCard";
import { Link, useParams } from "react-router-dom";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import { formatBytes, shortenAddress } from "../lib/utils/format";
import { Github, Send, Twitter, MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";

function getCreatorHue(address?: string) {
  if (!address) return 190;
  return Array.from(address).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
}

export function CreatorPage() {
  const { address } = useParams();
  const { activeNetwork } = useActiveNetwork();
  const spaces = useSpaces({ creator: address, network: activeNetwork }).filter(
    (space) =>
      (!address || space.creator.toLowerCase() === address.toLowerCase()) &&
      space.network === activeNetwork,
  );
  const totalBytes = spaces.reduce((sum, space) => sum + space.files.reduce((fileSum, file) => fileSum + file.size, 0), 0);
  const paidSpaces = spaces.filter((space) => space.visibility === "paid").length;
  const latestUpdate = spaces.reduce((latest, space) => Math.max(latest, space.updatedAt), 0);
  const hue = getCreatorHue(address);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page creator-page">
        <section className="creator-hero">
          <div className="creator-avatar" style={{ "--avatar-hue": hue } as CSSProperties}>
            <span>{address?.slice(2, 4).toUpperCase() ?? "OR"}</span>
          </div>
          <div className="creator-bio">
            <p className="eyebrow">Creator profile</p>
            <h1>{address ? shortenAddress(address) : "Unknown creator"}</h1>
            <p>
              Shelby publisher profile for Spaces registered, imported, and curated on the active
              Oria network.
            </p>
            <div className="creator-socials" aria-label="Creator and project links">
              <a href="https://github.com/QueenYejii/oria" target="_blank" rel="noreferrer" aria-label="GitHub">
                <Github size={18} />
              </a>
              <a href="https://t.me/QueenYejii24" target="_blank" rel="noreferrer" aria-label="Telegram">
                <Send size={18} />
              </a>
              <a href="https://x.com/QueenYejii24" target="_blank" rel="noreferrer" aria-label="X">
                <Twitter size={18} />
              </a>
              <a href="https://discord.com/invite/shelbyserves" target="_blank" rel="noreferrer" aria-label="Discord">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
          <div className="creator-actions">
            <Link className="button secondary" to="/spaces">
              Browse all Spaces
            </Link>
            <Link className="button primary" to="/create">
              Publish Space
            </Link>
          </div>
        </section>

        <section className="creator-stats" aria-label="Creator stats">
          <article>
            <span>Spaces</span>
            <strong>{spaces.length}</strong>
          </article>
          <article>
            <span>Total media</span>
            <strong>{formatBytes(totalBytes)}</strong>
          </article>
          <article>
            <span>Paid drops</span>
            <strong>{paidSpaces}</strong>
          </article>
          <article>
            <span>Last update</span>
            <strong>{latestUpdate ? new Date(latestUpdate).toLocaleDateString() : "Pending"}</strong>
          </article>
        </section>

        {spaces.length > 0 ? (
          <section className="space-list marketplace-grid">
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
