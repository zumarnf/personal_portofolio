import { experiences } from "@/data/experience";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Experience() {
  return (
    <Section id="experience">
      <SectionHeading index="02" label="Experience" title="Where I've worked" />

      <div className="space-y-10">
        {experiences.map((exp, index) => (
          <article
            key={index}
            className="stagger grid gap-3 border-t border-border pt-8 md:grid-cols-[1fr_2fr] md:gap-8"
            style={{ "--i": index }}
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {exp.period}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground/70">
                {exp.location}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground">{exp.role}</h3>
              <p className="mt-0.5 text-sm text-accent">{exp.company}</p>
              <ul className="mt-4 space-y-2.5">
                {exp.highlights.map((highlight, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-2.5 h-px w-3 shrink-0 bg-accent" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
