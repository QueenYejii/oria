import { AppHeader } from "../components/layout/AppHeader";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SpaceFileList } from "../components/spaces/SpaceFileList";
import { SpacePreview } from "../components/spaces/SpacePreview";
import { hasLocalPayment, saveLocalPayment, subscribeToPayments } from "../lib/access/payments";
import { resolveSpaceAccess } from "../lib/access/space-access";
import { getRegistryAccess, type RegistryAccessRecord } from "../lib/discovery/client";
import { purchaseSpaceOnChain } from "../lib/registry/client";
import { createShelbyClient } from "../lib/shelby/client";
import { decodeSpaceManifest, createShareUrl } from "../lib/spaces/manifest";
import { saveSpace } from "../lib/spaces/local-store";
import { getAccountAddress } from "../lib/wallet/address";
import { getErrorMessage } from "../lib/utils/errors";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import { useSpace } from "../hooks/useSpaces";
import type { OriaNetwork } from "../types/network";
import { formatDate, shortenAddress } from "../lib/utils/format";

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
  const hasPaid = space
    ? registryAccess?.hasPurchased ||
      hasLocalPayment({ spaceId: space.id, network: space.network, payer: viewer })
    : false;
  const access = space
    ? resolveSpaceAccess({
        space,
        viewer,
        hasPaid,
        isAllowlisted: registryAccess?.isAllowlisted,
      })
    : null;
  const shareUrl = useMemo(() => (space ? createShareUrl(space) : ""), [space]);

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
    } catch (caught) {
      setPaymentError(getErrorMessage(caught));
    } finally {
      setIsPaying(false);
    }
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
              </aside>
            </section>

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
