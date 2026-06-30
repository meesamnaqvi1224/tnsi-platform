export interface ArticleTakeawaysProps {
  items: string[];
}

export function ArticleTakeaways({ items }: ArticleTakeawaysProps) {
  return (
    <aside
      aria-label="Key takeaways"
      className="border-border bg-secondary/30 my-(--space-4xl) border px-(--space-xl) py-(--space-xl)"
    >
      <h2 className="text-muted-foreground mb-(--space-lg) font-mono text-[0.625rem] tracking-[0.2em] uppercase">
        Key Takeaways
      </h2>
      <ul className="flex flex-col gap-(--space-md)" role="list">
        {items.map((item) => (
          <li key={item} className="text-foreground text-base leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
