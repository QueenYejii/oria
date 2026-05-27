import { AppHeader } from "../components/layout/AppHeader";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { UploadDropzone } from "../components/upload/UploadDropzone";
import { UploadQueue } from "../components/upload/UploadQueue";
import { useCreateSpace } from "../hooks/useCreateSpace";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { useToasts } from "../providers/ToastProvider";
import { getErrorMessage } from "../lib/utils/errors";
import {
  clearUploadDraft,
  loadUploadDraft,
  loadUploadDraftFiles,
  saveUploadDraft,
  saveUploadDraftFiles,
} from "../lib/upload/draft-store";
import { loadUploadSession } from "../lib/upload/session-store";
import {
  getAccountAddress,
  getWalletNetworkLabel,
  isWalletNetworkCompatible,
} from "../lib/wallet/address";
import { formatBytes, shortenAddress } from "../lib/utils/format";
import type { SpacePaymentCurrency, SpaceVisibility } from "../types/space";

function toDateTimeLocal(value: Date) {
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getDefaultExpiryLocal() {
  return toDateTimeLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
}

export function CreateSpacePage() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { notify } = useToasts();
  const { activeNetwork, networkConfig } = useActiveNetwork();
  const { createSpace, retryLastUpload, cancelUpload, canRetry, uploadItems, isUploading } = useCreateSpace();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<SpaceVisibility>("public");
  const [paymentCurrency, setPaymentCurrency] = useState<SpacePaymentCurrency>("APT");
  const [priceApt, setPriceApt] = useState("0.01");
  const [expiresAtLocal, setExpiresAtLocal] = useState(getDefaultExpiryLocal);
  const [allowlistText, setAllowlistText] = useState("");
  const [publicCoverFile, setPublicCoverFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [restoredDraftNotice, setRestoredDraftNotice] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const address = getAccountAddress(wallet.account);
  const walletNetworkLabel = getWalletNetworkLabel(wallet.network);
  const walletNetworkCompatible = isWalletNetworkCompatible({
    walletNetwork: wallet.network,
    expectedNetwork: networkConfig.aptosNetwork,
  });
  const networkMismatch = Boolean(
    wallet.connected && wallet.network?.name && !walletNetworkCompatible
  );

  useEffect(() => {
    const draft = loadUploadDraft();
    const session = loadUploadSession();
    if (session) {
      setRestoredDraftNotice(
        `Recovered upload session ${session.spaceId} with ${session.files.length} tracked file(s). Re-select files to retry unfinished uploads.`,
      );
    }

    if (!draft) return;

    setTitle(draft.title);
    setDescription(draft.description);
    setVisibility(draft.visibility);
    setPriceApt(draft.priceApt);
    setExpiresAtLocal(draft.expiresAtLocal || getDefaultExpiryLocal());
    setAllowlistText(draft.allowlistText);

    loadUploadDraftFiles().then((draftFiles) => {
      if (draftFiles.length > 0) {
        setFiles(draftFiles);
        setRestoredDraftNotice(
          `Recovered your last draft from ${new Date(draft.updatedAt).toLocaleString()} with ${draftFiles.length} file(s).`,
        );
        return;
      }

      if (draft.files.length > 0) {
        setRestoredDraftNotice(
          `Recovered your last draft from ${new Date(draft.updatedAt).toLocaleString()}. Re-select ${draft.files.length} file(s) before publishing.`,
        );
      } else if (draft.title || draft.description) {
        setRestoredDraftNotice(`Recovered your last draft from ${new Date(draft.updatedAt).toLocaleString()}.`);
      }
    });
  }, []);

  useEffect(() => {
    if (!title && !description && files.length === 0 && visibility === "public" && !allowlistText) {
      return;
    }

    saveUploadDraft({
      title,
      description,
      visibility,
      priceApt,
      expiresAtLocal,
      allowlistText,
      files: files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    });
    void saveUploadDraftFiles(files);
  }, [allowlistText, description, expiresAtLocal, files, priceApt, title, visibility]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const space = await createSpace({
        title,
        description,
        visibility,
        priceOctas: visibility === "paid" ? Math.round(Number(priceApt) * 100_000_000) : undefined,
        paymentCurrency,
        expiresAtMs: new Date(expiresAtLocal).getTime(),
        allowlist: allowlistText
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
        publicCoverFile,
        files,
      });
      notify({
        tone: "success",
        title: "Space is live",
        message: `${space.title} is indexed on Shelbynet and ready in Discover.`,
      });
      clearUploadDraft();
      setPublicCoverFile(null);
      navigate(`/spaces/${space.id}`);
    } catch (caught) {
      const message = getErrorMessage(caught);
      setError(message);
      notify({ tone: "error", title: "Publish failed", message });
    }
  };

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="create-layout">
        <section className="create-copy">
          <p className="eyebrow">Create Space</p>
          <h1>Publish a Shelby-backed release.</h1>
          <p>
            Prepare metadata, choose access, and publish Shelby blobs through your Aptos wallet on {networkConfig.label}.
          </p>

          <div className="status-panel">
            <span className="tiny-label">Publishing context</span>
            <strong>{networkConfig.label}</strong>
            <p>{address ? `Wallet ${shortenAddress(address)}` : "Connect a wallet from the header to publish."}</p>
            {networkMismatch && (
              <p className="form-error">
                Wallet reports {walletNetworkLabel}. Switch it to {networkConfig.label} before
                publishing.
              </p>
            )}
            {wallet.connected && !networkMismatch && wallet.network?.name === "custom" && (
              <p className="form-note">
                Petra reports Shelbynet as a custom network. Oria will publish this Space to
                Shelbynet.
              </p>
            )}
            {restoredDraftNotice && (
              <p className="form-note">
                {restoredDraftNotice}
              </p>
            )}
          </div>
        </section>

        <form className="create-form" onSubmit={submit}>
          <label>
            <span>Space title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Creator release, collection pack, or research archive"
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what buyers or visitors will find inside this Space."
              rows={4}
            />
          </label>

          <div className="visibility-control">
            {(["public", "wallet_gated", "paid"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={visibility === option ? "active" : ""}
                onClick={() => setVisibility(option)}
              >
                {option.replace("_", " ")}
              </button>
            ))}
          </div>

          {visibility === "paid" && (
            <div className="paid-settings-grid">
              <label>
                <span>Payment asset</span>
                <select
                  value={paymentCurrency}
                  onChange={(event) => setPaymentCurrency(event.target.value as SpacePaymentCurrency)}
                >
                  <option value="APT">APT</option>
                  <option value="SHELBY_USD">ShelbyUSD</option>
                </select>
              </label>
              <label>
                <span>Price in {paymentCurrency === "SHELBY_USD" ? "ShelbyUSD" : "APT"}</span>
                <input
                  min="0.000001"
                  step="0.000001"
                  type="number"
                  value={priceApt}
                  onChange={(event) => setPriceApt(event.target.value)}
                  placeholder="0.01"
                />
              </label>
              {paymentCurrency === "SHELBY_USD" && (
                <p className="form-note paid-settings-note">
                  ShelbyUSD requires the Oria payment v2 registry and ShelbyUSD metadata env before
                  publishing or unlocking can settle correctly.
                </p>
              )}
            </div>
          )}

          <label>
            <span>File expiration</span>
            <input
              type="datetime-local"
              value={expiresAtLocal}
              min={toDateTimeLocal(new Date(Date.now() + 10 * 60 * 1000))}
              onChange={(event) => setExpiresAtLocal(event.target.value)}
            />
          </label>

          {visibility === "wallet_gated" && (
            <label>
              <span>Allowed wallets</span>
              <textarea
                value={allowlistText}
                onChange={(event) => setAllowlistText(event.target.value)}
                placeholder="0x... one address per line. Leave empty for creator-only."
                rows={3}
              />
            </label>
          )}

          {visibility !== "public" && (
            <div className="cover-picker">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setCoverError(null);

                  if (!file) {
                    setPublicCoverFile(null);
                    return;
                  }

                  if (!file.type.startsWith("image/")) {
                    setCoverError("Choose an image file for the public cover.");
                    return;
                  }

                  if (file.size > 12 * 1024 * 1024) {
                    setCoverError("Public cover must be 12 MB or smaller.");
                    return;
                  }

                  setPublicCoverFile(file);
                }}
              />
              <div>
                <span className="tiny-label">Public cover</span>
                <strong>Show a cover without exposing the gated files.</strong>
                <p>
                  Optional for paid or wallet-gated Spaces. If empty, Oria blurs the first private
                  image as the thumbnail.
                </p>
              </div>
              {publicCoverFile ? (
                <span className="cover-file-pill">
                  {publicCoverFile.name} - {formatBytes(publicCoverFile.size)}
                  <button
                    type="button"
                    onClick={() => {
                      setPublicCoverFile(null);
                      if (coverInputRef.current) coverInputRef.current.value = "";
                    }}
                    aria-label="Remove public cover"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <button className="button secondary" type="button" onClick={() => coverInputRef.current?.click()}>
                  <ImagePlus size={18} aria-hidden="true" />
                  Add cover
                </button>
              )}
              {coverError && <p className="dropzone-validation">{coverError}</p>}
            </div>
          )}

          <UploadDropzone files={files} onFilesChange={setFiles} />
          <UploadQueue items={uploadItems} onCancel={isUploading ? cancelUpload : undefined} />

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button
              className="button primary publish-button"
              type="submit"
              disabled={isUploading || !wallet.connected || networkMismatch}
            >
              {isUploading ? "Publishing..." : "Publish Space"}
            </button>
            {canRetry && (
              <button
                className="button secondary publish-button"
                type="button"
                disabled={isUploading}
                onClick={() =>
                  retryLastUpload().then((space) => {
                    clearUploadDraft();
                    navigate(`/spaces/${space.id}`);
                  })
                }
              >
                Retry failed upload
              </button>
            )}
          </div>
        </form>
      </main>
    </>
  );
}
