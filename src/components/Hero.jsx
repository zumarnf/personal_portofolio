import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="hero"
      className="md:ml-64 min-h-screen flex items-center justify-center px-6 py-20"
    >
      <div className="max-w-4xl w-full animate-fade-in">
        <div className="mb-8">
          <span className="inline-block text-xs font-mono text-accent mb-4 uppercase tracking-wider">
            Welcome to my portfolio
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
            Frontend Developer & UI/UX Designer
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-8 text-balance">
            I create elegant, minimalist digital experiences with a focus on
            user-centric design and clean, efficient code. Currently based in
            Gresik, East Java.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-opacity-90 transition-all duration-300 font-semibold"
          >
            Get in Touch
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="#projects"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-all duration-300 font-semibold"
          >
            View My Work
          </a>
        </div>

        <div className="mt-20 pt-12 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8 font-medium">
            Quick Stats
          </p>
          <div className="grid grid-cols-3 gap-6 md:gap-10">
            {/* Stat Card 1 */}
            <div className="group">
              <div className="bg-gradient-to-br from-accent/10 to-transparent p-6 rounded-xl border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5">
                <p className="text-4xl md:text-5xl font-bold text-accent mb-3">
                  1
                </p>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  Years in Tech
                </p>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="group">
              <div className="bg-gradient-to-br from-accent/10 to-transparent p-6 rounded-xl border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5">
                <p className="text-4xl md:text-5xl font-bold text-accent mb-3">
                  2
                </p>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  Projects Completed
                </p>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="group">
              <div className="bg-gradient-to-br from-accent/10 to-transparent p-6 rounded-xl border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5">
                <p className="text-4xl md:text-5xl font-bold text-accent mb-3">
                  3.83
                </p>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  GPA (Graduated)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
