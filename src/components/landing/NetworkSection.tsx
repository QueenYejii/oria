import { shelbyNetworks } from "../../config/networks";

export function NetworkSection() {
  return (
    <section className="section network-section reveal" data-reveal id="network">
      <div>
        <p className="eyebrow">Network ready from day one</p>
        <h2>One interface for the active Shelby network.</h2>
      </div>

      <div className="network-board">
        {Object.values(shelbyNetworks)
          .filter((network) => network.available)
          .map((network) => (
            <article key={network.id}>
              <span className="network-badge experimental">{network.mode}</span>
              <h3>{network.label}</h3>
              <p>{network.description}</p>
              <div className="network-meta" aria-label={`${network.label} stack`}>
                <span>Aptos {network.mode}</span>
                <span>Shelby RPC</span>
              </div>
              <code>{network.shelbyRpcUrl}</code>
              <span className="network-line" aria-hidden="true" />
            </article>
          ))}
      </div>
    </section>
  );
}
