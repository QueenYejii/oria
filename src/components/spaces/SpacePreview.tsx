import { useEffect, useMemo, useState } from "react";
import { useActiveNetwork } from "../../hooks/useActiveNetwork";
import { createShelbyClient } from "../../lib/shelby/client";
import type { Space, SpaceFile } from "../../types/space";

function getPreviewFile(files: SpaceFile[]) {
  return (
    files.find((file) => file.mimeType.startsWith("image/")) ??
    files.find((file) => file.mimeType.startsWith("video/")) ??
    files.find((file) => file.mimeType.startsWith("audio/")) ??
    files.find((file) => file.mimeType === "application/pdf") ??
    files.find((file) => file.mimeType.includes("json")) ??
    null
  );
}

export function SpacePreview({ space, canPreview }: { space: Space; canPreview: boolean }) {
  const { activeNetwork } = useActiveNetwork();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewFile = useMemo(() => getPreviewFile(space.files), [space.files]);

  useEffect(() => {
    if (!previewFile || !canPreview) {
      setObjectUrl(null);
      setTextPreview(null);
      return;
    }

    let cancelled = false;
    let nextObjectUrl: string | null = null;
    const file = previewFile;

    async function loadPreview() {
      setError(null);
      setTextPreview(null);
      setObjectUrl(null);

      try {
        const client = createShelbyClient(space.network || activeNetwork);
        const shelbyBlob = await client.rpc.getBlob({
          account: space.creator,
          blobName: file.blobName,
        });
        const blob = await new Response(shelbyBlob.readable).blob();

        if (file.mimeType.includes("json")) {
          const text = await blob.text();
          if (!cancelled) setTextPreview(text.slice(0, 4000));
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        if (!cancelled) setObjectUrl(nextObjectUrl);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load preview.");
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [activeNetwork, canPreview, previewFile, space.creator, space.network]);

  if (!previewFile) return null;

  return (
    <section className="preview-panel">
      <div className="section-label">
        <p className="eyebrow">Preview</p>
        <h2>{previewFile.fileName}</h2>
      </div>

      {!canPreview ? (
        <div className="preview-locked">Unlock this Space to preview its media.</div>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : textPreview ? (
        <pre>{textPreview}</pre>
      ) : objectUrl && previewFile.mimeType.startsWith("image/") ? (
        <img src={objectUrl} alt={previewFile.fileName} />
      ) : objectUrl && previewFile.mimeType.startsWith("video/") ? (
        <video src={objectUrl} controls />
      ) : objectUrl && previewFile.mimeType.startsWith("audio/") ? (
        <audio src={objectUrl} controls />
      ) : objectUrl && previewFile.mimeType === "application/pdf" ? (
        <iframe src={objectUrl} title={previewFile.fileName} />
      ) : (
        <div className="preview-locked">Loading preview...</div>
      )}
    </section>
  );
}
