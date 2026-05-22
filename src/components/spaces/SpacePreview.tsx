import { Eye, FileWarning } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useActiveNetwork } from "../../hooks/useActiveNetwork";
import { createShelbyClient } from "../../lib/shelby/client";
import { getPreviewKind } from "../../lib/utils/files";
import { formatBytes } from "../../lib/utils/format";
import type { Space, SpaceFile } from "../../types/space";

const largePreviewThreshold = 35 * 1024 * 1024;

function getPreviewFiles(files: SpaceFile[]) {
  return files.filter(
    (file) =>
      file.mimeType.startsWith("image/") ||
      file.mimeType.startsWith("video/") ||
      file.mimeType.startsWith("audio/") ||
      file.mimeType === "application/pdf" ||
      file.mimeType.includes("json"),
  );
}

function getDefaultPreviewFile(files: SpaceFile[]) {
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
  const previewFiles = useMemo(() => getPreviewFiles(space.files), [space.files]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const defaultPreviewFile = useMemo(() => getDefaultPreviewFile(space.files), [space.files]);
  const previewFile =
    previewFiles.find((file) => file.id === selectedFileId) ?? defaultPreviewFile ?? null;
  const isLargePreview = Boolean(previewFile && previewFile.size > largePreviewThreshold);

  useEffect(() => {
    setSelectedFileId(null);
    setShouldLoad(false);
  }, [space.id]);

  useEffect(() => {
    if (!previewFile || !canPreview || (isLargePreview && !shouldLoad)) {
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
  }, [activeNetwork, canPreview, isLargePreview, previewFile, shouldLoad, space.creator, space.network]);

  if (!previewFile) return null;

  return (
    <section className="preview-panel">
      <div className="preview-header">
        <div className="section-label">
          <p className="eyebrow">Preview</p>
          <h2>{previewFile.fileName}</h2>
        </div>
        <div className="preview-meta">
          <span>{getPreviewKind(previewFile.mimeType)}</span>
          <span>{formatBytes(previewFile.size)}</span>
        </div>
      </div>

      <div className="preview-layout">
        <div className="preview-stage">
          {!canPreview ? (
            <div className="preview-locked">
              <FileWarning size={28} />
              <strong>Unlock this Space to preview its media.</strong>
            </div>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : isLargePreview && !shouldLoad ? (
            <div className="preview-locked">
              <Eye size={28} />
              <strong>Large preview paused.</strong>
              <p>{formatBytes(previewFile.size)} will load only when you request it.</p>
              <button className="button primary" type="button" onClick={() => setShouldLoad(true)}>
                Load preview
              </button>
            </div>
          ) : textPreview ? (
            <pre>{textPreview}</pre>
          ) : objectUrl && previewFile.mimeType.startsWith("image/") ? (
            <img src={objectUrl} alt={previewFile.fileName} loading="lazy" decoding="async" />
          ) : objectUrl && previewFile.mimeType.startsWith("video/") ? (
            <video src={objectUrl} controls preload="metadata" />
          ) : objectUrl && previewFile.mimeType.startsWith("audio/") ? (
            <audio src={objectUrl} controls preload="metadata" />
          ) : objectUrl && previewFile.mimeType === "application/pdf" ? (
            <iframe src={objectUrl} title={previewFile.fileName} loading="lazy" />
          ) : (
            <div className="preview-locked">Loading preview...</div>
          )}
        </div>

        {previewFiles.length > 1 && (
          <div className="preview-rail" aria-label="Previewable files">
            {previewFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                className={file.id === previewFile.id ? "active" : ""}
                onClick={() => {
                  setSelectedFileId(file.id);
                  setShouldLoad(file.size <= largePreviewThreshold);
                }}
              >
                <span>{getPreviewKind(file.mimeType)}</span>
                <strong>{file.fileName}</strong>
                <small>{formatBytes(file.size)}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
