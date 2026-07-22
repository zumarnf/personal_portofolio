import { aboutParagraphs, aboutHighlights } from "@/data/about";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";

export default function About() {
  return (
    <Section id="about">
      <SectionHeading index="01" label="About" title="A bit about me" />

      <div className="max-w-2xl space-y-5">
        {aboutParagraphs.map((paragraph, index) => (
          <p key={index} className="text-pretty leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {aboutHighlights.map((item, index) => (
          <div
            key={item.label}
            className="stagger bg-background p-6 transition-colors hover:bg-card"
            style={{ "--i": index }}
          >
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
