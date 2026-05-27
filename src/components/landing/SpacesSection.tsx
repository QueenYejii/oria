export function SpacesSection() {
  return (
    <>
      <section className="section intro reveal" data-reveal id="spaces">
        <p className="eyebrow">Built as a real publishing surface</p>
        <div className="split-heading">
          <h2>Spaces make Shelby storage feel intentional.</h2>
          <p>
            Each Oria Space bundles files, previews, access context, and network state into
            one polished destination that creators and collectors can understand.
          </p>
        </div>
      </section>

      <section className="space-grid" aria-label="Oria capabilities">
        <article className="feature-panel large reveal" data-reveal>
          <div>
            <span className="panel-kicker">Creator Flow</span>
            <h3>From raw file to shareable release.</h3>
          </div>
          <p>
            Upload queues, signing states, file validation, and publishing status are treated
            as first-class product moments.
          </p>
          <div className="release-stack" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="feature-meter" aria-hidden="true">
            <span />
          </div>
        </article>

        <article className="feature-panel reveal" data-reveal>
          <span className="panel-kicker">Identity</span>
          <h3>Wallet-native, quietly.</h3>
          <p>Wallet connection appears only when it helps users publish, unlock, or manage a Space.</p>
          <div className="mini-stack" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </article>

        <article className="feature-panel reveal" data-reveal>
          <span className="panel-kicker">Preview</span>
          <h3>Readable before download.</h3>
          <p>Images, audio, video, archives, and metadata get their own calm inspection states.</p>
          <div className="preview-tiles" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </article>
      </section>
    </>
  );
}
