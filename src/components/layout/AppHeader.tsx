import { Link, NavLink } from "react-router-dom";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletConnect } from "./WalletConnect";

export function AppHeader() {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Oria home">
        <span className="brand-mark">
          <img src="/brand/oria-logo.png" alt="" />
        </span>
        <span>Oria</span>
      </Link>

      <nav className="nav-links" aria-label="Primary navigation">
        <NavLink to="/create">Create</NavLink>
        <NavLink to="/spaces">Spaces</NavLink>
        <NavLink className="nav-vault-mobile" to="/vault">
          Vault
        </NavLink>
        <a href="/#network">Network</a>
        <a href="/#workflow">Workflow</a>
      </nav>

      <div className="header-tools">
        <NetworkSwitcher />
        <Link className="vault-link" to="/vault">
          Vault
        </Link>
        <WalletConnect />
      </div>
    </header>
  );
}
