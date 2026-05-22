import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export function useGsapSwap<T extends HTMLElement>(ref: RefObject<T>, key: string | undefined) {
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reducedMotion || !ref.current || !key) return;

    const tween = gsap.fromTo(
      ref.current,
      { autoAlpha: 0, y: 14, scale: 0.99 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: "power4.out", overwrite: "auto" },
    );

    return () => {
      tween.kill();
    };
  }, [key, reducedMotion, ref]);
}
