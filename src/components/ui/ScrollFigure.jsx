import { useEffect, useRef } from "react";
import RainFigure from "@/components/ui/RainFigure";

/**
 * Corner mascot driven by scroll. Scrolling down drops it in and lands it in
 * the corner with a subtle spring bounce; scrolling up makes it crouch, as if
 * the ground beneath it rises. Only transform/opacity animate (GPU), written
 * directly on the element. Static for reduced-motion users.
 */
export default function ScrollFigure() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      el.style.transform = "translateY(0) scaleY(1)";
      el.style.opacity = "0.5";
      return;
    }

    const HIDDEN_Y = -220; // parked above the corner, out of view
    let currentY = HIDDEN_Y;
    let velY = 0;
    let crouch = 0;
    let scrollVel = 0;
    let lastScrollY = window.scrollY;
    let raf = null;

    const onScroll = () => {
      const y = window.scrollY;
      scrollVel = y - lastScrollY;
      lastScrollY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const visible = window.scrollY > 120;
      const targetY = visible ? 0 : HIDDEN_Y;

      // Spring toward target — slight overshoot reads as a landing bounce.
      velY += (targetY - currentY) * 0.09;
      velY *= 0.78;
      currentY += velY;

      // Crouch while scrolling up, as if the ground rises under it.
      const targetCrouch = scrollVel < -0.5 ? Math.min(-scrollVel * 0.05, 1) : 0;
      crouch += (targetCrouch - crouch) * 0.15;
      scrollVel *= 0.85;

      const scaleY = 1 - crouch * 0.22;
      const ty = currentY - crouch * 12;
      el.style.transform = `translateY(${ty.toFixed(2)}px) scaleY(${scaleY.toFixed(3)})`;
      el.style.opacity = (
        Math.max(0, Math.min(1, (currentY + 180) / 180)) * 0.55
      ).toFixed(3);
    };
    loop();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-20 hidden sm:bottom-6 sm:right-8 sm:block"
      aria-hidden="true"
    >
      <div
        ref={ref}
        style={{ transformOrigin: "bottom center", willChange: "transform" }}
      >
        <RainFigure className="h-28 text-muted-foreground sm:h-32" />
      </div>
    </div>
  );
}
