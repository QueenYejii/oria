import { Link } from "react-router-dom";

const entries = [
  {
    label: "Create",
    title: "Start a Space",
    body: "Compose metadata, choose files, and publish to the active Shelby network.",
    href: "/create",
  },
  {
    label: "Spaces",
    title: "Browse releases",
    body: "View Spaces saved for the selected network and open their published files.",
    href: "/spaces",
  },
  {
    label: "Vault",
    title: "Manage your work",
    body: "Filter Spaces by connected wallet and keep your published work in one place.",
    href: "/vault",
  },
];

export function AppEntrySection() {
  return (
    <section className="app-entry section reveal" data-reveal aria-label="Oria app pages">
      <div className="app-entry-copy">
        <p className="eyebrow">Open the app</p>
        <h2>Every core page is one step away.</h2>
      </div>
      <div className="entry-grid">
        {entries.map((entry) => (
          <Link className="entry-card" key={entry.href} to={entry.href}>
            <span>{entry.label}</span>
            <strong>{entry.title}</strong>
            <p>{entry.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
