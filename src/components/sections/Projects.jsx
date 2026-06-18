import { projects } from "@/data/projects";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Tag from "@/components/ui/Tag";

export default function Projects() {
  return (
    <Section id="projects">
      <SectionHeading index="03" label="Projects" title="Selected work" />

      <div className="border-t border-border">
        {projects.map((project, index) => (
          <article
            key={index}
            className="group grid gap-4 border-b border-border py-8 md:grid-cols-[auto_1fr] md:gap-8"
          >
            <span className="font-mono text-sm text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>

            <div>
              <h3 className="text-xl font-semibold text-foreground transition-colors group-hover:text-accent">
                {project.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {project.highlights.map((highlight) => (
                  <Tag key={highlight}>{highlight}</Tag>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
