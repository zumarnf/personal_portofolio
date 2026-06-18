/**
 * Editorial section heading: a mono index/label line over a quiet title.
 * Replaces the repeated "title + accent underline" block across sections.
 */
export default function SectionHeading({ index, label, title, className = "" }) {
  return (
    <div className={`mb-14 ${className}`}>
      <div className="mb-5 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-accent">{index}</span>
        <span className="h-px w-8 bg-border" />
        <span>{label}</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground text-balance">
        {title}
      </h2>
    </div>
  );
}
