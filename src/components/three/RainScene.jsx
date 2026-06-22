import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Fixed full-page rain. Each drop is a short vertical line streak falling
 * through a 3D volume; depth gives a subtle parallax. Built entirely with
 * three.js stock materials (LineBasicMaterial + vertex colors) so there is no
 * custom shader to fail compilation. Colors follow the live theme tokens.
 *
 * Guards: caps DPR, pauses when the tab is hidden, renders a single static
 * frame for reduced-motion users, and disposes resources on unmount.
 */

const AREA_X = 22;
const AREA_Y = 16;
const AREA_Z = 12;

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

export default function RainScene() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 110 : 230;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    // Per-drop state.
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const zs = new Float32Array(count);
    const lengths = new Float32Array(count);
    const speeds = new Float32Array(count);
    const isAccent = new Uint8Array(count);

    const positions = new Float32Array(count * 2 * 3);
    const colors = new Float32Array(count * 2 * 3);

    const baseColor = readThemeColor("--muted-foreground", new THREE.Color());
    const accentColor = readThemeColor("--accent", new THREE.Color());

    for (let i = 0; i < count; i++) {
      xs[i] = (Math.random() * 2 - 1) * AREA_X;
      ys[i] = (Math.random() * 2 - 1) * AREA_Y;
      zs[i] = -Math.random() * AREA_Z;
      lengths[i] = 0.3 + Math.random() * 0.45;
      speeds[i] = 0.05 + Math.random() * 0.07;
      isAccent[i] = Math.random() < 0.1 ? 1 : 0;
    }

    const writeColors = () => {
      for (let i = 0; i < count; i++) {
        const c = isAccent[i] ? accentColor : baseColor;
        const i6 = i * 6;
        // Head brighter, tail dimmer for a falling-streak look.
        colors[i6] = c.r;
        colors[i6 + 1] = c.g;
        colors[i6 + 2] = c.b;
        colors[i6 + 3] = c.r * 0.4;
        colors[i6 + 4] = c.g * 0.4;
        colors[i6 + 5] = c.b * 0.4;
      }
    };
    writeColors();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });
    const rain = new THREE.LineSegments(geometry, material);
    scene.add(rain);

    const writePositions = () => {
      for (let i = 0; i < count; i++) {
        const i6 = i * 6;
        positions[i6] = xs[i];
        positions[i6 + 1] = ys[i];
        positions[i6 + 2] = zs[i];
        positions[i6 + 3] = xs[i];
        positions[i6 + 4] = ys[i] - lengths[i];
        positions[i6 + 5] = zs[i];
      }
      geometry.attributes.position.needsUpdate = true;
    };
    writePositions();

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      const width = w || window.innerWidth;
      const height = h || window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();

    const themeObserver = new MutationObserver(() => {
      readThemeColor("--muted-foreground", baseColor);
      readThemeColor("--accent", accentColor);
      writeColors();
      geometry.attributes.color.needsUpdate = true;
      if (!running) renderer.render(scene, camera);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let frameId = null;
    let running = false;

    const renderFrame = () => {
      frameId = requestAnimationFrame(renderFrame);
      for (let i = 0; i < count; i++) {
        ys[i] -= speeds[i];
        xs[i] += 0.006; // faint slant
        if (ys[i] < -AREA_Y) {
          ys[i] = AREA_Y + Math.random() * 4;
          xs[i] = (Math.random() * 2 - 1) * AREA_X;
          zs[i] = -Math.random() * AREA_Z;
        }
      }
      writePositions();
      renderer.render(scene, camera);
    };

    const start = () => {
      if (running || prefersReducedMotion) return;
      running = true;
      renderFrame();
    };
    const stop = () => {
      running = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Always paint at least one frame (covers reduced-motion users).
    renderer.render(scene, camera);
    start();

    return () => {
      stop();
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
