export default function Experience() {
  const experiences = [
    {
      role: 'Frontend Web Developer Intern',
      company: 'Telkom University SPM',
      period: 'September 2024 – January 2025',
      location: 'Surabaya, Indonesia',
      highlights: [
        'Designed and developed minimalist, user-centric wireframes and prototypes for the internal SPMIA website',
        'Created an intuitive platform that streamlined access to critical accreditation information',
        'Improved overall workflow efficiency within the quality assurance unit',
      ],
    },
    {
      role: 'Asset Management (Student Staff)',
      company: 'Telkom University Logistics',
      period: 'March 2025 – October 2025',
      location: 'Surabaya, Indonesia',
      highlights: [
        'Managed precise recording and cataloging of institutional assets for academic and operational needs',
        'Maintained accuracy of asset management system with real-time updates',
        'Conducted inventory verification to ensure data integrity and audit readiness',
      ],
    },
  ]

  return (
    <section id="experience" className="md:ml-64 px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Experience</h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div
              key={index}
              className="relative pl-8 pb-12 border-l-2 border-border hover:border-accent transition-colors"
            >
              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-accent border-4 border-background"></div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-1">{exp.role}</h3>
                <p className="text-accent font-medium mb-1">{exp.company}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {exp.period} • {exp.location}
                </p>
                <ul className="space-y-2">
                  {exp.highlights.map((highlight, i) => (
                    <li key={i} className="text-muted-foreground flex gap-3">
                      <span className="text-accent mt-1">▸</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
