const socialLinks = [
  { label: "GitHub", href: "https://github.com/zumarnf" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/zumar-nur-firdaus-ba22a3304",
  },
  { label: "Email", href: "mailto:zumarnf29@gmail.com" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-foreground">
            Zumar Nur Firdaus
          </p>
          <p className="text-sm text-muted-foreground">
            © {currentYear} — Built with React, Vite &amp; Tailwind CSS
          </p>
        </div>

        <div className="flex gap-6">
          {socialLinks.map((link) => {
            const isExternal = link.href.startsWith("http");
            return (
              <a
                key={link.label}
                href={link.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
