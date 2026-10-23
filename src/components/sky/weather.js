import * as THREE from "three";
import {
  TIMING,
  breezeStrength,
  gustStrength,
  isParticleActive,
} from "@/components/sky/skyMotion";

/**
 * Full-screen WebGL weather: rain streaks (LineSegments) and cherry-blossom
 * petals (one InstancedMesh). Stock three.js materials only, so there is no
 * custom shader to fail compilation.
 *
 * The weather owns no timeline. SkyScene tweens `state.rain` / `state.petals`
 * (0..1); every frame this module turns them into density (how many particles
 * may respawn) and opacity. Speeds are per second, so high-refresh screens do
 * not rain faster.
 */

const CAMERA_Z = 12;
const FOV = 60;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const DEPTH = 12;
const RAIN_OPACITY = 0.7;
const PETAL_OPACITY = 0.85;
// Opacity leads density, so the first sparse drizzle is already visible.
const FADE_GAIN = 1.6;
const PETAL_SIZE = 0.12;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

const random = (min, max) => min + Math.random() * (max - min);

function readThemeColor(varName, target) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  const parts = raw.split(/\s+/);
  if (parts.length < 3) return target;
  return target.setHSL(
    parseFloat(parts[0]) / 360,
    parseFloat(parts[1]) / 100,
    parseFloat(parts[2]) / 100
  );
}

/** Rounded petal with the small notch at its tip that makes it read as sakura. */
function createPetalGeometry() {
  const s = PETAL_SIZE;
  const shape = new THREE.Shape();
  shape.moveTo(0, s * 0.7);
  shape.lineTo(s * 0.24, s);
  shape.bezierCurveTo(s * 0.98, s * 0.66, s * 0.74, -s * 0.58, 0, -s);
  shape.bezierCurveTo(-s * 0.74, -s * 0.58, -s * 0.98, s * 0.66, -s * 0.24, s);
  shape.lineTo(0, s * 0.7);
  return new THREE.ShapeGeometry(shape, 8);
}

/**
 * Returns null when WebGL is unavailable; the sun and moon still render
 * without it.
 */
