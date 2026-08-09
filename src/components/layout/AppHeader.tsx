import { Link, NavLink } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { WalletConnect } from "./WalletConnect";
import { getAccountAddress } from "../../lib/wallet/address";
import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "oria-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export function AppHeader() {
  const wallet = useWallet();
  const address = getAccountAddress(wallet.account);
  const profileHref = address ? `/u/${address}` : "/vault";
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const isDark = theme === "dark";

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 18);

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }, [theme]);

  return (
    <header className={`site-header ${isScrolled ? "scrolled" : ""}`}>
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
        <NavLink to="/sales">Sales</NavLink>
        <NavLink to="/payments">Receipts</NavLink>
        <NavLink className="nav-vault-mobile" to="/vault">
          Vault
        </NavLink>
      </nav>

      <div className="header-tools">
        <button
          className="theme-toggle"
          type="button"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={isDark}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? (
            <Sun size={16} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Moon size={16} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
        <NetworkSwitcher />
        <Link className="vault-link" to="/vault">
          Vault
        </Link>
        <WalletConnect />
      </div>
    </header>
  );
}
