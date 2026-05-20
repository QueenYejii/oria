import type { UploadItem } from "../../types/upload";

export function UploadQueue({ items }: { items: UploadItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="upload-list live">
      {items.map((item) => (
        <article key={item.id} className={`upload-row ${item.status}`}>
          <span className="file-icon">{item.file.name.split(".").pop()?.slice(0, 4) ?? "FILE"}</span>
          <div>
            <strong>{item.file.name}</strong>
            <p>{item.error ?? item.progressLabel}</p>
          </div>
          <span>{item.status}</span>
        </article>
      ))}
    </div>
  );
}
