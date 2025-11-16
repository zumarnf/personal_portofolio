export default function About() {
  return (
    <section id="about" className="md:ml-64 px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            About Me
          </h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <div className="space-y-6">
          <p className="text-lg text-muted-foreground leading-relaxed">
            I'm a passionate Frontend Developer and UI/UX Designer from Telkom
            University with a strong foundation in IT principles and a genuine
            love for coding. My journey in technology has been driven by a
            desire to create functional, user-friendly digital experiences that
            are both beautiful and efficient.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            As a self-driven individual, I actively explore new knowledge within
            the rapidly evolving tech landscape. My expertise spans modern
            frontend frameworks, responsive design, and user-centric design
            principles. I excel in collaborative environments and consistently
            contribute to team success through effective communication and
            problem-solving.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Currently, I'm focused on leveraging my experience to create
            impactful digital solutions. Whether it's crafting intuitive
            interfaces or optimizing code, I approach every project with
            meticulous attention to detail and a commitment to excellence.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: "UI/UX Design",
              description: "Creating beautiful and functional interfaces",
            },
            {
              label: "Frontend Development",
              description: "Building responsive web applications",
            },
            {
              label: "Problem Solving",
              description: "Tackling complex challenges creatively",
            },
            {
              label: "Collaboration",
              description: "Working effectively in team environments",
            },
            {
              label: "Responsive Design",
              description: "Designing for all screen sizes",
            },
            {
              label: "Performance",
              description: "Optimizing for speed and efficiency",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="p-6 rounded-lg bg-card border border-border hover:border-accent transition-colors"
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
