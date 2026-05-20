import { Link } from "react-router-dom";
import { formatBytes, formatDate, shortenAddress } from "../../lib/utils/format";
import type { Space } from "../../types/space";

export function SpaceCard({ space }: { space: Space }) {
  const totalSize = space.files.reduce((sum, file) => sum + file.size, 0);

  return (
    <Link className="space-card" to={`/spaces/${space.id}`}>
      <div>
        <span className="network-badge stable">{space.network}</span>
        <h3>{space.title}</h3>
        <p>{space.description || "No description added."}</p>
      </div>

      <div className="space-card-footer">
        <span>{space.files.length} files</span>
        <span>{formatBytes(totalSize)}</span>
        <span>{shortenAddress(space.creator)}</span>
      </div>
      <small>Published {formatDate(space.createdAt)}</small>
    </Link>
  );
}
