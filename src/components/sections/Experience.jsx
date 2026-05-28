import { experiences } from "@/data/experience";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Experience() {
  const reveal = useScrollReveal();

  return (
    <section id="experience" className="px-6 py-20">
      <div ref={reveal} className="reveal max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Experience</h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div
              key={index}
              className="relative pl-8 pb-12 border-l-2 border-border hover:border-accent transition-colors"
            >
              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-accent border-4 border-background"></div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-1">{exp.role}</h3>
                <p className="text-accent font-medium mb-1">{exp.company}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {exp.period} • {exp.location}
                </p>
                <ul className="space-y-2">
                  {exp.highlights.map((highlight, i) => (
                    <li key={i} className="text-muted-foreground flex gap-3">
                      <span className="text-accent mt-1">▸</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
