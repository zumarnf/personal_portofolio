import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Moon, Sun } from "@/components/sky/CelestialBodies";
import { createWeather } from "@/components/sky/weather";
import {
  BODY_BOX_RATIO,
  CURVES,
  HIDDEN_SCALE,
  PARTICLES,
  REST,
  RISE_POINT,
  SET_POINT,
  TIMING,
  arcControl,
  quadraticPoint,
  sceneFor,
} from "@/components/sky/skyMotion";
import { useTheme } from "@/hooks/useTheme";
import { useBackgroundMotion } from "@/hooks/useBackgroundMotion";

gsap.registerPlugin(CustomEase);

const EASES = Object.fromEntries(
  Object.entries(CURVES).map(([name, points]) => [
    name,
    CustomEase.create(`sky-${name}`, points.join(",")),
  ])
);
const INVISIBLE = 0.02;

/**
 * Drives the sky imperatively: GSAP owns every tween (bodies, weather
 * intensity), the WebGL weather renders from gsap.ticker only while something
 * needs frames, and every switch starts from the current values so a second
 * click mid-transition reverses smoothly instead of jumping.
 */
function createSkyDirector({ root, weatherHost, sunEl, moonEl }) {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const counts = window.innerWidth < 768 ? PARTICLES.mobile : PARTICLES.desktop;
  const weather = createWeather(weatherHost, counts);
  const ctx = gsap.context(() => {}, root);

  const makeBody = (el) => ({
    el,
    ...RISE_POINT,
    arc: null,
    setX: gsap.quickSetter(el, "x", "px"),
    setY: gsap.quickSetter(el, "y", "px"),
  });
  const bodies = { sun: makeBody(sunEl), moon: makeBody(moonEl) };

  let theme = null;
  let isPaused = false;
  let isReduced = reducedQuery.matches;
  let isLooping = false;
  let holdFramesUntil = 0;
  let diameter = sunEl.offsetWidth / BODY_BOX_RATIO;

  const place = (body) => {
    body.setX(body.x * diameter);
    body.setY(body.y * diameter);
  };

  const syncMotionAttribute = () => {
    root.dataset.skyMotion = isReduced ? "reduced" : isPaused ? "paused" : "running";
  };

  // ---------- render loop ----------
  const wantsFrames = () =>
    Boolean(weather) &&
    !document.hidden &&
    (!(isPaused || isReduced) || performance.now() < holdFramesUntil);

  const tick = (_time, deltaMs) => {
    if (!wantsFrames()) {
      syncLoop();
      return;
    }
    if (!isPaused && !isReduced) weather.step(Math.min(deltaMs / 1000, 0.05));
    weather.render();
  };

  function syncLoop() {
    const shouldLoop = wantsFrames();
    if (shouldLoop && !isLooping) gsap.ticker.add(tick);
    if (!shouldLoop && isLooping) gsap.ticker.remove(tick);
    isLooping = shouldLoop;
  }

  const holdFramesFor = (seconds) => {
    holdFramesUntil = performance.now() + seconds * 1000;
    syncLoop();
  };

  // ---------- scene ----------
  const bodiesFor = (name) => {
    const scene = sceneFor(name);
    const incoming = bodies[scene.body];
    const outgoing = incoming === bodies.sun ? bodies.moon : bodies.sun;
    return { scene, incoming, outgoing };
  };

  function arcBody(body, target, { duration, delay, ease, leaving }) {
    body.arc?.kill();
    const from = { x: body.x, y: body.y };
    const control = arcControl(from, target, leaving);
    const progress = { t: 0 };
    body.arc = gsap.to(progress, {
      t: 1,
      duration,
      delay,
      ease,
      onUpdate: () => {
        Object.assign(body, quadraticPoint(from, control, target, progress.t));
        place(body);
      },
    });
  }

  /** Still frame of the current theme: reduced motion, or weather while paused. */
  function settleWeather() {
    if (!weather) return;
    const { scene } = bodiesFor(theme);
    gsap.killTweensOf(weather.state);
    weather.state.rain = scene.rain;
    weather.state.petals = scene.petals;
    weather.settle();
    weather.render();
  }

  function settle() {
    const { incoming, outgoing } = bodiesFor(theme);
    for (const body of [incoming, outgoing]) {
      body.arc?.kill();
      gsap.killTweensOf(body.el);
    }
    Object.assign(incoming, REST);
    Object.assign(outgoing, RISE_POINT);
    place(incoming);
    place(outgoing);
    gsap.set(incoming.el, { opacity: 1, scale: 1 });
    gsap.set(outgoing.el, { opacity: 0, scale: HIDDEN_SCALE });
    settleWeather();
  }

  function setTheme(next) {
    if (next === theme) return;
    const isFirst = theme === null;
    theme = next;
    root.dataset.skyTheme = next;
    weather?.refreshColors();

    if (isReduced) {
      settle();
      return;
    }

    const { scene, incoming, outgoing } = bodiesFor(next);
    ctx.add(() => {
      if (!isFirst) {
        arcBody(outgoing, SET_POINT, { ...TIMING.set, ease: EASES.set, leaving: true });
        gsap.to(outgoing.el, {
          ...TIMING.set,
          opacity: 0,
          scale: HIDDEN_SCALE,
          ease: EASES.set,
          overwrite: "auto",
        });
      }

      // A body that finished setting waits below the horizon on the far side.
      if (Number(gsap.getProperty(incoming.el, "opacity")) < INVISIBLE) {
        incoming.arc?.kill();
        Object.assign(incoming, RISE_POINT);
        place(incoming);
      }
      arcBody(incoming, REST, { ...TIMING.rise, ease: EASES.rise, leaving: false });
      gsap.to(incoming.el, {
        ...TIMING.rise,
        opacity: 1,
        scale: 1,
        ease: EASES.rise,
        overwrite: "auto",
      });

      if (weather && !isPaused) {
        const [arriving, leaving] = scene.rain ? ["rain", "petals"] : ["petals", "rain"];
        gsap.to(weather.state, {
          ...TIMING.weatherOut,
          [leaving]: 0,
          ease: EASES.weatherOut,
          overwrite: "auto",
        });
        gsap.to(weather.state, {
          ...TIMING.weatherIn,
          [arriving]: 1,
          ease: EASES.weatherIn,
          overwrite: "auto",
        });
      }
    });

    if (!weather) return;
    if (isPaused) {
      // Paused weather stays still; only the sky itself answers the click.
      settleWeather();
      return;
    }
    if (isFirst) {
      // Nothing is arriving on first paint: spread the weather over the view
      // and let it fade in, rather than waiting ~15 s for petals to fall down.
      weather.settle(scene);
    } else if (scene.rain) {
      weather.gust();
    } else {
      weather.breeze();
    }
    holdFramesFor(TIMING.weatherIn.delay + TIMING.weatherIn.duration);
  }

  function setPaused(next) {
    isPaused = next;
    syncMotionAttribute();
    syncLoop();
  }

  // ---------- environment ----------
  const onReducedChange = (event) => {
    isReduced = event.matches;
    syncMotionAttribute();
    if (isReduced && theme) settle();
    syncLoop();
  };

  const onResize = () => {
    diameter = sunEl.offsetWidth / BODY_BOX_RATIO;
    place(bodies.sun);
    place(bodies.moon);
    if (!weather) return;
    weather.resize();
    if (!isLooping) weather.render();
  };

  ctx.add(() => {
    gsap.set([sunEl, moonEl], { opacity: 0, scale: HIDDEN_SCALE });
    place(bodies.sun);
    place(bodies.moon);
  });
  syncMotionAttribute();
  reducedQuery.addEventListener("change", onReducedChange);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", syncLoop);

  return {
    setTheme,
    setPaused,
    dispose() {
      gsap.ticker.remove(tick);
      reducedQuery.removeEventListener("change", onReducedChange);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", syncLoop);
      ctx.revert();
      weather?.dispose();
      delete root.dataset.skyMotion;
      delete root.dataset.skyTheme;
    },
  };
}

