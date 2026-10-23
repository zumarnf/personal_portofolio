import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/** Light/dark toggle button, with the same 44px touch target as MotionToggle. */
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors before:absolute before:-inset-[5px] hover:border-accent hover:text-foreground ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
