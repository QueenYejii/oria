import { AppHeader } from "../components/layout/AppHeader";
import { SpaceCard } from "../components/spaces/SpaceCard";
import { Link, useParams } from "react-router-dom";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import { formatBytes, formatDate, shortenAddress } from "../lib/utils/format";
import { useToasts } from "../providers/ToastProvider";
import { Copy, Github, MessageCircle, Send, ShieldCheck, Sparkles, Twitter } from "lucide-react";
import type { CSSProperties } from "react";

function getCreatorHue(address?: string) {
  if (!address) return 190;
  return Array.from(address).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
}

export function CreatorPage() {
  const { address } = useParams();
  const { activeNetwork } = useActiveNetwork();
  const { notify } = useToasts();
  const spaces = useSpaces({ creator: address, network: activeNetwork }).filter(
    (space) =>
      (!address || space.creator.toLowerCase() === address.toLowerCase()) &&
      space.network === activeNetwork,
  );
  const totalBytes = spaces.reduce((sum, space) => sum + space.files.reduce((fileSum, file) => fileSum + file.size, 0), 0);
  const paidSpaces = spaces.filter((space) => space.visibility === "paid").length;
  const publicSpaces = spaces.filter((space) => space.visibility === "public").length;
  const gatedSpaces = spaces.filter((space) => space.visibility === "wallet_gated").length;
  const latestUpdate = spaces.reduce((latest, space) => Math.max(latest, space.updatedAt), 0);
  const latestSpace = spaces[0];
  const mediaKinds = Array.from(
    new Set(
      spaces.flatMap((space) =>
        space.files.map((file) => (file.mimeType.split("/")[0] || "file").replace("application", "document")),
      ),
    ),
  ).slice(0, 4);
  const hue = getCreatorHue(address);
  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    notify({ tone: "success", title: "Creator address copied" });
  };

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page creator-page">
        <section className="creator-hero">
          <div className="creator-identity">
            <div className="creator-avatar" style={{ "--avatar-hue": hue } as CSSProperties}>
              <span>{address?.slice(2, 4).toUpperCase() ?? "OR"}</span>
            </div>
            <div className="creator-bio">
              <div className="detail-eyebrow-row">
                <p className="eyebrow">Creator profile</p>
                <span className="network-badge stable">{activeNetwork}</span>
              </div>
              <h1>{address ? shortenAddress(address) : "Unknown creator"}</h1>
              <p>
                A Shelby-backed publishing profile for media Spaces, release manifests, and
                unlockable creator archives indexed by Oria.
              </p>
              <div className="creator-address-row">
                <code>{address ?? "No address supplied"}</code>
                {address && (
                  <button type="button" onClick={copyAddress} aria-label="Copy creator address">
                    <Copy size={16} />
                  </button>
                )}
              </div>
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

        <section className="creator-showcase" aria-label="Creator publishing summary">
          <article>
            <div>
              <Sparkles size={18} aria-hidden="true" />
              <span>Latest release</span>
            </div>
            <strong>{latestSpace?.title ?? "No release yet"}</strong>
            <p>
              {latestSpace
                ? `${latestSpace.files.length} files - updated ${formatDate(latestSpace.updatedAt)}`
                : "Published Spaces from this creator will appear here as soon as discovery indexes them."}
            </p>
          </article>
          <article>
            <div>
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Access mix</span>
            </div>
            <strong>
              {publicSpaces} public / {gatedSpaces + paidSpaces} gated
            </strong>
            <p>
              {paidSpaces} paid drops and {gatedSpaces} wallet-gated releases on the active
              network.
            </p>
          </article>
          <article>
            <div>
              <span>Media focus</span>
            </div>
            <strong>{mediaKinds.length ? mediaKinds.join(", ") : "Pending"}</strong>
            <p>Media types are inferred from the creator's current Shelby blobs.</p>
          </article>
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
          <>
            <section className="section-label creator-space-heading">
              <div>
                <p className="eyebrow">Creator Spaces</p>
                <h2>Published drops</h2>
              </div>
              <span>{spaces.length} indexed</span>
            </section>
            <section className="space-list marketplace-grid">
              {spaces.map((space) => (
                <SpaceCard key={space.id} space={space} />
              ))}
            </section>
          </>
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
