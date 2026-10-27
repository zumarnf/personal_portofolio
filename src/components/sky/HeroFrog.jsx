import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ButterflyArt, FrogArt } from "@/components/sky/Critters";
import {
  BUTTERFLY,
  EYES,
  FROG_ART,
  FROG_TIMING,
  MOUTH,
  RAINDROP,
  SQUASH,
  catchTiming,
  flightZone,
  perch,
  pupilOffset,
  toFrogSpace,
  tongueClearsEyes,
  tongueTip,
} from "@/components/sky/frogMotion";
import { useTheme } from "@/hooks/useTheme";
import { useBackgroundMotion } from "@/hooks/useBackgroundMotion";

// Frog-space points (SVG units).
const RAIN_LOOK = { x: 12, y: -12 };
const DAY_LOOK = { x: 6, y: 18 };
const HOP_HEIGHT = 14;
// Further than this (px) the butterfly is out of reach: the frog only hops in place.
const SNAP_RANGE = 140;
// The butterfly is drawn 22px wide; its position is the middle of its body.
const BUTTERFLY_CENTER = { x: 11, y: 8.5 };

const between = (range) =>
  Array.isArray(range) ? gsap.utils.random(range[0], range[1]) : range;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Records every animation started for one actor, so pausing, scrolling away
 * or a theme change can freeze or stop all of them at once.
 */
function createTracker() {
  const live = new Set();
  let isFrozen = false;
  const keep = (animation) => {
    live.add(animation);
    animation.then(() => live.delete(animation));
    if (isFrozen) animation.pause();
    return animation;
  };
  return {
    to: (target, vars) => keep(gsap.to(target, vars)),
    timeline: (vars) => keep(gsap.timeline(vars)),
    after: (seconds, callback) => keep(gsap.delayedCall(seconds, callback)),
    freeze(next) {
      isFrozen = next;
      live.forEach((animation) => (next ? animation.pause() : animation.resume()));
    },
    stop() {
      live.forEach((animation) => animation.kill());
      live.clear();
    },
  };
}

/**
 * Drives the frog and its butterfly imperatively, like the sky's director.
 * Everything starts from current values, so a switch mid-action never jumps.
 */
