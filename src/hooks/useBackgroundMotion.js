import { useSyncExternalStore } from "react";

/**
 * Lets visitors stop the ambient background (rain, petals, glowing sky). WCAG
 * 2.2.2 requires moving content that runs longer than five seconds to be
 * stoppable; prefers-reduced-motion alone does not cover people who never set it.
 * The choice is remembered per browser.
 */
const STORAGE_KEY = "background-motion";
const listeners = new Set();

function readStoredPaused() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "paused";
  } catch {
    return false;
  }
}

let isPaused = readStoredPaused();

function subscribe(onChange) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function setPaused(next) {
  isPaused = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, "paused");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors (e.g. private mode)
  }
  listeners.forEach((listener) => listener());
}

export function useBackgroundMotion() {
  const paused = useSyncExternalStore(subscribe, () => isPaused, () => false);
  const togglePaused = () => setPaused(!paused);

  return { isPaused: paused, togglePaused };
}
