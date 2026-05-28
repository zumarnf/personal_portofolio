import { projects } from "@/data/projects";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Projects() {
  const reveal = useScrollReveal();

  return (
    <section id="projects" className="px-6 py-20">
      <div ref={reveal} className="reveal max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Featured Projects</h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <div className="grid gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group bg-card border border-border rounded-lg p-8 hover:border-accent hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">{project.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.highlights.map((highlight, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-muted text-foreground text-sm rounded-full border border-border hover:border-accent transition-colors"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
