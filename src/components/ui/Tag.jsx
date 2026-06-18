/** Small hairline tag used for skills, tech stacks, and project meta. */
export default function Tag({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground ${className}`}
    >
      {children}
    </span>
  );
}
