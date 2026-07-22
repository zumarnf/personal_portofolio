import { useRef } from "react";

/**
 * Wraps content so it eases slightly toward the pointer on hover.
 * No-op for touch input and reduced-motion users.
 */
export default function Magnetic({ children, strength = 0.3, className = "" }) {
  const ref = useRef(null);

  const handleMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0, 0)";
  };

  return (
    <span
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={`inline-block transition-transform duration-200 ease-out ${className}`}
    >
      {children}
    </span>
  );
}
