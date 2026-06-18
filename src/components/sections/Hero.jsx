import { ArrowUpRight } from "lucide-react";

const stats = [
  { value: "03", label: "Internships & roles" },
  { value: "02", label: "Projects shipped" },
  { value: "3.83", label: "GPA (graduated)" },
];

export default function Hero() {
  return (
    <section id="hero" className="flex min-h-screen items-center px-6 pt-16">
      <div className="mx-auto w-full max-w-4xl">
        <div className="animate-fade-in-up">
          <p className="mb-6 inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Available for new projects
          </p>
          <h1 className="text-balance text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
            Zumar Nur Firdaus
          </h1>
          <p className="mt-4 text-xl text-muted-foreground md:text-2xl">
            Frontend Developer
          </p>
          <p className="mt-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            <span className="h-px w-6 bg-accent/50" />
            Vibe Coder
          </p>
        </div>

        <p
          className="mt-8 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground animate-fade-in-up md:text-lg"
          style={{ animationDelay: "0.1s" }}
        >
          IT graduate building elegant, user-centric web experiences with React
          and TypeScript — backed by clean, efficient code and a sharp eye for
          detail. Based in Gresik, East Java.
        </p>

        <div
          className="mt-10 flex flex-col gap-3 sm:flex-row animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <a
            href="#contact"
            className="group inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            Get in touch
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#projects"
            className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            View work
          </a>
        </div>

        <dl
          className="mt-20 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="bg-background p-5 md:p-6">
              <dt className="font-mono text-3xl font-semibold text-foreground md:text-4xl">
                {stat.value}
              </dt>
              <dd className="mt-2 text-xs text-muted-foreground md:text-sm">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
