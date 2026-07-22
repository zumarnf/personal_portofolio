/**
 * Articulated monochrome figure. Stable sf-* hooks let the motion controller
 * move joints independently while the platform keeps a fixed contact plane.
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
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <g className="sf-platform" opacity="0.72">
        <path d="M40 161 H84" />
        <path d="M47 165 H79" opacity="0.28" />
      </g>

      <g className="sf-actor">
        <g className="sf-umbrella">
          <path d="M22 50 Q70 8 118 50" />
          <path d="M22 50 Q31 43 40 50 Q49 43 58 50 Q66 44 70 50 Q74 44 82 50 Q91 43 100 50 Q109 43 118 50" />
          <line x1="70" y1="12" x2="70" y2="6" />
          <line x1="70" y1="12" x2="22" y2="50" />
          <line x1="70" y1="12" x2="46" y2="48" />
          <line x1="70" y1="12" x2="94" y2="48" />
          <line x1="70" y1="12" x2="118" y2="50" />
          <line x1="70" y1="12" x2="74" y2="104" />
        </g>

        <g className="sf-body">
          <g className="sf-upper">
            <circle className="sf-head" cx="62" cy="80" r="8" />
            <path className="sf-torso" d="M62 88 L62 126" />
            <path className="sf-arm-r" d="M62 98 L74 104" />
            <path className="sf-arm-l" d="M62 98 L53 116" />
          </g>

          <g className="sf-thigh-l">
            <path d="M62 126 L55 141" />
            <g className="sf-shin-l">
              <path d="M55 141 L51 160" />
              <path d="M51 160 H45" />
            </g>
          </g>

          <g className="sf-thigh-r">
            <path d="M62 126 L69 141" />
            <g className="sf-shin-r">
              <path d="M69 141 L74 160" />
              <path d="M74 160 H80" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
