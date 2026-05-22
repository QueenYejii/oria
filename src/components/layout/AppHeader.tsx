import { Link, NavLink } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletConnect } from "./WalletConnect";
import { getAccountAddress } from "../../lib/wallet/address";

export function AppHeader() {
  const wallet = useWallet();
  const address = getAccountAddress(wallet.account);
  const profileHref = address ? `/u/${address}` : "/vault";

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Oria home">
        <span className="brand-mark">
          <img src="/brand/oria-mark.svg" alt="" />
        </span>
        <span>Oria</span>
      </Link>

      <nav className="nav-links" aria-label="Primary navigation">
        <NavLink to="/create">Create</NavLink>
        <NavLink to="/spaces">Discover</NavLink>
        <NavLink to={profileHref}>Profile</NavLink>
        <NavLink to="/payments">Payments</NavLink>
        <NavLink className="nav-vault-mobile" to="/vault">
          Vault
        </NavLink>
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
