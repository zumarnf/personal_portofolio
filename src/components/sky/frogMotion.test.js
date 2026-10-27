import assert from "node:assert/strict";
import test from "node:test";
import {
  BUTTERFLY,
  EYE_RADIUS,
  EYES,
  FROG_ART,
  FROG_TIMING,
  MOUTH,
  PUPIL_TRAVEL,
  RAINDROP,
  SQUASH,
  TONGUE_REACH,
  ZONE,
  catchTiming,
  flightZone,
  perch,
  pupilOffset,
  toFrogSpace,
  tongueClearsEyes,
  tongueTip,
} from "./frogMotion.js";
import { TIMING } from "./skyMotion.js";

const near = (actual, expected, epsilon = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${actual} is not within ${epsilon} of ${expected}`
  );

test("pupils look toward the target but never leave the eye", () => {
  const eye = EYES[0];
  const far = pupilOffset(eye, { x: eye.x + 300, y: eye.y - 400 });
  near(Math.hypot(far.x, far.y), PUPIL_TRAVEL);
  assert.ok(far.x > 0 && far.y < 0);

  const close = pupilOffset(eye, { x: eye.x + 0.5, y: eye.y });
  near(close.x, 0.5);
  assert.equal(close.y, 0);
});

test("a target right on the eye leaves the pupil centred instead of NaN", () => {
  assert.deepEqual(pupilOffset(EYES[1], EYES[1]), { x: 0, y: 0 });
});

test("the tongue reaches toward the target, never further than its length", () => {
  const far = tongueTip({ x: MOUTH.x - 200, y: MOUTH.y - 200 });
  near(Math.hypot(far.x - MOUTH.x, far.y - MOUTH.y), TONGUE_REACH);
  assert.ok(far.x < MOUTH.x && far.y < MOUTH.y);

  const near_ = { x: MOUTH.x - 5, y: MOUTH.y - 5 };
  assert.deepEqual(tongueTip(near_), near_);
});

test("a tongue across the face is refused; one out to the side is not", () => {
  const aboveLeftEye = { x: EYES[0].x, y: EYES[0].y - 20 };
  assert.equal(tongueClearsEyes(tongueTip(aboveLeftEye)), false);
  const betweenTheEyes = { x: 30, y: 0 };
  assert.equal(tongueClearsEyes(tongueTip(betweenTheEyes)), false);
  const outToTheLeft = { x: MOUTH.x - 30, y: MOUTH.y - 4 };
  assert.equal(tongueClearsEyes(tongueTip(outToTheLeft)), true);
});

test("the raindrop falls beside the head and is caught within reach, clear of the eyes", () => {
  const { from, catchAt } = RAINDROP;
  assert.equal(from.x, catchAt.x, "falls straight down");
  assert.ok(from.y < 0, "starts above the frog");
  assert.ok(Math.hypot(catchAt.x - MOUTH.x, catchAt.y - MOUTH.y) <= TONGUE_REACH);
  assert.equal(tongueClearsEyes(catchAt), true);
  assert.ok(catchAt.x < EYES[0].x - EYE_RADIUS, "left of the head");
});

test("the tongue arrives exactly when the raindrop does", () => {
  const { tongueAt, caughtAt, tongueOut } = catchTiming();
  near(tongueAt + tongueOut, caughtAt);
  assert.ok(tongueAt > 0);
});

const hero = {
  buttonsRight: 300,
  buttonsTop: 100,
  statsTop: 228,
  right: 896,
};

test("the butterfly flies only in the empty band right of the buttons", () => {
  const zone = flightZone(hero);
  assert.equal(zone.x0, hero.buttonsRight + ZONE.gap);
  assert.equal(zone.x1, hero.right - ZONE.gap);
  assert.equal(zone.y0, hero.buttonsTop - ZONE.gap);
  assert.equal(zone.y1, hero.statsTop - ZONE.floor);
});

test("on wide screens the butterfly stays near the frog instead of roaming", () => {
  const frogLeft = 820;
  const zone = flightZone({ ...hero, frogLeft });
  assert.equal(zone.x0, frogLeft - ZONE.span);
  // On a phone the band is already narrow, so the buttons stay the limit.
  const phone = flightZone({ buttonsRight: 160, buttonsTop: 400, statsTop: 588, right: 327, frogLeft: 251 });
  assert.equal(phone.x0, 160 + ZONE.gap);
});

test("no flight zone when the empty band is too small to fly in", () => {
  assert.equal(flightZone({ ...hero, buttonsRight: hero.right - 20 }), null);
  assert.equal(flightZone({ ...hero, statsTop: hero.buttonsTop + 10 }), null);
});

test("the frog's feet rest exactly on the stats card's top edge", () => {
  const width = 64;
  const spot = perch({ statsRight: 896, statsTop: 228 }, width);
  const height = (width * FROG_ART.height) / FROG_ART.width;
  near(spot.top + (height * FROG_ART.perchY) / FROG_ART.height, 228);
  assert.equal(spot.left + width, 896 - ZONE.perchInset);
});

test("page coordinates map into the frog's own SVG units", () => {
  const frog = { left: 100, top: 50, width: 32 }; // half size: 1 px = 2 units
  assert.deepEqual(toFrogSpace({ x: 116, y: 75 }, frog), { x: 32, y: 50 });
});

test("a blink is quick and every reaction finishes with the sky", () => {
  const { blink, reaction, entrance } = FROG_TIMING;
  assert.ok(blink.close + blink.open <= 0.16);
  assert.ok(blink.close < blink.open);
  const skyDone = TIMING.rise.delay + TIMING.rise.duration;
  assert.ok(reaction.night <= skyDone, "night reaction");
  assert.ok(reaction.day <= skyDone, "day reaction");
  assert.ok(entrance.duration <= 0.6);
});

test("the frog appears only once the stats card has faded in", () => {
  // index.css: the stats card starts 0.3 s late and fades in over 0.7 s.
  assert.ok(FROG_TIMING.entrance.after >= 0.3 + 0.7);
});

test("a hop takes the thesis' 600 ms from crouch to settled", () => {
  const { squash, rise, fall, land, settle } = FROG_TIMING.hop;
  near(squash + rise + fall + land + settle, 0.6, 1e-9);
});

test("squash and stretch stay within 10 %", () => {
  for (const [name, value] of Object.entries(SQUASH)) {
    assert.ok(Math.abs(1 - value) <= 0.1, `${name} = ${value}`);
  }
});

test("the butterfly leaves faster than it arrives", () => {
  assert.ok(BUTTERFLY.exit < BUTTERFLY.enter);
  assert.ok(BUTTERFLY.speed[0] < BUTTERFLY.speed[1]);
});

test("random waits are real ranges", () => {
  for (const range of [
    FROG_TIMING.blink.every,
    FROG_TIMING.action.day,
    FROG_TIMING.action.night,
  ]) {
    assert.ok(range[0] > 0 && range[0] < range[1], String(range));
  }
});