function createFrogDirector({ layer, frogEl, flyEl, statsEl, buttonsEl }) {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = gsap.context(() => {}, layer);
  const frog = createTracker();
  const flight = createTracker();

  const body = frogEl.querySelector(".frog-body");
  const throat = frogEl.querySelector(".frog-throat");
  const gulp = frogEl.querySelector(".frog-gulp");
  const eyeballs = frogEl.querySelectorAll(".frog-eyeball");
  const pupils = frogEl.querySelectorAll(".frog-pupil");
  const tongue = frogEl.querySelector(".frog-tongue");
  const drop = frogEl.querySelector(".frog-drop");
  const wings = flyEl.querySelectorAll(".butterfly-wing-l, .butterfly-wing-r");
  const tilt = flyEl.querySelector(".butterfly-tilt");

  let theme = null;
  let isPaused = false;
  let isOffscreen = false;
  let isReduced = reducedQuery.matches;
  let isBusy = false;
  let hasEntered = false;
  let isDisposed = false;
  // The scene changed while frozen: restart the loops rather than resume them.
  let isStale = false;
  let frogBox = { left: 0, top: 0, width: FROG_ART.width };
  let statsTop = 0;
  let zone = null;
  const fly = { x: 0, y: 0 };

  ctx.add(() => {
    gsap.set(body, { svgOrigin: "30 50" });
    gsap.set([throat, gulp], { svgOrigin: "30 38" });
    gsap.set(throat, { scale: 0.55 });
    eyeballs.forEach((ball, i) => gsap.set(ball, { svgOrigin: `${EYES[i].x} ${EYES[i].y}` }));
    gsap.set([...wings, tilt], { svgOrigin: "14 11" });
    gsap.set([frogEl, flyEl], { autoAlpha: 0 });
  });

  // ---------- layout ----------
  function measure() {
    const base = layer.getBoundingClientRect();
    const stats = statsEl.getBoundingClientRect();
    const links = [...buttonsEl.querySelectorAll("a")].map((link) =>
      link.getBoundingClientRect()
    );
    const width = frogEl.offsetWidth;
    statsTop = stats.top - base.top;
    const spot = perch({ statsRight: stats.right - base.left, statsTop }, width);
    frogBox = { left: spot.left, top: spot.top, width };
    frogEl.style.left = `${spot.left}px`;
    frogEl.style.top = `${spot.top}px`;
    zone = links.length
      ? flightZone({
          buttonsRight: Math.max(...links.map((rect) => rect.right)) - base.left,
          buttonsTop: Math.min(...links.map((rect) => rect.top)) - base.top,
          statsTop,
          right: stats.right - base.left,
          frogLeft: spot.left,
        })
      : null;
  }

  const toFrog = (point) => toFrogSpace(point, frogBox);
  const syncMotionAttribute = () => {
    layer.dataset.frogMotion = isReduced
      ? "reduced"
      : isPaused
        ? "paused"
        : isOffscreen
          ? "offscreen"
          : "running";
  };

  // ---------- butterfly ----------
  const placeFly = () =>
    gsap.set(flyEl, { x: fly.x - BUTTERFLY_CENTER.x, y: fly.y - BUTTERFLY_CENTER.y });
  const randomInZone = () => ({
    x: gsap.utils.random(zone.x0, zone.x1),
    y: gsap.utils.random(zone.y0, zone.y1),
  });

  function flap(period = BUTTERFLY.flap) {
    flight.to(wings, {
      scaleX: 0.22,
      duration: period / 2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  function flyTo(point, { duration, ease = "sine.inOut", onComplete } = {}) {
    const dx = point.x - fly.x;
    const distance = Math.hypot(dx, point.y - fly.y);
    flight.to(tilt, { rotation: clamp(dx * 0.25, -14, 14), duration: 0.3, overwrite: "auto" });
    flight.to(fly, {
      x: point.x,
      y: point.y,
      duration: duration ?? clamp(distance / between(BUTTERFLY.speed), 0.35, 3),
      ease,
      overwrite: "auto",
      onUpdate: placeFly,
      onComplete,
    });
  }

  function wander() {
    if (zone) flyTo(randomInZone(), { onComplete: wander });
  }

  function startle() {
    if (!zone) return;
    const point = { x: gsap.utils.random(zone.x0, zone.x1), y: zone.y0 + gsap.utils.random(0, 12) };
    const distance = Math.hypot(point.x - fly.x, point.y - fly.y);
    flyTo(point, {
      duration: clamp(distance / BUTTERFLY.dart, 0.25, 0.8),
      ease: "power2.out",
      onComplete: wander,
    });
  }

  /** enter · exit · still (perched beside the frog) · hidden · resume (take off from where it is) */
  function butterfly(mode) {
    flight.stop();
    if (!zone || mode === "hidden") {
      gsap.set(flyEl, { autoAlpha: 0 });
      return;
    }
    if (mode === "still") {
      fly.x = Math.max(zone.x0, frogBox.left - 16);
      fly.y = statsTop - 7;
      placeFly();
      gsap.set(wings, { scaleX: 0.55 });
      gsap.set(tilt, { rotation: 0 });
      gsap.set(flyEl, { autoAlpha: 1 });
      return;
    }
    if (mode === "exit") {
      flap(BUTTERFLY.flap * 0.85);
      flyTo({ x: fly.x + 90, y: fly.y - 80 }, { duration: BUTTERFLY.exit, ease: "power2.in" });
      flight.to(flyEl, { autoAlpha: 0, duration: BUTTERFLY.exit, ease: "power2.in" });
      return;
    }
    if (mode === "enter") {
      fly.x = zone.x1 + 40;
      fly.y = gsap.utils.random(zone.y0, zone.y1);
      placeFly();
    }
    gsap.set(flyEl, { autoAlpha: 1 });
    gsap.set(wings, { scaleX: 1 });
    flap();
    if (mode === "enter") {
      flyTo(randomInZone(), { duration: BUTTERFLY.enter, ease: "power3.out", onComplete: wander });
    } else {
      wander();
    }
  }

  // ---------- frog ----------
  function look(target, duration = 0.2) {
    pupils.forEach((pupil, i) => {
      const offset = pupilOffset(EYES[i], target);
      frog.to(pupil, { ...offset, duration, ease: "power2.out", overwrite: "auto" });
    });
  }

  function every(range, callback, { evenIfBusy = false } = {}) {
    const step = () => {
      if (evenIfBusy || !isBusy) callback();
      frog.after(between(range), step);
    };
    frog.after(between(range), step);
  }

  function action() {
    isBusy = true;
    return frog.timeline({ onComplete: () => (isBusy = false) });
  }

  function blink() {
    const { close, open } = FROG_TIMING.blink;
    frog
      .timeline()
      .to(eyeballs, { scaleY: 0.12, duration: close, ease: "power2.in", overwrite: "auto" })
      .to(eyeballs, { scaleY: 1, duration: open, ease: "power2.out" });
  }

  function land(timeline) {
    const { land: landing, settle } = FROG_TIMING.hop;
    return timeline
      .to(body, { scaleY: SQUASH.landY, scaleX: SQUASH.landX, duration: landing, ease: "power2.out" })
      .to(body, { scaleY: 1, scaleX: 1, duration: settle, ease: "power2.out" });
  }

  function catchDrop() {
    const { tongueAt, caughtAt, tongueOut, tongueBack } = catchTiming();
    const { from, catchAt } = RAINDROP;
    gsap.set(drop, { x: from.x, y: from.y, autoAlpha: 1 });
    look({ x: from.x, y: from.y + 4 }, 0.25);
    action()
      .to(drop, { y: catchAt.y, duration: caughtAt, ease: "power2.in" }, 0)
      .add(() => look(catchAt, 0.2), tongueAt - 0.2)
      .to(tongue, { attr: { x2: catchAt.x, y2: catchAt.y }, duration: tongueOut, ease: "power2.out" }, tongueAt)
      .set(drop, { autoAlpha: 0 }, caughtAt)
      .to(tongue, { attr: { x2: MOUTH.x, y2: MOUTH.y }, duration: tongueBack, ease: "power2.in" }, caughtAt)
      .to(gulp, { scale: 1.25, duration: 0.1, ease: "power2.out" }, caughtAt + 0.12)
      .to(gulp, { scale: 1, duration: 0.2, ease: "power2.inOut" })
      .to(eyeballs, { scaleY: 0.3, duration: 0.08, yoyo: true, repeat: 1 }, caughtAt + 0.14)
      .add(() => look(RAIN_LOOK, 0.4), caughtAt + 0.4);
  }

  function hopAtButterfly() {
    const { squash, rise, fall } = FROG_TIMING.hop;
    const scale = frogBox.width / FROG_ART.width;
    const mouth = { x: frogBox.left + MOUTH.x * scale, y: frogBox.top + MOUTH.y * scale };
    const isInReach =
      zone && Math.hypot(fly.x - mouth.x, fly.y - mouth.y) <= SNAP_RANGE;
    const height = isInReach ? HOP_HEIGHT : HOP_HEIGHT / 2;
    const timeline = action()
      .to(body, { scaleY: SQUASH.landY, scaleX: SQUASH.landX, duration: squash, ease: "power2.out" })
      .to(body, { y: -height, scaleY: SQUASH.stretchY, scaleX: SQUASH.stretchX, duration: rise, ease: "power2.out" })
      .to(body, { y: 0, scaleY: 1, scaleX: 1, duration: fall, ease: "power2.in" });
    if (isInReach) {
      const apex = squash + rise;
      // The body is `height` units up at the apex, so aim from there.
      const target = toFrog(fly);
      const tip = tongueTip({ x: target.x, y: target.y + height });
      // A butterfly overhead gets a leap; the tongue only goes where it misses the eyes.
      if (tongueClearsEyes(tip)) {
        timeline
          .to(tongue, { attr: { x2: tip.x, y2: tip.y }, duration: 0.08, ease: "power2.out" }, apex - 0.04)
          .to(tongue, { attr: { x2: MOUTH.x, y2: MOUTH.y }, duration: 0.12, ease: "power2.in" }, apex + 0.04);
      }
      timeline.add(startle, apex);
    }
    land(timeline).add(blink);
  }

  /** Wind down whatever action the switch interrupted, from where it is. */
  function settleAction() {
    gsap.set(drop, { autoAlpha: 0 });
    frog.to(body, { x: 0, y: 0, duration: 0.15, ease: "power2.out" });
    frog.to(tongue, { attr: { x2: MOUTH.x, y2: MOUTH.y }, duration: 0.12, ease: "power2.in" });
    frog.to(gulp, { scale: 1, duration: 0.15 });
    frog.to(eyeballs, { scaleY: 1, duration: 0.1 });
  }

  function react(isNight) {
    settleAction();
    const timeline = action();
    if (isNight) {
      look(RAIN_LOOK, 0.3);
      return timeline
        .to(body, { scaleY: SQUASH.stretchY, scaleX: SQUASH.stretchX, duration: 0.25, ease: "power2.out" })
        .to(body, { scaleY: 1, scaleX: 1, duration: 0.25, ease: "power2.inOut" });
    }
    return timeline.to(body, {
      keyframes: { rotation: [0, 4, -4, 4, -4, 3, 0] },
      duration: FROG_TIMING.reaction.day,
      ease: "none",
    });
  }

  function enter(isNight) {
    const { squash: crouch, rise, fall } = FROG_TIMING.hop;
    hasEntered = true;
    gsap.set(frogEl, { autoAlpha: 1 });
    gsap.set(body, { x: 40, y: 0, autoAlpha: 0 });
    if (isNight) look(RAIN_LOOK, 0.01);
    const timeline = action()
      .to(body, { autoAlpha: 1, duration: crouch }, 0)
      .to(body, { x: 0, duration: rise + fall + crouch, ease: "power1.out" }, 0)
      .to(body, { y: -16, duration: rise + crouch / 2, ease: "power2.out" }, 0)
      .to(body, { y: 0, duration: fall + crouch / 2, ease: "power2.in" }, rise + crouch / 2);
    return land(timeline);
  }

  function live(isNight) {
    frog.to(throat, {
      scale: 1,
      duration: isNight ? FROG_TIMING.throat.night : FROG_TIMING.throat.day,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    every(FROG_TIMING.blink.every, blink, { evenIfBusy: true });
    if (isNight) {
      look(RAIN_LOOK, 0.3);
      every(FROG_TIMING.action.night, catchDrop);
      return;
    }
    every(FROG_TIMING.follow, () => zone && look(toFrog(fly), 0.18), { evenIfBusy: true });
    every(FROG_TIMING.action.day, hopAtButterfly);
  }

  /** The still frame of a mood: reduced motion, paused, or scrolled away. */
  function pose(isNight) {
    hasEntered = true;
    gsap.set(frogEl, { autoAlpha: 1 });
    gsap.set(body, { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, autoAlpha: 1 });
    gsap.set(throat, { scale: 0.55 });
    gsap.set(gulp, { scale: 1 });
    gsap.set(eyeballs, { scaleY: 1 });
    gsap.set(tongue, { attr: { x2: MOUTH.x, y2: MOUTH.y } });
    gsap.set(drop, { autoAlpha: 0 });
    const target = isNight ? RAIN_LOOK : zone ? toFrog(fly) : DAY_LOOK;
    pupils.forEach((pupil, i) => gsap.set(pupil, pupilOffset(EYES[i], target)));
  }

  function stopAll() {
    frog.stop();
    flight.stop();
    isBusy = false;
  }

  const isStill = () => isReduced || isPaused || isOffscreen;

  function holdStill(isNight) {
    stopAll();
    butterfly(isNight ? "hidden" : "still");
    pose(isNight);
  }

  function setTheme(next) {
    if (next === theme) return;
    const isFirst = theme === null;
    const isNight = next === "dark";
    theme = next;
    layer.dataset.frogMood = isNight ? "night" : "day";

    if (isStill()) {
      holdStill(isNight);
      isStale = !isReduced;
      return;
    }

    stopAll();
    // A switch before the frog has arrived still has to bring it in.
    if (isFirst || !hasEntered) {
      const wait = Math.max(0, FROG_TIMING.entrance.after - performance.now() / 1000);
      frog.after(wait, () => {
        measure();
        if (!isNight) butterfly("enter");
        enter(isNight).eventCallback("onComplete", () => {
          isBusy = false;
          live(isNight);
        });
      });
      return;
    }

    butterfly(isNight ? "exit" : "enter");
    react(isNight).eventCallback("onComplete", () => {
      isBusy = false;
      live(isNight);
    });
  }

  /** Pause and scrolling away freeze the frame; coming back resumes it. */
  function syncFrozen() {
    syncMotionAttribute();
    if (isReduced || theme === null) return;
    const shouldFreeze = isPaused || isOffscreen;
    frog.freeze(shouldFreeze);
    flight.freeze(shouldFreeze);
    if (shouldFreeze || !isStale) return;

    isStale = false;
    const isNight = theme === "dark";
    stopAll();
    if (!isNight) butterfly("resume");
    live(isNight);
  }

  // ---------- environment ----------
  const onReducedChange = (event) => {
    isReduced = event.matches;
    if (theme === null) {
      syncMotionAttribute();
      return;
    }
    if (isReduced) {
      holdStill(theme === "dark");
      syncMotionAttribute();
      return;
    }
    isStale = true;
    syncFrozen();
  };

  const relayout = () => {
    if (isDisposed) return;
    measure();
    if (zone && Number(gsap.getProperty(flyEl, "autoAlpha")) > 0) {
      fly.x = clamp(fly.x, zone.x0, zone.x1);
      fly.y = clamp(fly.y, zone.y0, zone.y1);
      placeFly();
    }
  };

  const visibility = new IntersectionObserver(([entry]) => {
    isOffscreen = !entry.isIntersecting;
    syncFrozen();
  });
  const sizes = new ResizeObserver(relayout);

  measure();
  syncMotionAttribute();
  visibility.observe(layer);
  sizes.observe(layer);
  // The stats card slides 12px while it fades in, and web fonts can reflow the
  // buttons: measure again once both have settled.
  statsEl.addEventListener("animationend", relayout);
  document.fonts?.ready.then(relayout);
  reducedQuery.addEventListener("change", onReducedChange);

  return {
    setTheme,
    setPaused(next) {
      isPaused = next;
      syncFrozen();
    },
    dispose() {
      isDisposed = true;
      visibility.disconnect();
      sizes.disconnect();
      statsEl.removeEventListener("animationend", relayout);
      reducedQuery.removeEventListener("change", onReducedChange);
      stopAll();
      ctx.revert();
      delete layer.dataset.frogMotion;
      delete layer.dataset.frogMood;
    },
  };
}

/**
 * A small frog perched on the hero's stats card. Night: it enjoys the rain and
 * catches raindrops. Day: its eyes follow a butterfly it keeps trying to catch.
 * It only ever sits or flies in empty space, never over text. Lazy-loaded.
 */
export default function HeroFrog({ buttonsRef, statsRef }) {
  const { theme } = useTheme();
  const { isPaused } = useBackgroundMotion();
  const layerRef = useRef(null);
  const frogRef = useRef(null);
  const flyRef = useRef(null);
  const directorRef = useRef(null);

  useEffect(() => {
    const director = createFrogDirector({
      layer: layerRef.current,
      frogEl: frogRef.current,
      flyEl: flyRef.current,
      statsEl: statsRef.current,
      buttonsEl: buttonsRef.current,
    });
    directorRef.current = director;
    return () => {
      director.dispose();
      directorRef.current = null;
    };
  }, [buttonsRef, statsRef]);

  // Pause is applied before the theme so the first scene already knows it.
  useEffect(() => {
    directorRef.current?.setPaused(isPaused);
  }, [isPaused]);

  useEffect(() => {
    directorRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <div
      ref={layerRef}
      data-hero-frog
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
    >
      <div ref={frogRef} data-critter="frog" className="absolute w-[52px] md:w-[64px]">
        <FrogArt />
      </div>
      <div ref={flyRef} data-critter="butterfly" className="absolute left-0 top-0 w-[22px]">
        <ButterflyArt />
      </div>
    </div>
  );
}
