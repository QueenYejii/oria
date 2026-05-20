import { AppHeader } from "../components/layout/AppHeader";
import { AppEntrySection } from "../components/landing/AppEntrySection";
import { Hero } from "../components/landing/Hero";
import { NetworkSection } from "../components/landing/NetworkSection";
import { SpacesSection } from "../components/landing/SpacesSection";
import { WorkflowSection } from "../components/landing/WorkflowSection";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";

export function LandingPage() {
  useRevealOnScroll();

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AppHeader />
      <main id="top">
        <Hero />
        <AppEntrySection />
        <SpacesSection />
        <NetworkSection />
        <WorkflowSection />
      </main>
      <footer className="site-footer">
        <span>Oria</span>
        <p>Large-file publishing for Shelby-powered spaces.</p>
      </footer>
    </>
  );
}
