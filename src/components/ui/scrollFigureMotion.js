const MAX_SCROLL_DELTA = 48;
const SCROLL_DEAD_ZONE = 0.5;
const LAUNCH_GRAVITY = 950;
const LAUNCH_HORIZONTAL_DRAG = 0.35;
const MAX_BOOST_VELOCITY_X = 780;
const MAX_BOOST_VELOCITY_Y = 900;
const SLAM_GRAVITY = 1900;
const MAX_SLAM_VELOCITY_X = 1800;
const MAX_SLAM_VELOCITY_Y = 1200;
export const SCROLL_BURST_GAP_MS = 140;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function safeDimension(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function approachTerminalVelocity(
  velocity,
  terminalVelocity,
  drag,
  seconds
) {
  if (
    !Number.isFinite(velocity) ||
    !Number.isFinite(terminalVelocity) ||
    !Number.isFinite(drag) ||
    !Number.isFinite(seconds)
  ) {
    return velocity;
  }

  const duration = clamp(seconds, 0, 0.25);
  const blend = 1 - Math.exp(-Math.max(drag, 0) * duration);

  return velocity + (terminalVelocity - velocity) * blend;
}

export function applyFlightBoost(velocityX, velocityY, strength) {
  const power = clamp(Number.isFinite(strength) ? strength : 0, 0, 1);
  const currentVelocityX = Number.isFinite(velocityX) ? velocityX : 0;
  const currentVelocityY = Number.isFinite(velocityY) ? velocityY : 0;
  const minimumUpwardSpeed = 380 + 260 * power;
  const nextVelocityX = Math.min(
    currentVelocityX - (130 + 180 * power),
    -(90 + 180 * power)
  );
  const nextVelocityY = Math.min(
    currentVelocityY - (260 + 300 * power),
    -minimumUpwardSpeed
  );

  return {
    velocityX: clamp(
      nextVelocityX,
      -MAX_BOOST_VELOCITY_X,
      MAX_BOOST_VELOCITY_X
    ),
    velocityY: clamp(
      nextVelocityY,
      -MAX_BOOST_VELOCITY_Y,
      MAX_BOOST_VELOCITY_Y
    ),
  };
}

export function createSlamMotion(
  strength,
  positionX,
  positionY,
  currentVelocityY
) {
  const power = clamp(Number.isFinite(strength) ? strength : 0, 0, 1);
  const x = Number.isFinite(positionX) ? positionX : 0;
  const y = Number.isFinite(positionY) ? positionY : 0;
  const carriedVelocity = Number.isFinite(currentVelocityY)
    ? Math.max(currentVelocityY, 0)
    : 0;
  const velocityY = Math.min(
    560 + 380 * power + Math.min(carriedVelocity * 0.15, 120),
    MAX_SLAM_VELOCITY_Y
  );
  const distanceToGround = Math.max(-y, 0);
  const timeToGround = Math.max(
    (-velocityY +
      Math.sqrt(
        velocityY * velocityY + 2 * SLAM_GRAVITY * distanceToGround
      )) /
      SLAM_GRAVITY,
    0.12
  );

  return {
    velocityX: clamp(
      (-x * 0.96) / timeToGround,
      0,
      MAX_SLAM_VELOCITY_X
    ),
    velocityY,
    gravity: SLAM_GRAVITY,
    maxVelocityX: MAX_SLAM_VELOCITY_X,
    maxVelocityY: MAX_SLAM_VELOCITY_Y,
    timeToGround,
  };
}

export function createLaunchMotion(
  strength,
  viewportWidth,
  viewportHeight,
  actorBounds = {}
) {
  const power = clamp(Number.isFinite(strength) ? strength : 0, 0, 1);
  const width = safeDimension(viewportWidth, 1280);
  const height = safeDimension(viewportHeight, 800);
  const actorTop = clamp(
    Number.isFinite(actorBounds.top) ? actorBounds.top : height * 0.78,
    16,
    height
  );
  const actorLeft = clamp(
    Number.isFinite(actorBounds.left) ? actorBounds.left : width * 0.86,
    16,
    width
  );
  const actorWidth = safeDimension(actorBounds.width, width * 0.07);
  const verticalLimit = Math.max(actorTop - 16, 24);
  const horizontalLimit = Math.max(actorLeft - 16, 24);
  const centerLimit = Math.max(
    actorLeft + actorWidth / 2 - width * 0.52,
    24
  );
  const targetRise =
    Math.min(height * (0.16 + 0.29 * power), verticalLimit) * 0.9;
  const targetTravel =
    Math.min(
      width * (0.035 + 0.42 * power ** 1.55),
      centerLimit,
      horizontalLimit
    ) * 0.96;
  const apexTime = Math.sqrt((2 * targetRise) / LAUNCH_GRAVITY);
  const horizontalDistanceFactor =
    1 - Math.exp(-LAUNCH_HORIZONTAL_DRAG * apexTime);

  return {
    strength: power,
    velocityX:
      -(targetTravel * LAUNCH_HORIZONTAL_DRAG) /
      Math.max(horizontalDistanceFactor, 0.01),
    velocityY: -LAUNCH_GRAVITY * apexTime,
    minX: -Math.min(horizontalLimit, width * 0.48),
    minY: -Math.min(verticalLimit, height * 0.5),
    gravity: LAUNCH_GRAVITY,
    horizontalDrag: LAUNCH_HORIZONTAL_DRAG,
    targetRise,
    targetTravel,
    terminalVelocity: 125,
  };
}

export function startsNewScrollBurst(
  previousDirection,
  nextDirection,
  elapsedMs
) {
  return (
    previousDirection !== nextDirection || elapsedMs >= SCROLL_BURST_GAP_MS
  );
}

export function accumulateImpulse(current, strength) {
  return Math.min(Math.max(current + strength, 0), 1);
}

export function readScrollTick(delta) {
  if (!Number.isFinite(delta) || Math.abs(delta) < SCROLL_DEAD_ZONE) {
    return { direction: "idle", strength: 0 };
  }

  return {
    direction: delta > 0 ? "down" : "up",
    strength: Math.min(Math.abs(delta) / MAX_SCROLL_DELTA, 1),
  };
}

export function readAccumulatedScrollTick(residualDelta, delta) {
  const residual = Number.isFinite(residualDelta) ? residualDelta : 0;

  if (!Number.isFinite(delta)) {
    return {
      tick: { direction: "idle", strength: 0 },
      residualDelta: residual,
    };
  }

  const reversesDirection =
    residual !== 0 && delta !== 0 && Math.sign(residual) !== Math.sign(delta);
  const combinedDelta = reversesDirection ? delta : residual + delta;
  const tick = readScrollTick(combinedDelta);

  return {
    tick,
    residualDelta: tick.direction === "idle" ? combinedDelta : 0,
  };
}
