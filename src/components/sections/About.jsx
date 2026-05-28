import { aboutParagraphs, aboutHighlights } from "@/data/about";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function About() {
  const reveal = useScrollReveal();

  return (
    <section id="about" className="px-6 py-20">
      <div ref={reveal} className="reveal max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            About Me
          </h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <div className="space-y-6">
          {aboutParagraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-lg text-muted-foreground leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {aboutHighlights.map((item, index) => (
            <div
              key={index}
              className="p-6 rounded-lg bg-card border border-border hover:border-accent hover:-translate-y-1 transition-all duration-300"
            >
              <p className="font-semibold text-foreground mb-2">{item.label}</p>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
