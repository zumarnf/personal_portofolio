/**
 * Monochrome line-art figure holding an umbrella, standing pensively in the
 * rain. Uses currentColor for stroke, so color follows the surrounding text
 * color. Idle sway/bob is driven by CSS (see .rain-figure in index.css).
 */
export default function RainFigure({ className = "" }) {
  return (
    <svg
      viewBox="0 0 140 168"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`rain-figure ${className}`}
      aria-hidden="true"
    >
      <g className="rain-figure__umbrella">
        {/* Canopy */}
        <path d="M22 50 Q70 8 118 50" />
        <path d="M22 50 Q31 43 40 50 Q49 43 58 50 Q66 44 70 50 Q74 44 82 50 Q91 43 100 50 Q109 43 118 50" />
        <line x1="70" y1="12" x2="70" y2="6" />
        {/* Ribs */}
        <line x1="70" y1="12" x2="22" y2="50" />
        <line x1="70" y1="12" x2="46" y2="48" />
        <line x1="70" y1="12" x2="94" y2="48" />
        <line x1="70" y1="12" x2="118" y2="50" />
        {/* Pole */}
        <line x1="70" y1="12" x2="74" y2="104" />
      </g>

      {/* Person */}
      <circle cx="62" cy="80" r="8" />
      <path d="M62 88 L62 126" />
      <path d="M62 98 L74 104" />
      <path d="M62 98 L53 116" />
      <path d="M62 126 L53 156" />
      <path d="M62 126 L71 156" />
    </svg>
  );
}
