import { EYE_RADIUS, EYES, FROG_ART, MOUTH } from "@/components/sky/frogMotion";

/**
 * The hero frog and its butterfly as SVG. Class names are the hooks
 * HeroFrog.jsx animates; eye and mouth positions come from frogMotion.js so
 * the drawing and the choreography cannot drift apart.
 * Colours come from the --critter-* tokens in index.css.
 */

const paint = (token) => ({ fill: `hsl(var(${token}))` });
const line = (token) => ({ stroke: `hsl(var(${token}))` });

export function FrogArt() {
  return (
    <svg
      viewBox={`0 0 ${FROG_ART.width} ${FROG_ART.height}`}
      className="block h-auto w-full overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      {/* Raindrop the frog catches at night; it falls outside the body group. */}
      <g className="frog-drop" opacity="0">
        <path
          d="M0 -4 C2.4 -0.6 3 1.2 3 2.4 A3 3 0 0 1 -3 2.4 C-3 1.2 -2.4 -0.6 0 -4 Z"
          style={paint("--critter-drop")}
          opacity="0.9"
        />
      </g>

      <g className="frog-body">
        <ellipse cx="15" cy="49" rx="5.5" ry="2.3" style={paint("--critter-frog-shade")} />
        <ellipse cx="45" cy="49" rx="5.5" ry="2.3" style={paint("--critter-frog-shade")} />
        <path
          d="M8 49.5 C6 37 16 27.5 30 27.5 C44 27.5 54 37 52 49.5 Z"
          style={paint("--critter-frog")}
        />
        <ellipse cx="30" cy="45" rx="13.5" ry="5.2" style={paint("--critter-belly")} />
        {/* Two layers so breathing and the gulp after a catch never fight over one transform */}
        <g className="frog-gulp">
          <ellipse
            className="frog-throat"
            cx="30"
            cy="41"
            rx="7.5"
            ry="3.8"
            style={paint("--critter-belly")}
          />
        </g>

        {EYES.map((eye) => (
          <g key={eye.x}>
            <circle cx={eye.x} cy={eye.y + 0.5} r={EYE_RADIUS} style={paint("--critter-frog")} />
            <g className="frog-eyeball">
              <circle cx={eye.x} cy={eye.y} r="5.4" style={paint("--critter-eye")} />
              <g className="frog-pupil">
                <circle cx={eye.x} cy={eye.y} r="2.7" style={paint("--critter-ink")} />
                <circle cx={eye.x - 1} cy={eye.y - 1.2} r="0.85" style={paint("--critter-eye")} />
              </g>
            </g>
          </g>
        ))}

        <path
          d="M20 35.5 Q30 41 40 35.5"
          style={line("--critter-frog-shade")}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="15.5" cy="35" rx="2.7" ry="1.5" style={paint("--critter-blush")} opacity="0.75" />
        <ellipse cx="44.5" cy="35" rx="2.7" ry="1.5" style={paint("--critter-blush")} opacity="0.75" />
        <line
          className="frog-tongue"
          x1={MOUTH.x}
          y1={MOUTH.y}
          x2={MOUTH.x}
          y2={MOUTH.y}
          style={line("--critter-tongue")}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function ButterflyArt() {
  return (
    <svg
      viewBox="0 0 28 22"
      className="block h-auto w-full overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      <g className="butterfly-tilt">
        <g className="butterfly-wing-l">
          <path d="M14 11 C10 2 2.5 1 2.6 7 C2.8 10.2 8 11.2 14 11 Z" style={paint("--critter-wing")} />
          <path
            d="M14 11 C9 12.2 4.4 15.4 6.2 18.6 C8 20.6 12 16.4 14 11 Z"
            style={paint("--critter-wing-edge")}
          />
        </g>
        <g className="butterfly-wing-r">
          <path d="M14 11 C18 2 25.5 1 25.4 7 C25.2 10.2 20 11.2 14 11 Z" style={paint("--critter-wing")} />
          <path
            d="M14 11 C19 12.2 23.6 15.4 21.8 18.6 C20 20.6 16 16.4 14 11 Z"
            style={paint("--critter-wing-edge")}
          />
        </g>
        <path d="M14 6.6 L14 16.6" style={line("--critter-ink")} strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M14 7 C13 4.6 11.6 3.6 10.6 3.2 M14 7 C15 4.6 16.4 3.6 17.4 3.2"
          style={line("--critter-ink")}
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
