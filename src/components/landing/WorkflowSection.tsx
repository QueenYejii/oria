const steps = [
  {
    label: "01",
    title: "Compose",
    body: "Name the Space, add the cover, choose visibility, and validate files locally.",
  },
  {
    label: "02",
    title: "Sign",
    body: "Use Aptos wallet signing only when there is a clear publishing action.",
  },
  {
    label: "03",
    title: "Upload",
    body: "Send blobs through the selected Shelby network with visible progress and retry states.",
  },
  {
    label: "04",
    title: "Release",
    body: "Turn the final metadata into a clean link that feels like a product page.",
  },
];

export function WorkflowSection() {
  return (
    <section className="workflow" id="workflow" aria-label="Publishing workflow">
      <div className="workflow-copy reveal" data-reveal>
        <p className="eyebrow">Publishing rhythm</p>
        <h2>Designed around the moments users actually feel.</h2>
      </div>
      <div className="timeline">
        <span className="timeline-track" aria-hidden="true" />
        {steps.map((step) => (
          <article className="timeline-item reveal" data-reveal key={step.label}>
            <span>{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
