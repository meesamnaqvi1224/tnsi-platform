export interface CalloutProps {
  title?: string;
  text: string;
}

export function Callout({ title, text }: CalloutProps) {
  return (
    <aside
      className="border-border bg-secondary/40 my-(--space-2xl) border-l-2 px-(--space-xl) py-(--space-lg)"
      aria-label={title ?? 'Highlighted note'}
    >
      {title && (
        <p className="text-muted-foreground mb-(--space-sm) font-mono text-[0.625rem] tracking-[0.15em] uppercase">
          {title}
        </p>
      )}
      <p className="text-foreground text-base leading-relaxed font-medium">{text}</p>
    </aside>
  );
}
