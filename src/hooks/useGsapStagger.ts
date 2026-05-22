import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export function useGsapStagger<T extends HTMLElement>(
  ref: RefObject<T>,
  dependencies: unknown[],
  itemSelector: string,
) {
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reducedMotion || !ref.current) return;

    const items = gsap.utils.toArray<HTMLElement>(ref.current.querySelectorAll(itemSelector));
    if (!items.length) return;

    const tween = gsap.fromTo(
      items,
      { y: 18, autoAlpha: 0, scale: 0.985 },
      {
        y: 0,
        autoAlpha: 1,
        scale: 1,
        duration: 0.42,
        stagger: { each: 0.045, from: "start" },
        ease: "power4.out",
        overwrite: "auto",
      },
    );

    return () => {
      tween.kill();
    };
  }, [ref, reducedMotion, itemSelector, ...dependencies]);
}
