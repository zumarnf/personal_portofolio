import { useSyncExternalStore } from "react";

/**
 * Light/dark theme backed by the `dark` class on <html>. The class is the single
 * source of truth: the inline script in index.html sets it before paint (no
 * flash), and every consumer — both navbar toggles and the sky scene — reads
 * it through this store, so they can never disagree.
 */
const STORAGE_KEY = "theme";
const SWITCHING_CLASS = "theme-switching";
// Matches the colour transition on .theme-switching in index.css
// (TIMING.pageFade in skyMotion.js).
const PAGE_FADE_MS = 400;
let switchTimer = null;

function readTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function applyTheme(next) {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore storage errors (e.g. private mode)
  }
}

/**
 * Fades the page colours with a CSS transition scoped to the switch (the
 * timing lives on .theme-switching in index.css). Not the View Transitions
 * API: its snapshot of the old page froze the sky mid-animation (two moons on
 * screen at once), swallowed clicks for the whole fade, and was slower to
 * composite. CSS transitions keep the sky live underneath and reverse smoothly
 * when the toggle is pressed again. Reduced motion: instant swap.
 */
function switchTheme(next) {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  window.clearTimeout(switchTimer);
  if (prefersReducedMotion) {
    root.classList.remove(SWITCHING_CLASS);
    applyTheme(next);
    return;
  }

  root.classList.add(SWITCHING_CLASS);
  applyTheme(next);
  switchTimer = window.setTimeout(
    () => root.classList.remove(SWITCHING_CLASS),
    PAGE_FADE_MS + 50
  );
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light");
  const toggleTheme = () => switchTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggleTheme };
}
