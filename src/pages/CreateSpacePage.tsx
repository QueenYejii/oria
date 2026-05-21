import { AppHeader } from "../components/layout/AppHeader";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { UploadDropzone } from "../components/upload/UploadDropzone";
import { UploadQueue } from "../components/upload/UploadQueue";
import { useCreateSpace } from "../hooks/useCreateSpace";
import { useActiveNetwork } from "../hooks/useActiveNetwork";
import { getErrorMessage } from "../lib/utils/errors";
import { getAccountAddress, normalizeNetworkName } from "../lib/wallet/address";
import { shortenAddress } from "../lib/utils/format";
import type { SpaceVisibility } from "../types/space";

export function CreateSpacePage() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { activeNetwork, networkConfig } = useActiveNetwork();
  const { createSpace, retryLastUpload, canRetry, uploadItems, isUploading } = useCreateSpace();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<SpaceVisibility>("public");
  const [priceApt, setPriceApt] = useState("0.01");
  const [allowlistText, setAllowlistText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const address = getAccountAddress(wallet.account);
  const walletNetwork = normalizeNetworkName(wallet.network?.name);
  const expectedNetwork = normalizeNetworkName(networkConfig.aptosNetwork);
  const networkMismatch = Boolean(
    wallet.connected && walletNetwork && walletNetwork !== expectedNetwork
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const space = await createSpace({
        title,
        description,
        visibility,
        priceOctas: visibility === "paid" ? Math.round(Number(priceApt) * 100_000_000) : undefined,
        allowlist: allowlistText
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
        files,
      });
      navigate(`/spaces/${space.id}`);
    } catch (caught) {
      setError(getErrorMessage(caught));
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
            Compose metadata, connect your Aptos wallet, and publish blobs to {networkConfig.label}.
          </p>

          <div className="status-panel">
            <span className="tiny-label">Publishing context</span>
            <strong>{networkConfig.label}</strong>
            <p>{address ? `Wallet ${shortenAddress(address)}` : "Connect a wallet from the header to publish."}</p>
            {networkMismatch && (
              <p className="form-error">
                Wallet reports {wallet.network?.name}. Switch it to {networkConfig.label} before
                publishing.
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
              placeholder="Studio Dispatch"
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is inside this release?"
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
            <label>
              <span>Price in APT</span>
              <input
                min="0.000001"
                step="0.000001"
                type="number"
                value={priceApt}
                onChange={(event) => setPriceApt(event.target.value)}
                placeholder="0.01"
              />
            </label>
          )}

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

          <UploadDropzone files={files} onFilesChange={setFiles} />
          <UploadQueue items={uploadItems} />

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
                onClick={() => retryLastUpload().then((space) => navigate(`/spaces/${space.id}`))}
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
