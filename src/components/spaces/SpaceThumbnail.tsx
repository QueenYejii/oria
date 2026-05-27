import { Image, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createShelbyClient } from "../../lib/shelby/client";
import { getPreviewKind } from "../../lib/utils/files";
import type { Space, SpaceFile } from "../../types/space";

const thumbnailSizeLimit = 8 * 1024 * 1024;
const thumbnailUrlCache = new Map<string, string>();

function getThumbnailFile(space: Space): SpaceFile | null {
  if (
    space.thumbnailBlobName &&
    space.thumbnailFileName &&
    space.thumbnailMimeType &&
    typeof space.thumbnailSize === "number"
  ) {
    return {
      id: "public-cover",
      blobName: space.thumbnailBlobName,
      fileName: space.thumbnailFileName,
      mimeType: space.thumbnailMimeType,
      size: space.thumbnailSize,
    };
  }

  const byBlobName = space.thumbnailBlobName
    ? space.files.find((file) => file.blobName === space.thumbnailBlobName)
    : undefined;

  return byBlobName ?? space.files.find((file) => file.mimeType.startsWith("image/")) ?? null;
}

export function SpaceThumbnail({ space }: { space: Space }) {
  const file = useMemo(() => getThumbnailFile(space), [space]);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const fallbackKind = getPreviewKind(space.files[0]?.mimeType ?? "");
  const isPrivatePreview = space.visibility !== "public" && !space.thumbnailIsPublic;
  const privateLabel = space.visibility === "paid" ? "Paid preview" : "Wallet gated";
  const fallbackLabel =
    status === "loading"
      ? "Loading preview"
      : isPrivatePreview
        ? privateLabel
        : status === "failed"
          ? "Preview unavailable"
          : fallbackKind;

  useEffect(() => {
    if (!file || !file.mimeType.startsWith("image/") || file.size > thumbnailSizeLimit) {
      setObjectUrl(null);
      setStatus("idle");
      return;
    }

    const thumbnailFile = file;
    const cacheKey = `${space.network}:${space.creator}:${thumbnailFile.blobName}`;
    let cancelled = false;

    async function loadThumbnail() {
      setStatus("loading");
      setObjectUrl(null);

      const cachedUrl = thumbnailUrlCache.get(cacheKey);
      if (cachedUrl) {
        setObjectUrl(cachedUrl);
        setStatus("ready");
        return;
      }

      try {
        const client = createShelbyClient(space.network);
        const shelbyBlob = await client.rpc.getBlob({
          account: space.creator,
          blobName: thumbnailFile.blobName,
        });
        const blob = await new Response(shelbyBlob.readable).blob();
        const nextObjectUrl = URL.createObjectURL(blob);
        thumbnailUrlCache.set(cacheKey, nextObjectUrl);

        if (!cancelled) {
          setObjectUrl(nextObjectUrl);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    loadThumbnail();

    return () => {
      cancelled = true;
    };
  }, [file, space.creator, space.network]);

  return (
    <div
      className={`space-card-art ${objectUrl ? "has-thumbnail" : ""} ${isPrivatePreview ? "private-thumbnail" : ""}`}
      aria-hidden="true"
    >
      {objectUrl ? (
        <img src={objectUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <>
          <span>{fallbackLabel}</span>
          {isPrivatePreview ? <LockKeyhole size={18} /> : <Image size={18} />}
          <i />
        </>
      )}
      {isPrivatePreview && (
        <div className="private-thumbnail-shield">
          <span>{privateLabel}</span>
          <strong>Private</strong>
        </div>
      )}
    </div>
  );
}