/**
 * Theme sky behind all content: moon + rain in dark mode, sun + falling
 * cherry-blossom petals in light mode. Lazy-loaded with three.js and GSAP.
 */
export default function SkyScene() {
  const { theme } = useTheme();
  const { isPaused } = useBackgroundMotion();
  const rootRef = useRef(null);
  const weatherRef = useRef(null);
  const sunRef = useRef(null);
  const moonRef = useRef(null);
  const directorRef = useRef(null);

  useEffect(() => {
    const director = createSkyDirector({
      root: rootRef.current,
      weatherHost: weatherRef.current,
      sunEl: sunRef.current,
      moonEl: moonRef.current,
    });
    directorRef.current = director;
    return () => {
      director.dispose();
      directorRef.current = null;
    };
  }, []);

  // Pause is applied before the theme so the very first scene already knows it.
  useEffect(() => {
    directorRef.current?.setPaused(isPaused);
  }, [isPaused]);

  useEffect(() => {
    directorRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <div
      ref={rootRef}
      data-sky-scene
      aria-hidden="true"
      className="sky-scene pointer-events-none fixed inset-0 z-0"
    >
      <div className="sky-body">
        <div ref={sunRef} className="sky-body__inner" data-sky-body="sun">
          <Sun />
        </div>
      </div>
      <div className="sky-body">
        <div ref={moonRef} className="sky-body__inner" data-sky-body="moon">
          <Moon />
        </div>
      </div>
      {/* Weather in front of the sky: rain and petals are closer than the moon or sun */}
      <div ref={weatherRef} className="absolute inset-0 opacity-90" />
    </div>
  );
}
