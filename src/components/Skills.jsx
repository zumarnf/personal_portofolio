export default function Skills() {
  const skillCategories = [
    {
      category: 'Frontend Development',
      skills: ['JavaScript', 'React.js', 'Tailwind CSS', 'HTML/CSS', 'Responsive Design'],
    },
    {
      category: 'UI/UX Design',
      skills: ['Figma', 'Wireframing', 'Prototyping', 'User Research', 'Design Systems'],
    },
    {
      category: 'Backend & Tools',
      skills: ['Python', 'Laravel', 'Git/GitHub', 'VS Code', 'Google Colab'],
    },
    {
      category: 'Soft Skills',
      skills: ['Problem Solving', 'Collaboration', 'Time Management', 'Communication', 'Leadership'],
    },
  ]

  return (
    <section id="skills" className="md:ml-64 px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Skills & Expertise</h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {skillCategories.map((category, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors"
            >
              <h3 className="text-xl font-semibold text-foreground mb-4">{category.category}</h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-muted text-foreground text-sm rounded-lg border border-border hover:border-accent transition-colors cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-primary/5 to-accent/5 border border-accent/20 rounded-lg p-8 md:p-12">
          <h3 className="text-2xl font-semibold text-foreground mb-4">Education</h3>
          <div>
            <p className="text-lg font-semibold text-foreground">Bachelor of Information Technology</p>
            <p className="text-accent">Telkom University – Surabaya, Indonesia</p>
            <p className="text-sm text-muted-foreground mt-2">September 2021 – October 2025 • GPA: 3.83/4.00</p>
            <p className="text-muted-foreground mt-4">
              Relevant Coursework: Statistics, Data Analysis, Artificial Intelligence, Web Programming
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
