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

  return (
    <div className="upload-list live">
      <div className="upload-list-header">
        <span>Upload queue</span>
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
          </div>
          <span>{statusLabels[item.status]}</span>
        </article>
      ))}
    </div>
  );
}
