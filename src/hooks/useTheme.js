import { useEffect, useState } from "react";

/**
 * Light/dark theme state synced with the `dark` class on <html>.
 * The initial class is set by an inline script in index.html (no flash),
 * so here we only read the current value and persist explicit toggles.
 */
function getInitialTheme() {
  if (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  ) {
    return "dark";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme", next);
      } catch {
        // Ignore storage errors (e.g. private mode)
      }
      return next;
    });

  return { theme, toggleTheme };
}
