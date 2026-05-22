import { useEffect } from "react";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export function useGsapLandingMotion() {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      document.querySelectorAll<HTMLElement>("[data-reveal], [data-hero-motion]").forEach((node) => {
        node.classList.add("visible");
        node.style.opacity = "1";
        node.style.transform = "none";
      });
      return;
    }

    const context = gsap.context(() => {
      const header = document.querySelector(".site-header");
      const heroCopy = gsap.utils.toArray<HTMLElement>(".hero-copy > *");
      const heroStage = document.querySelector(".hero-stage");
      const stageChildren = gsap.utils.toArray<HTMLElement>(
        ".hero-stage .stage-topbar, .hero-stage .stage-insight, .hero-stage .drop-zone, .hero-stage .upload-row, .hero-stage .stage-footer",
      );

      const timeline = gsap.timeline({ defaults: { ease: "power4.out" } });

      if (stageChildren.length) {
        gsap.set(stageChildren, { autoAlpha: 1, clearProps: "visibility,opacity" });
      }

      if (header) {
        timeline.from(header, { y: -22, autoAlpha: 0, duration: 0.62 });
      }

      if (heroCopy.length) {
        timeline.from(heroCopy, { y: 28, autoAlpha: 0, duration: 0.72, stagger: 0.075 }, "-=0.26");
      }

      if (heroStage) {
        timeline.fromTo(
          heroStage,
          { y: 36, scale: 0.975, autoAlpha: 0 },
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.82,
            clearProps: "transform,opacity,visibility",
          },
          "-=0.56",
        );
      }

      if (stageChildren.length) {
        timeline.fromTo(
          stageChildren,
          { y: 14 },
          {
            y: 0,
            duration: 0.42,
            stagger: 0.045,
            clearProps: "transform,opacity,visibility",
          },
          "-=0.48",
        );
      }

      const revealTargets = gsap.utils.toArray<HTMLElement>("[data-reveal]").filter(
        (target) => !target.closest(".hero") && !target.classList.contains("visible"),
      );
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const target = entry.target as HTMLElement;
            target.classList.add("visible");
            gsap.fromTo(
              target,
              { y: 28, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.72, ease: "power4.out", overwrite: "auto" },
            );
            observer.unobserve(target);
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.16 },
      );

      revealTargets.forEach((target) => observer.observe(target));

      return () => observer.disconnect();
    });

    return () => context.revert();
  }, [reducedMotion]);
}
