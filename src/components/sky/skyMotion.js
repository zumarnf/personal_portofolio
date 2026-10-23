/**
 * Motion contract for the theme sky (approved genjutsu-cast thesis, variant B
 * "Angin Musim"). Pure values and math only, so it runs under `node --test` and
 * is shared by the GSAP choreography and the WebGL weather loop.
 *
 * The page colours change inside the 500 ms UI band; the sky is ambient and
 * keeps telling the story behind them without ever blocking input.
 */

/** Seconds, as GSAP expects. Every entrance is longer than its exit. */
export const TIMING = {
  pageFade: 0.4,
  set: { duration: 0.6, delay: 0 },
  rise: { duration: 0.9, delay: 0.15 },
  weatherOut: { duration: 0.5, delay: 0 },
  weatherIn: { duration: 1.2, delay: 0.3 },
};

/**
 * cubic-bezier control points. `rise` is the entrance curve the project already
 * uses for fadeInUp / slideDown in index.css, so new motion lands the same way.
 */
export const CURVES = {
  set: [0.3, 0, 1, 1],
  rise: [0.16, 1, 0.3, 1],
  weatherOut: [0.12, 0, 0.39, 0],
  weatherIn: [0.61, 1, 0.88, 1],
};

/**
 * Body positions in units of the body's own core diameter, relative to its
 * resting spot. Setting and rising share one horizon below that spot.
 */
export const REST = { x: 0, y: 0 };
export const SET_POINT = { x: 0.35, y: 1.25 };
export const RISE_POINT = { x: -0.35, y: 1.25 };
/** A hidden body shrinks only slightly while it fades; never to zero. */
export const HIDDEN_SCALE = 0.96;
/** SVG box (100-unit viewBox, halo included) per unit of core diameter (r = 22). */
export const BODY_BOX_RATIO = 100 / 44;

export const PARTICLES = {
  desktop: { rain: 230, petals: 56 },
  mobile: { rain: 110, petals: 24 },
};

const SCENES = {
  dark: { body: "moon", rain: 1, petals: 0 },
  light: { body: "sun", rain: 0, petals: 1 },
};

export function sceneFor(theme) {
  return { ...(SCENES[theme] ?? SCENES.light) };
}

/**
 * Control point of the quadratic arc a body travels along. A leaving body
 * drifts sideways before it sinks; an arriving body lifts before it settles.
 * The arc always starts from the body's current position, which is what keeps
 * an interrupted transition from jumping.
 */
export function arcControl(from, to, leaving) {
  return leaving ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
}

export function quadraticPoint(from, control, to, t) {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

/** Wind that sweeps the petals away when night falls: 0 → 1 → 0 over `duration`. */
export function gustStrength(elapsed, duration) {
  if (elapsed <= 0 || elapsed >= duration) return 0;
  return Math.sin((Math.PI * elapsed) / duration);
}

/** Breeze that carries the petals back in once the incoming weather starts. */
export function breezeStrength(elapsed, delay, duration) {
  const progress = (elapsed - delay) / duration;
  if (progress < 0 || progress >= 1) return 0;
  return 1 - progress;
}

/**
 * Each particle owns a fixed threshold in [0, 1). Weather intensity decides how
 * many of them are allowed to (re)spawn, so drizzle thickens into rain instead
 * of every drop fading in on the spot.
 */
export function isParticleActive(threshold, intensity) {
  return threshold < intensity;
}

/**
 * Largest core diameter whose whole rise path stays inside the margin beside the
 * content column, `gap` px clear of it. index.css implements the same formula;
 * a body any larger would pass behind text, where only 12% opacity keeps AA.
 */
export function maxFullBodyDiameter(margin, gap = 16) {
  return (margin - 2 * gap) / (1 + 2 * Math.abs(RISE_POINT.x));
}
