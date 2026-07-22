import { useCountUp } from "@/hooks/useCountUp";

/** Number that counts up (easing) once scrolled into view. */
export default function Counter({ target, decimals = 0, pad = 0, className = "" }) {
  const [value, ref] = useCountUp(target);
  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : String(Math.round(value)).padStart(pad, "0");

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
