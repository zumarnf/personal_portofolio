/**
 * Sun and moon as crisp SVG. Both share one geometry: a 100-unit viewBox with a
 * core of radius 22, so `BODY_BOX_RATIO` in skyMotion.js turns the element's
 * width back into the core diameter the choreography moves in.
 * Colours come from the --sky-* tokens in index.css.
 */

const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6;
  const outer = i % 2 ? 33 : 37;
  return {
    x1: Math.cos(angle) * 28.5,
    y1: Math.sin(angle) * 28.5,
    x2: Math.cos(angle) * outer,
    y2: Math.sin(angle) * outer,
  };
});

const MOON_CRATERS = [
  { cx: 7, cy: -6, r: 4.6 },
  { cx: -8, cy: 5, r: 3.3 },
  { cx: 3, cy: 10.5, r: 2.2 },
  { cx: -4, cy: -11, r: 1.8 },
];

const stop = (token, opacity) => ({
  stopColor: `hsl(var(${token}))`,
  stopOpacity: opacity,
});

export function Sun() {
  return (
    <svg
      viewBox="-50 -50 100 100"
      className="block h-full w-full overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="sky-sun-halo">
          <stop offset="0" style={stop("--sky-sun-halo", 0.45)} />
          <stop offset="0.45" style={stop("--sky-sun-halo", 0.12)} />
          <stop offset="1" style={stop("--sky-sun-halo", 0)} />
        </radialGradient>
        <radialGradient id="sky-sun-core" cx="0.42" cy="0.4" r="0.62">
          <stop offset="0" style={stop("--sky-sun-core", 1)} />
          <stop offset="1" style={stop("--sky-sun", 1)} />
        </radialGradient>
      </defs>
      <circle className="sky-halo" r="50" fill="url(#sky-sun-halo)" />
      <g
        className="sky-rays"
        style={{ stroke: "hsl(var(--sky-sun))" }}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.4"
      >
        {SUN_RAYS.map((ray, i) => (
          <line key={i} {...ray} />
        ))}
      </g>
      <circle r="22" fill="url(#sky-sun-core)" />
    </svg>
  );
}

export function Moon() {
  return (
    <svg
      viewBox="-50 -50 100 100"
      className="block h-full w-full overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="sky-moon-halo">
          <stop offset="0" style={stop("--sky-moon-halo", 0.28)} />
          <stop offset="0.5" style={stop("--sky-moon-halo", 0.08)} />
          <stop offset="1" style={stop("--sky-moon-halo", 0)} />
        </radialGradient>
        <radialGradient id="sky-moon-shade" cx="0.36" cy="0.34" r="0.78">
          <stop offset="0.55" style={stop("--sky-moon-shade", 0)} />
          <stop offset="1" style={stop("--sky-moon-shade", 0.32)} />
        </radialGradient>
      </defs>
      <circle className="sky-halo" r="50" fill="url(#sky-moon-halo)" />
      <circle r="22" style={{ fill: "hsl(var(--sky-moon))" }} />
      <g style={{ fill: "hsl(var(--sky-moon-crater))" }} opacity="0.55">
        {MOON_CRATERS.map((crater, i) => (
          <circle key={i} {...crater} />
        ))}
      </g>
      <circle r="22" fill="url(#sky-moon-shade)" />
    </svg>
  );
}
