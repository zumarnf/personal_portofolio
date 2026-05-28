import { useEffect, useState } from "react";

/**
 * Tracks which section is currently in view (scroll-spy).
 * Pass a stable array of section ids; returns the id of the active section.
 */
export function useActiveSection(sectionIds, { rootMargin = "-45% 0px -50% 0px" } = {}) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin, threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds, rootMargin]);

  return activeId;
}
