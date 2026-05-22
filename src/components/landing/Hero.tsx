import { Link } from "react-router-dom";
import { ProductPreview } from "./ProductPreview";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="hero-copy reveal" data-reveal>
        <p className="eyebrow">Built first for Shelbynet</p>
        <h1>Publish heavy digital work with a lighter touch.</h1>
        <p className="hero-lede">
          Oria turns large media, bundles, and datasets into clean shareable spaces.
          Creators keep the experience simple while Shelby handles the storage layer.
        </p>

        <div className="hero-actions">
          <Link className="button primary" to="/create">
            Create a Space
          </Link>
          <a className="button secondary" href="#network">
            View Networks
          </a>
        </div>

        <div className="hero-proof" aria-label="Oria launch metrics">
          <span>
            <strong>2</strong>
            Shelby networks live
          </span>
          <span>
            <strong>30d</strong>
            default retention
          </span>
          <span>
            <strong>0</strong>
            product clutter
          </span>
        </div>

        <div className="hero-note" aria-label="Oria network posture">
          <span />
          <p>Shelby upload, Aptos signing, and release metadata are designed as one calm flow.</p>
        </div>
      </div>

      <ProductPreview />
    </section>
  );
}
