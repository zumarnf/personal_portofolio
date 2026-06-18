import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * Shared section shell: consistent vertical rhythm, centered container,
 * and a scroll-reveal animation. Sections only describe their content.
 */
export default function Section({
  id,
  children,
  className = "",
  containerClassName = "",
}) {
  const reveal = useScrollReveal();

  return (
    <section id={id} className={`px-6 py-24 md:py-32 ${className}`}>
      <div
        ref={reveal}
        className={`reveal mx-auto w-full max-w-4xl ${containerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
