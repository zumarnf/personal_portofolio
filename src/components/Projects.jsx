import { ExternalLink, Github } from 'lucide-react'

export default function Projects() {
  const projects = [
    {
      title: 'BERT-Powered Telegram Chatbot for SPM',
      description: 'Engineered an advanced Telegram chatbot using BERT model to automate access to Internal Quality Assurance data, reducing manual effort and response time for university stakeholders.',
      highlights: ['BERT Model', 'Telegram API', '4000+ Training Variations', 'NLP'],
    },
    {
      title: 'SPM Data Management Web Application',
      description: 'Built a comprehensive frontend data collection portal using ReactJS housing 500+ critical university data points with a modern, responsive interface integrated with Laravel backend.',
      highlights: ['React.js', 'Laravel', 'Figma Design', 'UI/UX'],
    },
  ]

  return (
    <section id="projects" className="md:ml-64 px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Featured Projects</h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <div className="grid gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group bg-card border border-border rounded-lg p-8 hover:border-accent hover:shadow-lg transition-all duration-300"
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
  )
}