export function createWeather(container, { rain: rainCount, petals: petalCount }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;

  // Visible half-extents of the frustum at depth z, so particles only spend
  // their lives where they can be seen.
  const halfHeightAt = (z) => (CAMERA_Z - z) * TAN_HALF_FOV;
  const halfWidthAt = (z) => halfHeightAt(z) * camera.aspect;

  const state = { rain: 0, petals: 0 };
  let clock = 0;
  let gustAt = Number.NEGATIVE_INFINITY;
  let breezeAt = Number.NEGATIVE_INFINITY;

  // ---------- rain ----------
  const drops = Array.from({ length: rainCount }, () => ({
    x: 0,
    y: 0,
    z: 0,
    length: random(0.3, 0.75),
    speed: random(3, 7.2),
    threshold: Math.random(),
    isAccent: Math.random() < 0.1,
    alive: false,
  }));
  const rainPositions = new Float32Array(rainCount * 6);
  const rainColors = new Float32Array(rainCount * 6);
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  rainGeometry.setAttribute("color", new THREE.BufferAttribute(rainColors, 3));
  const rainMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
  });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  scene.add(rain);

  // ---------- petals ----------
  const petals = Array.from({ length: petalCount }, () => ({
    x: 0,
    y: 0,
    z: 0,
    scale: random(0.8, 1.25),
    fall: random(0.55, 1),
    swayAmount: random(0.25, 0.6),
    swaySpeed: random(0.6, 1.2),
    swayPhase: random(0, Math.PI * 2),
    rx: random(0, Math.PI * 2),
    ry: random(0, Math.PI * 2),
    rz: random(0, Math.PI * 2),
    spinX: random(1.2, 3) * (Math.random() < 0.5 ? -1 : 1),
    spinY: random(0.8, 2.2) * (Math.random() < 0.5 ? -1 : 1),
    spinZ: random(0.3, 0.9) * (Math.random() < 0.5 ? -1 : 1),
    tone: Math.random(),
    threshold: Math.random(),
    alive: false,
  }));
  const petalGeometry = createPetalGeometry();
  const petalMaterial = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const petalMesh = new THREE.InstancedMesh(petalGeometry, petalMaterial, petalCount);
  petalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petalMesh.frustumCulled = false;
  scene.add(petalMesh);

  const colors = {
    rain: new THREE.Color(),
    rainAccent: new THREE.Color(),
    petal: new THREE.Color(),
    petalDeep: new THREE.Color(),
    background: new THREE.Color(),
  };
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  function refreshColors() {
    readThemeColor("--muted-foreground", colors.rain);
    readThemeColor("--accent", colors.rainAccent);
    readThemeColor("--sky-petal", colors.petal);
    readThemeColor("--sky-petal-deep", colors.petalDeep);
    readThemeColor("--background", colors.background);
    drops.forEach((drop, i) => {
      const c = drop.isAccent ? colors.rainAccent : colors.rain;
      const i6 = i * 6;
      // Head brighter, tail dimmer for a falling-streak look.
      rainColors[i6] = c.r;
      rainColors[i6 + 1] = c.g;
      rainColors[i6 + 2] = c.b;
      rainColors[i6 + 3] = c.r * 0.4;
      rainColors[i6 + 4] = c.g * 0.4;
      rainColors[i6 + 5] = c.b * 0.4;
    });
    rainGeometry.attributes.color.needsUpdate = true;
  }

  function spawnDrop(drop, anywhere) {
    drop.z = -Math.random() * DEPTH;
    const top = halfHeightAt(drop.z);
    drop.x = random(-1, 1) * halfWidthAt(drop.z);
    drop.y = anywhere ? random(-top, top) : top + random(0, 2);
  }

  function spawnPetal(petal, anywhere, breeze) {
    petal.z = -Math.random() * DEPTH;
    const top = halfHeightAt(petal.z);
    const side = halfWidthAt(petal.z);
    // A breeze carries new petals in from the left.
    petal.x = breeze > 0 ? random(-1.3, 0.6) * side : random(-1.1, 1) * side;
    petal.y = anywhere ? random(-top, top) : top + random(0.2, 1.6);
  }

  function writeRain() {
    drops.forEach((drop, i) => {
      const i6 = i * 6;
      // Dead drops collapse onto one far-away point, so they draw nothing.
      const y = drop.alive ? drop.y : -1000;
      rainPositions[i6] = drop.x;
      rainPositions[i6 + 1] = y;
      rainPositions[i6 + 2] = drop.z;
      rainPositions[i6 + 3] = drop.x;
      rainPositions[i6 + 4] = drop.alive ? y - drop.length : y;
      rainPositions[i6 + 5] = drop.z;
    });
    rainGeometry.attributes.position.needsUpdate = true;
  }

  function writePetals() {
    petals.forEach((petal, i) => {
      if (!petal.alive) {
        petalMesh.setMatrixAt(i, HIDDEN);
        return;
      }
      dummy.position.set(petal.x, petal.y, petal.z);
      dummy.rotation.set(petal.rx, petal.ry, petal.rz);
      dummy.scale.setScalar(petal.scale);
      dummy.updateMatrix();
      petalMesh.setMatrixAt(i, dummy.matrix);

      // Shade by how squarely the petal faces the camera, then fade distant
      // petals toward the page background for depth.
      const facing = Math.abs(Math.cos(petal.rx) * Math.cos(petal.ry));
      tint
        .copy(colors.petalDeep)
        .lerp(colors.petal, petal.tone)
        .multiplyScalar(0.8 + 0.2 * facing)
        .lerp(colors.background, (-petal.z / DEPTH) * 0.45);
      petalMesh.setColorAt(i, tint);
    });
    petalMesh.instanceMatrix.needsUpdate = true;
    if (petalMesh.instanceColor) petalMesh.instanceColor.needsUpdate = true;
  }

  function step(dt) {
    clock += dt;
    const gust = gustStrength(clock - gustAt, TIMING.weatherOut.duration);
    const breeze = breezeStrength(
      clock - breezeAt,
      TIMING.weatherIn.delay,
      TIMING.weatherIn.duration
    );

    for (const drop of drops) {
      if (!drop.alive) {
        if (isParticleActive(drop.threshold, state.rain)) {
          drop.alive = true;
          spawnDrop(drop, false);
        }
        continue;
      }
      drop.y -= drop.speed * (1 + gust * 0.6) * dt;
      drop.x += 0.36 * dt; // faint slant
      if (drop.y - drop.length < -halfHeightAt(drop.z)) {
        if (isParticleActive(drop.threshold, state.rain)) spawnDrop(drop, false);
        else drop.alive = false;
      }
    }

    for (const petal of petals) {
      if (!petal.alive) {
        if (isParticleActive(petal.threshold, state.petals)) {
          petal.alive = true;
          spawnPetal(petal, false, breeze);
        }
        continue;
      }
      petal.swayPhase += petal.swaySpeed * dt;
      petal.y -= petal.fall * (1 + gust * 2.6) * dt;
      petal.x +=
        (0.25 + Math.sin(petal.swayPhase) * petal.swayAmount + gust * 2.2 + breeze * 1.2) *
        dt;
      const spin = 1 + gust * 2;
      petal.rx += petal.spinX * spin * dt;
      petal.ry += petal.spinY * spin * dt;
      petal.rz += petal.spinZ * spin * dt;

      const offscreen =
        petal.y < -halfHeightAt(petal.z) - 0.5 ||
        petal.x > halfWidthAt(petal.z) + 0.5;
      if (offscreen) {
        if (isParticleActive(petal.threshold, state.petals)) {
          spawnPetal(petal, false, breeze);
        } else {
          petal.alive = false;
        }
      }
    }
  }

  function render() {
    const rainAlpha = Math.min(1, state.rain * FADE_GAIN);
    const petalAlpha = Math.min(1, state.petals * FADE_GAIN);
    rainMaterial.opacity = RAIN_OPACITY * rainAlpha;
    petalMaterial.opacity = PETAL_OPACITY * petalAlpha;
    rain.visible = rainAlpha > 0.001;
    petalMesh.visible = petalAlpha > 0.001;
    if (rain.visible) writeRain();
    if (petalMesh.visible) writePetals();
    renderer.render(scene, camera);
  }

  /**
   * Spread particles over the whole view at a given density — for still frames
   * and first paint. Opacity still follows `state`, so a settled field can be
   * faded in without petals having to fall in from the top first.
   */
  function settle(density = state) {
    drops.forEach((drop) => {
      drop.alive = isParticleActive(drop.threshold, density.rain);
      if (drop.alive) spawnDrop(drop, true);
    });
    petals.forEach((petal) => {
      petal.alive = isParticleActive(petal.threshold, density.petals);
      if (petal.alive) spawnPetal(petal, true, 0);
    });
  }

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    rainGeometry.dispose();
    rainMaterial.dispose();
    petalGeometry.dispose();
    petalMaterial.dispose();
    petalMesh.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  resize();
  refreshColors();
  // Create the per-instance colour buffer before the first draw: the shader is
  // compiled with or without instance colours depending on whether it exists.
  petals.forEach((_, i) => petalMesh.setColorAt(i, colors.petal));

  return {
    state,
    step,
    render,
    settle,
    resize,
    refreshColors,
    gust: () => {
      gustAt = clock;
    },
    breeze: () => {
      breezeAt = clock;
    },
    dispose,
  };
}
