import { AppHeader } from "../components/layout/AppHeader";
import { SpaceCard } from "../components/spaces/SpaceCard";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useSpaces } from "../hooks/useSpaces";
import {
  encodeCreatorProfileLinks,
  fetchCreatorProfile,
  getLocalCreatorProfile,
  mergeCreatorProfiles,
  saveLocalCreatorProfile,
  subscribeToCreatorProfiles,
  type CreatorProfile,
} from "../lib/creator/profile";
import { updateCreatorProfileOnChain } from "../lib/registry/client";
import { formatBytes, formatDate, shortenAddress } from "../lib/utils/format";
import { getAccountAddress } from "../lib/wallet/address";
import { getErrorMessage } from "../lib/utils/errors";
import { useToasts } from "../providers/ToastProvider";
import { Copy, Github, MessageCircle, Save, Send, ShieldCheck, Sparkles, Twitter } from "lucide-react";
import type { CSSProperties } from "react";

function getCreatorHue(address?: string) {
  if (!address) return 190;
  return Array.from(address).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
}

export function CreatorPage() {
  const { address } = useParams();
  const wallet = useWallet();
  const { activeNetwork } = useActiveNetwork();
  const { notify } = useToasts();
  const viewer = getAccountAddress(wallet.account);
  const isOwner = Boolean(address && viewer && address.toLowerCase() === viewer.toLowerCase());
  const localProfile = useMemo(() => getLocalCreatorProfile(address), [address]);
  const [profile, setProfile] = useState<CreatorProfile | null>(localProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    displayName: "",
    bio: "",
    avatar: "",
    website: "",
    github: "https://github.com/QueenYejii/oria",
    twitter: "https://x.com/QueenYejii24",
    telegram: "https://t.me/QueenYejii24",
  });
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
  const displayName = profile?.displayName || (address ? shortenAddress(address) : "Creator profile");
  const socialLinks = profile?.links ?? profileDraft;

  useEffect(() => subscribeToCreatorProfiles(() => setProfile(getLocalCreatorProfile(address))), [address]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    fetchCreatorProfile(address)
      .then((registryProfile) => {
        if (cancelled) return;
        setProfile(mergeCreatorProfiles(registryProfile, getLocalCreatorProfile(address)));
      })
      .catch(() => {
        if (!cancelled) setProfile(getLocalCreatorProfile(address));
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    setProfileDraft({
      displayName: profile?.displayName || "",
      bio: profile?.bio || "",
      avatar: profile?.avatar || "",
      website: profile?.links.website || "",
      github: profile?.links.github || "https://github.com/QueenYejii/oria",
      twitter: profile?.links.twitter || "https://x.com/QueenYejii24",
      telegram: profile?.links.telegram || "https://t.me/QueenYejii24",
    });
  }, [profile]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    notify({ tone: "success", title: "Creator address copied" });
  };

  const saveProfile = async () => {
    if (!address || !isOwner) return;

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const links = {
        website: profileDraft.website.trim(),
        github: profileDraft.github.trim(),
        twitter: profileDraft.twitter.trim(),
        telegram: profileDraft.telegram.trim(),
      };
      const nextProfile: CreatorProfile = {
        address,
        displayName: profileDraft.displayName.trim() || shortenAddress(address),
        bio: profileDraft.bio.trim(),
        avatar: profileDraft.avatar.trim(),
        links,
        updatedAt: Date.now(),
        source: "local",
      };
      const txHash = await updateCreatorProfileOnChain({
        displayName: nextProfile.displayName,
        bio: nextProfile.bio,
        avatar: nextProfile.avatar,
        links: encodeCreatorProfileLinks(links),
        signAndSubmitTransaction: wallet.signAndSubmitTransaction,
      });

      saveLocalCreatorProfile(txHash ? { ...nextProfile, source: "registry" } : nextProfile);
      setProfile(txHash ? { ...nextProfile, source: "registry" } : nextProfile);
      setIsEditingProfile(false);
      notify({
        tone: "success",
        title: "Creator profile saved",
        message: txHash ? "Profile update was submitted to the registry." : "Profile saved locally until registry v2 is active.",
      });
    } catch (caught) {
      const message = getErrorMessage(caught);
      setProfileError(message);
      notify({ tone: "error", title: "Profile update failed", message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="collection-page creator-page">
        <section className="creator-hero">
          <div className="creator-identity">
            <div className="creator-avatar" style={{ "--avatar-hue": hue } as CSSProperties}>
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" />
              ) : (
                <span>{displayName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="creator-bio">
              <div className="detail-eyebrow-row">
                <p className="eyebrow">Creator profile</p>
                <span className="network-badge stable">{activeNetwork}</span>
              </div>
              <h1>{displayName}</h1>
              <p>
                {profile?.bio ||
                  "A Shelby-backed creator profile for media Spaces, release manifests, and unlockable archives indexed by Oria."}
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
                {(socialLinks.github || "https://github.com/QueenYejii/oria") && (
                  <a href={socialLinks.github || "https://github.com/QueenYejii/oria"} target="_blank" rel="noreferrer" aria-label="GitHub">
                    <Github size={18} />
                  </a>
                )}
                {(socialLinks.telegram || "https://t.me/QueenYejii24") && (
                  <a href={socialLinks.telegram || "https://t.me/QueenYejii24"} target="_blank" rel="noreferrer" aria-label="Telegram">
                    <Send size={18} />
                  </a>
                )}
                {(socialLinks.twitter || "https://x.com/QueenYejii24") && (
                  <a href={socialLinks.twitter || "https://x.com/QueenYejii24"} target="_blank" rel="noreferrer" aria-label="X">
                    <Twitter size={18} />
                  </a>
                )}
                <a href="https://discord.com/invite/shelbyserves" target="_blank" rel="noreferrer" aria-label="Discord">
                  <MessageCircle size={18} />
                </a>
              </div>
              <div className="creator-presence-strip" aria-label="Creator presence">
                <span>{activeNetwork}</span>
                <span>{spaces.length} Spaces</span>
                <span>{formatBytes(totalBytes)}</span>
              </div>
            </div>
          </div>
          <div className="creator-actions">
            <Link className="button secondary" to="/spaces">
              Browse all Spaces
            </Link>
            {isOwner && (
              <button className="button secondary" type="button" onClick={() => setIsEditingProfile((value) => !value)}>
                {isEditingProfile ? "Close editor" : "Edit profile"}
              </button>
            )}
            <Link className="button primary" to="/create">
              Publish Space
            </Link>
          </div>
        </section>

        {isOwner && isEditingProfile && (
          <section className="creator-editor-panel">
            <div className="section-label">
              <p className="eyebrow">Creator identity</p>
              <h2>Update public profile</h2>
            </div>
            <div className="creator-editor-grid">
              <label>
                <span>Display name</span>
                <input
                  value={profileDraft.displayName}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, displayName: event.target.value }))}
                  placeholder="Creator name"
                />
              </label>
              <label>
                <span>Avatar URL</span>
                <input
                  value={profileDraft.avatar}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, avatar: event.target.value }))}
                  placeholder="https://your-domain.com/avatar.png"
                />
              </label>
              <label className="wide">
                <span>Bio</span>
                <textarea
                  value={profileDraft.bio}
                  onChange={(event) => setProfileDraft((draft) => ({ ...draft, bio: event.target.value }))}
                  rows={4}
                  placeholder="Describe your work, archive, or release practice."
                />
              </label>
              <label>
                <span>Website</span>
                <input value={profileDraft.website} onChange={(event) => setProfileDraft((draft) => ({ ...draft, website: event.target.value }))} />
              </label>
              <label>
                <span>GitHub</span>
                <input value={profileDraft.github} onChange={(event) => setProfileDraft((draft) => ({ ...draft, github: event.target.value }))} />
              </label>
              <label>
                <span>X / Twitter</span>
                <input value={profileDraft.twitter} onChange={(event) => setProfileDraft((draft) => ({ ...draft, twitter: event.target.value }))} />
              </label>
              <label>
                <span>Telegram</span>
                <input value={profileDraft.telegram} onChange={(event) => setProfileDraft((draft) => ({ ...draft, telegram: event.target.value }))} />
              </label>
            </div>
            {profileError && <p className="form-error">{profileError}</p>}
            <div className="form-actions">
              <button className="button primary" type="button" disabled={isSavingProfile} onClick={saveProfile}>
                <Save size={17} aria-hidden="true" />
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>
              <button className="button secondary" type="button" onClick={() => setIsEditingProfile(false)}>
                Cancel
              </button>
            </div>
          </section>
        )}

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
            <strong>{mediaKinds.length ? mediaKinds.join(", ") : "No media yet"}</strong>
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
            <strong>{latestUpdate ? formatDate(latestUpdate) : "No updates yet"}</strong>
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
            <p>Published Spaces from this address will appear here after Oria reads them from the registry.</p>
          </section>
        )}
      </main>
    </>
  );
}
