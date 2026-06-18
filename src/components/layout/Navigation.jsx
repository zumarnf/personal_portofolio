import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { navItems } from "@/data/navigation";
import { useActiveSection } from "@/hooks/useActiveSection";
import ThemeToggle from "@/components/ui/ThemeToggle";

const sectionIds = navItems.map((item) => item.href.replace("#", ""));

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeId = useActiveSection(sectionIds);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full animate-slide-down transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Wordmark */}
          <a
            href="#hero"
            className="font-mono text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-accent"
          >
            zumar<span className="text-accent">.</span>nf
          </a>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => {
              const isActive = activeId === item.href.replace("#", "");
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`group relative font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px bg-accent transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </a>
              );
            })}
            <ThemeToggle />
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-accent"
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {isOpen && (
          <div className="mb-4 space-y-1 rounded-lg border border-border bg-card/90 p-2 backdrop-blur-xl animate-slide-down md:hidden">
            {navItems.map((item) => {
              const isActive = activeId === item.href.replace("#", "");
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? "true" : undefined}
                  className={`block rounded-md px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
