/**
 * Motion contract for the hero frog (approved genjutsu-cast thesis, variant B
 * "Si Kodok"). Pure values and geometry only, so it runs under `node --test`.
 *
 * The frog lives in the hero, perched on the stats card, in space that never
 * holds text — which is why, unlike the sun and moon, it can be fully opaque.
 */

/** SVG viewBox of the frog and the y of the line its feet rest on. */
export const FROG_ART = { width: 64, height: 56, perchY: 50 };
export const EYES = [
  { x: 21, y: 24.5 },
  { x: 39, y: 24.5 },
];
/** Radius of the green bump around each eye; the tongue must never cross it. */
export const EYE_RADIUS = 7.6;
export const MOUTH = { x: 24, y: 37 };
/** How far a pupil may move from the centre of its eye, in SVG units. */
export const PUPIL_TRAVEL = 1.7;
export const TONGUE_REACH = 24;
/**
 * At night a raindrop falls beside the head and the tongue flicks out
 * sideways to catch it, the way a frog catches a fly.
 */
export const RAINDROP = { from: { x: 4, y: -30 }, catchAt: { x: 4, y: 28 } };

/** Seconds, as GSAP expects. */
export const FROG_TIMING = {
  // The stats card fades in 0.3 s late over 0.7 s (index.css); the frog follows it.
  entrance: { after: 1, duration: 0.6 },
  blink: { close: 0.07, open: 0.09, every: [2.5, 6] },
  // Half a breath: the throat swells, then the yoyo empties it.
  throat: { night: 0.5, day: 0.65 },
  action: { night: [5, 8], day: [5, 9] },
  // How often the eyes re-aim at the butterfly.
  follow: 0.15,
  // Looking up at the rain (stretch + settle) / shaking the water off.
  reaction: { night: 0.5, day: 0.44 },
  hop: { squash: 0.08, rise: 0.14, fall: 0.14, land: 0.08, settle: 0.16 },
};

/** Squash & stretch: the only bounce on the page, and never past 10 %. */
export const SQUASH = { landY: 0.92, landX: 1.05, stretchY: 1.06, stretchX: 0.97 };

/** Speeds in px/s, durations in seconds. Leaving is quicker than arriving. */
export const BUTTERFLY = { speed: [40, 55], flap: 0.13, dart: 140, enter: 0.9, exit: 0.5 };

/**
 * Gaps in px between the butterfly's band and the things it must not cover.
 * `span` keeps it within reach of the frog on wide screens.
 */
export const ZONE = { gap: 14, floor: 16, minimum: 24, perchInset: 12, span: 240 };

export function pupilOffset(eye, target, travel = PUPIL_TRAVEL) {
  const dx = target.x - eye.x;
  const dy = target.y - eye.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, y: 0 };
  const k = Math.min(travel, distance) / distance;
  return { x: dx * k, y: dy * k };
}

export function tongueTip(target, { from = MOUTH, reach = TONGUE_REACH } = {}) {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= reach) return { x: target.x, y: target.y };
  return { x: from.x + (dx / distance) * reach, y: from.y + (dy / distance) * reach };
}

function distanceToSegment(point, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
}

/**
 * A tongue drawn across an eye reads as a stick on the frog's face, so a
 * catch is only attempted along a path that keeps `margin` clear of both eyes.
 */
export function tongueClearsEyes(tip, { from = MOUTH, margin = 1 } = {}) {
  return EYES.every((eye) => distanceToSegment(eye, from, tip) >= EYE_RADIUS + margin);
}

/**
 * A raindrop falls for `fall` seconds and ends exactly where the tongue meets
 * it, so the tongue leaves `tongueOut` seconds before the drop lands.
 */
export function catchTiming({ fall = 0.48, tongueOut = 0.08, tongueBack = 0.12 } = {}) {
  return { tongueAt: fall - tongueOut, caughtAt: fall, tongueOut, tongueBack };
}

/**
 * The band the butterfly may fly in, in the hero's own coordinates: right of
 * the widest button (and within `ZONE.span` of the frog), from the buttons'
 * top down to just above the stats card. Returns null when that band is too
 * small to fly in.
 */
export function flightZone({
  buttonsRight,
  buttonsTop,
  statsTop,
  right,
  frogLeft = Number.NEGATIVE_INFINITY,
}) {
  const zone = {
    x0: Math.max(buttonsRight + ZONE.gap, frogLeft - ZONE.span),
    x1: right - ZONE.gap,
    y0: buttonsTop - ZONE.gap,
    y1: statsTop - ZONE.floor,
  };
  const isTooSmall =
    zone.x1 - zone.x0 < ZONE.minimum || zone.y1 - zone.y0 < ZONE.minimum;
  return isTooSmall ? null : zone;
}

/** Where to place a frog `width` px wide so its feet rest on the card's top edge. */
export function perch({ statsRight, statsTop }, width) {
  const height = (width * FROG_ART.height) / FROG_ART.width;
  return {
    left: statsRight - ZONE.perchInset - width,
    top: statsTop - (height * FROG_ART.perchY) / FROG_ART.height,
  };
}

/** Hero coordinates (px) to the frog's SVG units. */
export function toFrogSpace(point, frog) {
  const scale = FROG_ART.width / frog.width;
  return { x: (point.x - frog.left) * scale, y: (point.y - frog.top) * scale };
}
