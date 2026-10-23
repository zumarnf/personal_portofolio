import { Pause, Play } from "lucide-react";
import { useBackgroundMotion } from "@/hooks/useBackgroundMotion";

/**
 * Pause/resume the ambient background. Pressed = paused.
 * The ::before inset is measured from the 34px padding box (1px border), so
 * -5px on each side gives a 44px touch target around the 36px button.
 */
export default function MotionToggle({ className = "" }) {
  const { isPaused, togglePaused } = useBackgroundMotion();

  return (
    <button
      type="button"
      onClick={togglePaused}
      aria-pressed={isPaused}
      aria-label="Pause background animation"
      title={isPaused ? "Resume background animation" : "Pause background animation"}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors before:absolute before:-inset-[5px] hover:border-accent hover:text-foreground ${className}`}
    >
      {isPaused ? (
        <Play className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Pause className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
