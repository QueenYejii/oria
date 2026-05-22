import { Link } from "react-router-dom";
import { formatBytes, formatDate, shortenAddress } from "../../lib/utils/format";
import { getPreviewKind } from "../../lib/utils/files";
import type { Space } from "../../types/space";

export function SpaceCard({ space }: { space: Space }) {
  const totalSize = space.files.reduce((sum, file) => sum + file.size, 0);
  const fileKinds = Array.from(new Set(space.files.map((file) => getPreviewKind(file.mimeType)))).slice(0, 3);
  const heroKind = fileKinds[0] ?? "Space";

  return (
    <Link className="space-card" to={`/spaces/${space.id}`}>
      <div className="space-card-art" aria-hidden="true">
        <span>{heroKind}</span>
        <i />
      </div>
      <div>
        <div className="space-card-kickers">
          <span className="network-badge stable">{space.network}</span>
          <span>{space.visibility.replace("_", " ")}</span>
        </div>
        <h3>{space.title}</h3>
        <p>{space.description || "No description added."}</p>
      </div>

      <div className="space-card-footer">
        <span>{space.files.length} files</span>
        <span>{formatBytes(totalSize)}</span>
        <span>{shortenAddress(space.creator)}</span>
      </div>
      {fileKinds.length > 0 && (
        <div className="space-card-tags">
          {fileKinds.map((kind) => (
            <span key={kind}>{kind}</span>
          ))}
        </div>
      )}
      <small>Published {formatDate(space.createdAt)}</small>
    </Link>
  );
}
