import { Download } from "lucide-react";
import { formatBytes } from "../../lib/utils/format";
import { getPreviewKind } from "../../lib/utils/files";
import type { Space, SpaceFile } from "../../types/space";

type SpaceFileListProps = {
  space: Space;
  activeFileId?: string | null;
  canDownload?: boolean;
  onDownload?: (space: Space, file: SpaceFile) => void;
};

export function SpaceFileList({
  space,
  activeFileId,
  canDownload = true,
  onDownload,
}: SpaceFileListProps) {
  return (
    <div className="file-table">
      {space.files.map((file) => (
        <article key={file.id} className="file-row">
          <span className="file-icon">{getPreviewKind(file.mimeType)}</span>
          <div>
            <strong>{file.fileName}</strong>
            <p>{file.blobName}</p>
          </div>
          <span>{formatBytes(file.size)}</span>
          {onDownload && (
            <button
              className="icon-button"
              type="button"
              onClick={() => onDownload(space, file)}
              disabled={activeFileId === file.id}
              title={`Download ${file.fileName}`}
            >
              <Download size={18} />
            </button>
          )}
          {!canDownload && <span className="locked-label">Locked</span>}
        </article>
      ))}
    </div>
  );
}
