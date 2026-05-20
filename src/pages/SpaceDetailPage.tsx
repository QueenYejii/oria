import { AppHeader } from "../components/layout/AppHeader";
import { Link, useParams } from "react-router-dom";
import { SpaceFileList } from "../components/spaces/SpaceFileList";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import { useSpace } from "../hooks/useSpaces";
import { formatDate, shortenAddress } from "../lib/utils/format";

export function SpaceDetailPage() {
  const { spaceId } = useParams();
  const space = useSpace(spaceId);
  const { activeFileId, error, downloadFile } = useDownloadBlob();

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main className="detail-page">
        {space ? (
          <>
            <section className="detail-hero">
              <div>
                <p className="eyebrow">{space.network}</p>
                <h1>{space.title}</h1>
                <p>{space.description || "No description added."}</p>
              </div>
              <aside className="status-panel">
                <span className="tiny-label">Owner</span>
                <strong>{shortenAddress(space.creator)}</strong>
                <p>Published {formatDate(space.createdAt)}</p>
                <p>Expires {formatDate(space.expiresAt)}</p>
                <span className="network-badge experimental">{space.visibility}</span>
              </aside>
            </section>

            <section className="detail-files">
              <div className="section-label">
                <p className="eyebrow">Files</p>
                <h2>{space.files.length} Shelby blobs</h2>
              </div>
              <SpaceFileList
                space={space}
                activeFileId={activeFileId}
                onDownload={downloadFile}
              />
              {error && <p className="form-error">{error}</p>}
            </section>
          </>
        ) : (
          <section className="empty-state">
            <h1>Space not found.</h1>
            <p>This browser has no local metadata for that Space.</p>
            <Link className="button primary" to="/spaces">
              Back to Spaces
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
