export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="md:ml-64 border-t border-border bg-card">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <p className="text-sm text-muted-foreground">
              © {currentYear} Zumar Nur Firdaus. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Designed & Built with React, Vite & Tailwind CSS
            </p>
          </div>

          <div className="flex gap-6">
            <a
              href="https://github.com/zumarnf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-accent transition-colors text-sm font-medium"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/zumar-nur-firdaus-ba22a3304"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-accent transition-colors text-sm font-medium"
            >
              LinkedIn
            </a>
            <a
              href="mailto:zumarnf29@gmail.com"
              className="text-muted-foreground hover:text-accent transition-colors text-sm font-medium"
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
