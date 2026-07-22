import { skillCategories, education } from "@/data/skills";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Tag from "@/components/ui/Tag";

export default function Skills() {
  return (
    <Section id="skills">
      <SectionHeading index="04" label="Skills" title="Tools & expertise" />

      <div className="divide-y divide-border border-y border-border">
        {skillCategories.map((category, index) => (
          <div
            key={category.category}
            className="stagger grid gap-4 py-6 md:grid-cols-[1fr_2fr] md:gap-8"
            style={{ "--i": index }}
          >
            <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {category.category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {category.skills.map((skill) => (
                <Tag key={skill}>{skill}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-lg border border-border p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Education
        </p>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {education.degree}
        </h3>
        <p className="mt-1 text-sm text-accent">{education.institution}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {education.period}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {education.coursework}
        </p>
      </div>
    </Section>
  );
}
