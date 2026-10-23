import assert from "node:assert/strict";
import test from "node:test";
import {
  BODY_BOX_RATIO,
  CURVES,
  PARTICLES,
  REST,
  RISE_POINT,
  SET_POINT,
  TIMING,
  arcControl,
  breezeStrength,
  gustStrength,
  isParticleActive,
  maxFullBodyDiameter,
  quadraticPoint,
  sceneFor,
} from "./skyMotion.js";

const near = (actual, expected, epsilon = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${actual} is not within ${epsilon} of ${expected}`
  );

test("page colours finish inside the 500 ms UI band", () => {
  assert.ok(TIMING.pageFade <= 0.5);
});

test("every entrance is longer than its matching exit", () => {
  assert.ok(TIMING.rise.duration > TIMING.set.duration);
  assert.ok(TIMING.weatherIn.duration > TIMING.weatherOut.duration);
});

test("incoming layers start after the outgoing ones, inside the stagger budget", () => {
  assert.equal(TIMING.set.delay, 0);
  assert.equal(TIMING.weatherOut.delay, 0);
  assert.ok(TIMING.rise.delay > 0 && TIMING.rise.delay <= 0.2);
  assert.ok(TIMING.weatherIn.delay > TIMING.rise.delay);
  assert.ok(TIMING.weatherIn.delay < 0.6);
});

test("curves are valid cubic-bezier control points with no overshoot", () => {
  for (const [name, points] of Object.entries(CURVES)) {
    assert.equal(points.length, 4, name);
    for (const value of points) {
      assert.ok(value >= 0 && value <= 1, `${name} has ${value} outside 0..1`);
    }
  }
});

test("exits accelerate and entrances decelerate", () => {
  // ease-in: the first handle stays on the floor; ease-out: it jumps to the ceiling.
  assert.equal(CURVES.set[1], 0);
  assert.equal(CURVES.weatherOut[1], 0);
  assert.equal(CURVES.rise[1], 1);
  assert.equal(CURVES.weatherIn[1], 1);
});

test("a leaving body moves sideways first, then sinks", () => {
  const control = arcControl(REST, SET_POINT, true);
  assert.deepEqual(control, { x: SET_POINT.x, y: REST.y });

  const midway = quadraticPoint(REST, control, SET_POINT, 0.5);
  const straight = { x: SET_POINT.x / 2, y: SET_POINT.y / 2 };
  assert.ok(midway.x > straight.x);
  assert.ok(midway.y < straight.y);
});

test("an arriving body lifts first, then settles sideways", () => {
  const control = arcControl(RISE_POINT, REST, false);
  assert.deepEqual(control, { x: RISE_POINT.x, y: REST.y });

  const midway = quadraticPoint(RISE_POINT, control, REST, 0.5);
  const straight = { x: RISE_POINT.x / 2, y: RISE_POINT.y / 2 };
  assert.ok(midway.y < straight.y, "should already be higher than a straight line");
  assert.ok(midway.x < straight.x, "should still be out to the side");
});

test("an arc starts exactly where an interrupted body is, so nothing jumps", () => {
  const interrupted = { x: 0.21, y: 0.66 };
  const control = arcControl(interrupted, REST, false);
  assert.deepEqual(quadraticPoint(interrupted, control, REST, 0), interrupted);
  assert.deepEqual(quadraticPoint(interrupted, control, REST, 1), REST);
});

test("set and rise share one horizon below the resting spot", () => {
  assert.equal(SET_POINT.y, RISE_POINT.y);
  assert.ok(SET_POINT.y > REST.y);
  assert.equal(SET_POINT.x, -RISE_POINT.x);
});

test("dark is moon + rain, light is sun + spring petals", () => {
  assert.deepEqual(sceneFor("dark"), { body: "moon", rain: 1, petals: 0 });
  assert.deepEqual(sceneFor("light"), { body: "sun", rain: 0, petals: 1 });
});

test("an unknown theme falls back to the light sky instead of throwing", () => {
  assert.deepEqual(sceneFor(undefined), sceneFor("light"));
});

test("the gust is silent outside its window and peaks halfway", () => {
  const duration = TIMING.weatherOut.duration;
  assert.equal(gustStrength(-0.1, duration), 0);
  assert.equal(gustStrength(duration, duration), 0);
  assert.equal(gustStrength(duration * 3, duration), 0);
  near(gustStrength(duration / 2, duration), 1);
  assert.ok(gustStrength(duration / 4, duration) > 0);
});

test("the breeze waits for the incoming weather, then dies away", () => {
  const { delay, duration } = TIMING.weatherIn;
  assert.equal(breezeStrength(delay / 2, delay, duration), 0);
  near(breezeStrength(delay, delay, duration), 1);
  assert.ok(breezeStrength(delay + duration / 2, delay, duration) < 1);
  assert.equal(breezeStrength(delay + duration, delay, duration), 0);
});

test("weather density follows intensity: none at 0, every particle at 1", () => {
  const thresholds = [0, 0.25, 0.5, 0.999];
  assert.ok(thresholds.every((t) => !isParticleActive(t, 0)));
  assert.ok(thresholds.every((t) => isParticleActive(t, 1)));
  assert.equal(isParticleActive(0.4, 0.5), true);
  assert.equal(isParticleActive(0.6, 0.5), false);
});

test("phones get fewer particles than desktops", () => {
  assert.ok(PARTICLES.mobile.rain < PARTICLES.desktop.rain);
  assert.ok(PARTICLES.mobile.petals < PARTICLES.desktop.petals);
});

test("a full-strength body and its whole rise path fit inside the right margin", () => {
  const gap = 16;
  for (const margin of [192, 236, 272, 400]) {
    const diameter = maxFullBodyDiameter(margin, gap);
    const leftmostReach = diameter / 2 + Math.abs(RISE_POINT.x) * diameter;
    // The body is centred in the margin, so this is its distance to the content edge.
    near(margin / 2 - leftmostReach, gap, 1e-9);
  }
});

test("the CSS box size matches the SVG core geometry", () => {
  // src/index.css sizes the box as `--sky-d * 2.2727` and centres it with 1.1364.
  near(BODY_BOX_RATIO, 2.2727, 1e-4);
  near(BODY_BOX_RATIO / 2, 1.1364, 1e-4);
});

test("the CSS divisor for the full-strength size matches the rise path", () => {
  // src/index.css hard-codes `(margin - 32px) / 1.7`; keep the two in step.
  near(1 + 2 * Math.abs(RISE_POINT.x), 1.7, 1e-12);
  near(maxFullBodyDiameter(192), (192 - 32) / 1.7, 1e-9);
});
