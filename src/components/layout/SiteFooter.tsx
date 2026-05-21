import { Github, MessageCircle, Send, Twitter } from "lucide-react";

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/QueenYejii/oria",
    icon: Github,
  },
  {
    label: "Telegram",
    href: "https://t.me/QueenYejii24",
    icon: Send,
  },
  {
    label: "X",
    href: "https://x.com/QueenYejii24",
    icon: Twitter,
  },
  {
    label: "Discord",
    href: "https://discord.com/invite/shelbyserves",
    icon: MessageCircle,
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <span className="footer-brand-lockup">
            <span className="footer-brand-mark">
              <img src="/brand/oria-mark.svg" alt="" />
            </span>
            <span>Oria</span>
          </span>
          <p>
            A polished publishing layer for Shelby-backed spaces, creator archives,
            large media drops, and Aptos-native access flows.
          </p>
        </div>

        <nav className="footer-socials" aria-label="Oria social links">
          {socialLinks.map(({ label, href, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
              <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Oria. All rights reserved.</span>
        <span>
          Built by{" "}
          <a href="https://x.com/QueenYejii24" target="_blank" rel="noreferrer">
            QueenYejii
          </a>{" "}
          for the Shelby community.
        </span>
      </div>
    </footer>
  );
}
