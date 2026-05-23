import { Square } from "lucide-react";
import type { UploadItem } from "../../types/upload";

const statusLabels: Record<UploadItem["status"], string> = {
  queued: "Queued",
  reading: "Preparing",
  ready: "Ready",
  signing: "Wallet",
  uploading: "Uploading",
  indexing: "Indexing",
  published: "Live",
  failed: "Needs attention",
  cancelled: "Cancelled",
};

export function UploadQueue({ items, onCancel }: { items: UploadItem[]; onCancel?: () => void }) {
  if (items.length === 0) return null;
  const canCancel = Boolean(onCancel && items.some((item) => !["published", "failed", "cancelled"].includes(item.status)));
  const finished = items.filter((item) => item.status === "published").length;
  const averageProgress = Math.round(
    items.reduce((sum, item) => sum + (item.progress ?? (item.status === "published" ? 100 : 0)), 0) / items.length,
  );

  return (
    <div className="upload-list live">
      <div className="upload-list-header">
        <span>
          Upload queue - {finished}/{items.length} files - {averageProgress}%
        </span>
        {canCancel && (
          <button type="button" onClick={onCancel}>
            <Square size={14} aria-hidden="true" />
            Cancel
          </button>
        )}
      </div>
      {items.map((item) => (
        <article key={item.id} className={`upload-row ${item.status}`}>
          <span className="file-icon">{item.file.name.split(".").pop()?.slice(0, 4) ?? "FILE"}</span>
          <div>
            <strong>{item.file.name}</strong>
            <p>{item.error ?? item.progressLabel}</p>
            {typeof item.progress === "number" && (
              <span className="upload-progress" aria-label={`${item.file.name} progress ${item.progress}%`}>
                <span style={{ inlineSize: `${Math.min(Math.max(item.progress, 0), 100)}%` }} />
              </span>
            )}
          </div>
          <span>{statusLabels[item.status]}</span>
        </article>
      ))}
    </div>
  );
}
