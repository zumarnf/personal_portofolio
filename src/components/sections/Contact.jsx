import { ArrowUpRight } from "lucide-react";
import { contactInfo } from "@/data/contact";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Contact() {
  return (
    <Section id="contact">
      <SectionHeading index="05" label="Contact" title="Let's work together" />

      <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
        I&apos;m always interested in new projects and opportunities. Whether you
        have a question or just want to say hello, feel free to reach out.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {contactInfo.map((info) => {
          const Icon = info.icon;
          const isLink = Boolean(info.href) && info.href !== "#";
          const Wrapper = isLink ? "a" : "div";

          return (
            <Wrapper
              key={info.label}
              href={isLink ? info.href : undefined}
              className="group flex flex-col gap-4 bg-background p-6 transition-colors hover:bg-card"
            >
              <span className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-accent" />
                {isLink && (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                )}
              </span>
              <span>
                <span className="block font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {info.label}
                </span>
                <span className="mt-1 block break-words text-sm font-medium text-foreground transition-colors group-hover:text-accent">
                  {info.value}
                </span>
              </span>
            </Wrapper>
          );
        })}
      </div>
    </Section>
  );
}
