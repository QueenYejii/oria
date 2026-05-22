import { AppHeader } from "../components/layout/AppHeader";
import { useUploadBlobs } from "@shelby-protocol/react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SpaceFileList } from "../components/spaces/SpaceFileList";
import { SpacePreview } from "../components/spaces/SpacePreview";
import { hasLocalPayment, saveLocalPayment, subscribeToPayments } from "../lib/access/payments";
import { resolveSpaceAccess } from "../lib/access/space-access";
import { getRegistryAccess, type RegistryAccessRecord } from "../lib/discovery/client";
import { hasRegistryConfig, purchaseSpaceOnChain, updateSpaceManifestOnChain } from "../lib/registry/client";
import { createShelbyClient } from "../lib/shelby/client";
import { decodeSpaceManifest, createShareUrl, encodeSpaceManifest } from "../lib/spaces/manifest";
import { deleteSpace, saveSpace } from "../lib/spaces/local-store";
import { getAccountAddress } from "../lib/wallet/address";
import { getErrorMessage } from "../lib/utils/errors";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import { useSpace } from "../hooks/useSpaces";
import type { OriaNetwork } from "../types/network";
import { formatDate, shortenAddress } from "../lib/utils/format";
import { sha256Hex } from "../lib/utils/hash";
import { useToasts } from "../providers/ToastProvider";
import type { Space, SpaceVisibility } from "../types/space";

