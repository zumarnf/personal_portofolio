import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFlightBoost,
  approachTerminalVelocity,
  accumulateImpulse,
  createLaunchMotion,
  createSlamMotion,
  readAccumulatedScrollTick,
  readScrollTick,
  startsNewScrollBurst,
} from "./scrollFigureMotion.js";

test("a downward scroll tick creates a normalized downward impulse", () => {
  assert.deepEqual(readScrollTick(24), {
    direction: "down",
    strength: 0.5,
  });
});

test("sub-pixel scroll noise produces no motion intent", () => {
  assert.deepEqual(readScrollTick(0.25), {
    direction: "idle",
    strength: 0,
  });
});

test("repeated scroll ticks accumulate to a bounded impulse", () => {
  assert.equal(accumulateImpulse(0.75, 0.5), 1);
});

test("invalid scroll deltas are ignored", () => {
  assert.deepEqual(readScrollTick(Number.NaN), {
    direction: "idle",
    strength: 0,
  });
});

test("an upward scroll tick preserves direction at maximum strength", () => {
  assert.deepEqual(readScrollTick(-96), {
    direction: "up",
    strength: 1,
  });
});

test("a continuing downward gesture does not start another burst", () => {
  assert.equal(startsNewScrollBurst("down", "down", 80), false);
});

test("a pause beyond the gesture gap starts a new burst", () => {
  assert.equal(startsNewScrollBurst("down", "down", 140), true);
});

test("a direction reversal starts a new burst immediately", () => {
  assert.equal(startsNewScrollBurst("up", "down", 12), true);
});

test("sub-pixel trackpad deltas accumulate into one meaningful tick", () => {
  const first = readAccumulatedScrollTick(0, 0.2);
  const second = readAccumulatedScrollTick(first.residualDelta, 0.2);
  const third = readAccumulatedScrollTick(second.residualDelta, 0.2);

  assert.deepEqual(first, {
    tick: { direction: "idle", strength: 0 },
    residualDelta: 0.2,
  });
  assert.deepEqual(second, {
    tick: { direction: "idle", strength: 0 },
    residualDelta: 0.4,
  });
  assert.equal(third.tick.direction, "down");
  assert.ok(Math.abs(third.tick.strength - 0.0125) < 1e-12);
  assert.equal(third.residualDelta, 0);
});

test("a sub-pixel direction reversal discards the opposite residual", () => {
  const reversed = readAccumulatedScrollTick(0.4, -0.6);

  assert.equal(reversed.tick.direction, "up");
  assert.ok(Math.abs(reversed.tick.strength - 0.0125) < 1e-12);
  assert.equal(reversed.residualDelta, 0);
});

test("a strong first gesture launches farther and higher than a gentle one", () => {
  const actorBounds = { top: 640, left: 1120, width: 90 };
  const gentle = createLaunchMotion(0.25, 1280, 800, actorBounds);
  const strong = createLaunchMotion(1, 1280, 800, actorBounds);

  assert.ok(strong.velocityX < gentle.velocityX);
  assert.ok(strong.velocityY < gentle.velocityY);
  assert.ok(strong.targetTravel > gentle.targetTravel);
  assert.ok(strong.targetRise > gentle.targetRise);
  assert.ok(strong.targetTravel > 1280 * 0.35);
  assert.ok(Math.abs(strong.velocityX) <= 760);
  assert.ok(Math.abs(strong.velocityY) <= 820);
});

test("launch travel limits remain inside a viewport-safe envelope", () => {
  const actorBounds = { top: 640, left: 1120, width: 90 };
  const motion = createLaunchMotion(1, 1280, 800, actorBounds);

  assert.ok(motion.minX >= -(actorBounds.left - 16));
  assert.ok(motion.minY >= -(actorBounds.top - 16));
  assert.ok(motion.minX < 0);
  assert.ok(motion.minY < 0);
});

test("umbrella drag approaches terminal velocity without overshooting", () => {
  const terminalVelocity = 108;
  const falling = approachTerminalVelocity(40, terminalVelocity, 3.4, 0.25);
  const tooFast = approachTerminalVelocity(240, terminalVelocity, 3.4, 0.25);

  assert.ok(falling > 40 && falling <= terminalVelocity);
  assert.ok(tooFast < 240 && tooFast >= terminalVelocity);
});

test("an airborne down burst boosts a descending actor upward", () => {
  const boosted = applyFlightBoost(180, 125, 0.5);

  assert.ok(boosted.velocityX < 0);
  assert.ok(boosted.velocityY < 0);
});

test("repeated airborne boosts remain safely capped", () => {
  let motion = { velocityX: -500, velocityY: -700 };

  for (let index = 0; index < 8; index += 1) {
    motion = applyFlightBoost(motion.velocityX, motion.velocityY, 1);
  }

  assert.ok(motion.velocityX >= -780);
  assert.ok(motion.velocityY >= -900);
});

test("an upward burst turns a rising actor into a bounded slam", () => {
  const slam = createSlamMotion(1, -420, -260, -700);

  assert.ok(slam.velocityX > 0);
  assert.ok(slam.velocityY > 0);
  assert.ok(slam.velocityY <= slam.maxVelocityY);
  assert.ok(slam.timeToGround > 0);
});

test("a stronger upward burst produces a faster slam", () => {
  const gentle = createSlamMotion(0.25, -320, -240, 80);
  const strong = createSlamMotion(1, -320, -240, 80);

  assert.ok(strong.velocityY > gentle.velocityY);
  assert.ok(strong.timeToGround < gentle.timeToGround);
});

test("a later down burst rescues an active slam", () => {
  const slam = createSlamMotion(1, -360, -220, -500);
  const rescued = applyFlightBoost(slam.velocityX, slam.velocityY, 1);

  assert.ok(rescued.velocityX < 0);
  assert.ok(rescued.velocityY < 0);
});
