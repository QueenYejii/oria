const uploadRows = [
  {
    type: "MP4",
    name: "feature-cut.mp4",
    status: "Encoded and registered",
    progress: "100%",
    state: "complete",
  },
  {
    type: "ZIP",
    name: "creator-pack.zip",
    status: "Uploading to Shelby RPC",
    progress: "72%",
    state: "active",
  },
  {
    type: "PNG",
    name: "release-cover.png",
    status: "Waiting for signature",
    progress: "Queued",
    state: "",
  },
];

export function ProductPreview() {
  return (
    <div className="hero-stage reveal" data-reveal aria-label="Oria product preview">
      <div className="stage-satellite satellite-one">Shelby RPC</div>
      <div className="stage-satellite satellite-two">Aptos signer</div>
      <div className="stage-shell">
        <div className="stage-sheen" aria-hidden="true" />
        <div className="stage-topbar">
          <div>
            <span className="tiny-label">Current Space</span>
            <strong>Release Room</strong>
          </div>
          <div className="stage-actions" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="status-dot">Live</span>
        </div>

        <div className="stage-insight" aria-label="Space state">
          <span>
            Network
            <strong>Shelbynet</strong>
          </span>
          <span>
            Owner
            <strong>0xoria...8f2</strong>
          </span>
          <span>
            Release
            <strong>Version 02</strong>
          </span>
        </div>

        <div className="drop-zone">
          <div className="drop-orbit" aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="drop-sigil">O</div>
          <div>
            <h2>Prepare release</h2>
            <p>Video, audio, archives, previews, or datasets up to large-blob scale.</p>
          </div>
          <div className="drop-meter" aria-hidden="true">
            <span />
          </div>
        </div>

        <div className="upload-list" aria-label="Upload progress preview">
          {uploadRows.map((row) => (
            <article key={row.name} className={`upload-row ${row.state}`}>
              <span className="file-icon">{row.type}</span>
              <div>
                <strong>{row.name}</strong>
                <p>{row.status}</p>
              </div>
              <span>{row.progress}</span>
            </article>
          ))}
        </div>

        <div className="stage-footer">
          <span>Signed upload request</span>
          <strong>Queued for Shelby RPC</strong>
        </div>

        <div className="stage-proofline" aria-hidden="true">
          <span />
          <strong>Receipt mirror ready after purchase</strong>
        </div>
      </div>
    </div>
  );
}