export function SpaceDetailPage() {
  const { spaceId } = useParams();
  const [searchParams] = useSearchParams();
  const wallet = useWallet();
  const space = useSpace(spaceId);
  const viewer = getAccountAddress(wallet.account);
  const { activeFileId, error, downloadFile } = useDownloadBlob();
  const [importError, setImportError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentTick, setPaymentTick] = useState(0);
  const [registryAccess, setRegistryAccess] = useState<RegistryAccessRecord | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdatingManifest, setIsUpdatingManifest] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: "",
    description: "",
    visibility: "public" as SpaceVisibility,
    priceApt: "0.01",
    allowlistText: "",
  });
  const { notify } = useToasts();
  const hasOnChainRegistry = hasRegistryConfig();
  const shelbyClient = useMemo(
    () => createShelbyClient(space?.network ?? (searchParams.get("network") as OriaNetwork) ?? "shelbynet"),
    [searchParams, space?.network],
  );
  const uploadBlobs = useUploadBlobs({ client: shelbyClient });
  const isOwner = Boolean(space && viewer && space.creator.toLowerCase() === viewer.toLowerCase());
  const hasPaid = space
    ? hasOnChainRegistry
      ? Boolean(registryAccess?.hasPurchased)
      : registryAccess?.hasPurchased ||
        hasLocalPayment({ spaceId: space.id, network: space.network, payer: viewer })
    : false;
  const access = space
    ? resolveSpaceAccess({
        space,
        viewer,
        hasPaid,
        isAllowlisted: registryAccess?.isAllowlisted,
        trustExternalAccessState: hasOnChainRegistry,
      })
    : null;
  const shareUrl = useMemo(() => (space ? createShareUrl(space) : ""), [space]);

  useEffect(() => {
    if (!space) return;

    setEditDraft({
      title: space.title,
      description: space.description,
      visibility: space.visibility,
      priceApt: String((space.payment?.priceOctas ?? 1_000_000) / 100_000_000),
      allowlistText: space.access.allowlist?.join("\n") ?? "",
    });
  }, [space]);

  useEffect(() => subscribeToPayments(() => setPaymentTick((tick) => tick + 1)), []);

  useEffect(() => {
    if (!space || !viewer) {
      setRegistryAccess(null);
      return;
    }

    let cancelled = false;

    getRegistryAccess(space.id, viewer)
      .then((record) => {
        if (!cancelled) setRegistryAccess(record);
      })
      .catch(() => {
        if (!cancelled) setRegistryAccess(null);
      });

    return () => {
      cancelled = true;
    };
  }, [paymentTick, space, viewer]);

  useEffect(() => {
    if (space || !spaceId) return;

    const manifestBlobName = searchParams.get("manifest");
    const creator = searchParams.get("creator");
    const network = searchParams.get("network") as OriaNetwork | null;

    if (!manifestBlobName || !creator || (network !== "testnet" && network !== "shelbynet")) {
      return;
    }

    const importNetwork = network;
    const importCreator = creator;
    const importManifestBlobName = manifestBlobName;
    let cancelled = false;

    async function importManifest() {
      setImportError(null);

      try {
        const client = createShelbyClient(importNetwork);
        const manifestBlob = await client.rpc.getBlob({
          account: importCreator,
          blobName: importManifestBlobName,
        });
        const importedSpace = await decodeSpaceManifest(manifestBlob.readable);

        if (!cancelled) {
          saveSpace(importedSpace);
        }
      } catch (caught) {
        if (!cancelled) {
          setImportError(getErrorMessage(caught));
        }
      }
    }

    importManifest();

    return () => {
      cancelled = true;
    };
  }, [searchParams, space, spaceId]);

  const unlockPaidSpace = async () => {
    if (!space?.payment || !viewer) return;

    setIsPaying(true);
    setPaymentError(null);

    try {
      const txHash = await purchaseSpaceOnChain({
        space,
        signAndSubmitTransaction: wallet.signAndSubmitTransaction,
      });

      saveLocalPayment({
        spaceId: space.id,
        network: space.network,
        payer: viewer,
        txHash,
        paidAt: Date.now(),
      });
      setPaymentTick((tick) => tick + 1);
      notify({ tone: "success", title: "Space unlocked", message: "Payment recorded for this wallet." });
    } catch (caught) {
      const message = getErrorMessage(caught);
      setPaymentError(message);
      notify({ tone: "error", title: "Payment failed", message });
    } finally {
      setIsPaying(false);
    }
  };

  const updateManifest = async () => {
    if (!space || !viewer || !isOwner) return;

    setIsUpdatingManifest(true);
    setEditError(null);

    try {
      const allowlist = editDraft.allowlistText
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      const priceOctas = Math.round(Number(editDraft.priceApt) * 100_000_000);

      if (!editDraft.title.trim()) throw new Error("Space title cannot be empty.");
      if (editDraft.visibility === "paid" && (!Number.isFinite(priceOctas) || priceOctas <= 0)) {
        throw new Error("Paid Spaces need a valid APT price.");
      }

      const nextDraft: Space = {
        ...space,
        title: editDraft.title.trim(),
        description: editDraft.description.trim(),
        visibility: editDraft.visibility,
        access:
          editDraft.visibility === "paid"
            ? { rule: "paid" }
            : editDraft.visibility === "wallet_gated"
              ? { rule: allowlist.length ? "allowlist" : "creator_only", allowlist }
              : { rule: "public" },
        payment:
          editDraft.visibility === "paid"
            ? { currency: "APT", priceOctas, recipient: space.creator }
            : undefined,
        manifestHash: undefined,
        manifestVersion: space.manifestVersion + 1,
        updatedAt: Date.now(),
      };
      const manifestBytes = encodeSpaceManifest(nextDraft);
      const manifestHash = await sha256Hex(manifestBytes);
      const nextSpace: Space = {
        ...nextDraft,
        manifestHash,
      };

      if (nextSpace.manifestBlobName) {
        await uploadBlobs.mutateAsync({
          signer: {
            account: viewer,
            signAndSubmitTransaction: wallet.signAndSubmitTransaction,
          },
          blobs: [
            {
              blobName: nextSpace.manifestBlobName,
              blobData: manifestBytes,
            },
          ],
          expirationMicros: nextSpace.expiresAt * 1000,
          maxConcurrentUploads: 1,
        });
      }

      const registryTxHash =
        (await updateSpaceManifestOnChain({
          space: nextSpace,
          signAndSubmitTransaction: wallet.signAndSubmitTransaction,
        })) ?? nextSpace.registryTxHash;

      saveSpace({ ...nextSpace, registryTxHash });
      setIsEditing(false);
      notify({
        tone: "success",
        title: "Manifest updated",
        message: `Version ${nextSpace.manifestVersion} is now saved.`,
      });
    } catch (caught) {
      const message = getErrorMessage(caught);
      setEditError(message);
      notify({ tone: "error", title: "Update failed", message });
    } finally {
      setIsUpdatingManifest(false);
    }
  };

  const removeSpace = () => {
    if (!space || !isOwner) return;
    const confirmed = window.confirm("Remove this Space from local Oria metadata? Shelby blobs and on-chain records will not be deleted.");
    if (!confirmed) return;

    deleteSpace(space.id);
    notify({ tone: "info", title: "Space removed", message: "Local metadata was removed from this browser." });
  };

  void paymentTick;

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="detail-page">
        {space ? (
          <>
            <section className="detail-hero">
              <div>
                <p className="eyebrow">{space.network}</p>
                <h1>{space.title}</h1>
                <p>{space.description || "No description added."}</p>
              </div>
              <aside className="status-panel">
                <span className="tiny-label">Owner</span>
                <strong>{shortenAddress(space.creator)}</strong>
                <Link to={`/u/${space.creator}`}>View creator profile</Link>
                <p>Published {formatDate(space.createdAt)}</p>
                <p>Expires {formatDate(space.expiresAt)}</p>
                <p>Manifest v{space.manifestVersion}</p>
                {space.manifestHash && <p>Hash {space.manifestHash.slice(0, 12)}...</p>}
                <span className="network-badge experimental">{space.visibility}</span>
                {space.payment && (
                  <p>
                    Price {(space.payment.priceOctas / 100_000_000).toLocaleString()}{" "}
                    {space.payment.currency}
                  </p>
                )}
                {isOwner && (
                  <div className="owner-actions">
                    <button className="button secondary" type="button" onClick={() => setIsEditing((value) => !value)}>
                      {isEditing ? "Close editor" : "Edit Space"}
                    </button>
                    <button className="button danger" type="button" onClick={removeSpace}>
                      Delete local copy
                    </button>
                  </div>
                )}
              </aside>
            </section>

            {isOwner && isEditing && (
              <section className="edit-manifest-panel">
                <div className="section-label">
                  <p className="eyebrow">Manifest editor</p>
                  <h2>Publish metadata version {space.manifestVersion + 1}</h2>
                </div>
                <div className="edit-grid">
                  <label>
                    <span>Title</span>
                    <input
                      value={editDraft.title}
                      onChange={(event) => setEditDraft((draft) => ({ ...draft, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Visibility</span>
                    <select
                      value={editDraft.visibility}
                      onChange={(event) =>
                        setEditDraft((draft) => ({ ...draft, visibility: event.target.value as SpaceVisibility }))
                      }
                    >
                      <option value="public">Public</option>
                      <option value="wallet_gated">Wallet gated</option>
                      <option value="paid">Paid</option>
                    </select>
                  </label>
                  <label className="wide">
                    <span>Description</span>
                    <textarea
                      value={editDraft.description}
                      onChange={(event) => setEditDraft((draft) => ({ ...draft, description: event.target.value }))}
                      rows={4}
                    />
                  </label>
                  {editDraft.visibility === "paid" && (
                    <label>
                      <span>Price in APT</span>
                      <input
                        min="0.000001"
                        step="0.000001"
                        type="number"
                        value={editDraft.priceApt}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, priceApt: event.target.value }))}
                      />
                    </label>
                  )}
                  {editDraft.visibility === "wallet_gated" && (
                    <label className="wide">
                      <span>Allowed wallets</span>
                      <textarea
                        value={editDraft.allowlistText}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, allowlistText: event.target.value }))}
                        rows={3}
                      />
                    </label>
                  )}
                </div>
                {editError && <p className="form-error">{editError}</p>}
                <div className="form-actions">
                  <button
                    className="button primary"
                    type="button"
                    disabled={isUpdatingManifest || uploadBlobs.isPending}
                    onClick={updateManifest}
                  >
                    {isUpdatingManifest || uploadBlobs.isPending ? "Updating..." : "Update manifest"}
                  </button>
                  <button className="button secondary" type="button" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </section>
            )}

            <section className="access-panel">
              <div>
                <span className="tiny-label">Access</span>
                <strong>{access?.canDownload ? "Downloads unlocked" : "Downloads locked"}</strong>
                <p>{access?.reason}</p>
              </div>
              <div className="access-actions">
                {space.visibility === "paid" && !access?.canDownload && (
                  <button
                    className="button primary"
                    type="button"
                    disabled={!wallet.connected || isPaying}
                    onClick={unlockPaidSpace}
                  >
                    {isPaying ? "Confirming..." : "Pay to unlock"}
                  </button>
                )}
                <button
                  className="button secondary"
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setShareCopied(true);
                    notify({ tone: "success", title: "Share link copied" });
                    window.setTimeout(() => setShareCopied(false), 1800);
                  }}
                >
                  {shareCopied ? "Copied" : "Copy share link"}
                </button>
              </div>
            </section>
            {paymentError && <p className="form-error">{paymentError}</p>}

            <SpacePreview space={space} canPreview={Boolean(access?.canDownload)} />

            <section className="detail-files">
              <div className="section-label">
                <p className="eyebrow">Files</p>
                <h2>{space.files.length} Shelby blobs</h2>
              </div>
              <SpaceFileList
                space={space}
                activeFileId={activeFileId}
                canDownload={Boolean(access?.canDownload)}
                onDownload={access?.canDownload ? downloadFile : undefined}
              />
              {error && <p className="form-error">{error}</p>}
            </section>
          </>
        ) : (
          <section className="empty-state">
            <h1>Space not found.</h1>
            <p>
              {importError ??
                "This browser has no local metadata for that Space. Open a share link with manifest metadata or browse local Spaces."}
            </p>
            <Link className="button primary" to="/spaces">
              Back to Spaces
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
