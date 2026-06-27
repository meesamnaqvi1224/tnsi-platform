import { Container, Section } from '@tnsi/ui';

/**
 * Concept A v2 — Section Two: Three-Column Editorial Body
 *
 * In v1 this lived inside Section One, below the pull quote.
 * In v2 it is a dedicated section — one idea per screen.
 *
 * Column labels are now restrained serif subheads (font-heading at text-base),
 * not uppercase-tracking-widest marketing callouts.
 * Each column has its own border-t rule, as in broadsheet newspaper column layout.
 * Prose is written at HBR authority: precise, clinical, without softening.
 *
 * No icons, no decorative graphics. Type carries the full weight.
 */

const columns = [
  {
    id: 'challenge',
    label: 'The Challenge',
    body: `Achievement culture does not create dysregulation. It selects for it.
The people most rewarded by this culture are often those who have learned most
efficiently to override their physiological signals — which is not resilience.
It is delay.`,
  },
  {
    id: 'science',
    label: 'The Science',
    body: `Polyvagal theory describes three physiological states: social engagement,
mobilisation, and shutdown. Sustainable performance requires access to the first.
Most high-achieving adults spend their productive years cycling between the
second and third, mistaking activation for capacity.`,
  },
  {
    id: 'transformation',
    label: 'The Transformation',
    body: `Change at this level is not psychological. It is physiological — new neural
pathways built through structured education, not insight. The method does not
teach you to manage the pattern. It teaches the nervous system to no longer
need it.`,
  },
] as const;

export function ConceptAV2SectionTwo() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-labelledby="ca-v2-s2-heading">
      <Container size="xl">
        {/* Section label — quiet, positional, not declarative */}
        <p className="text-muted-foreground mb-(--space-3xl) text-xs tracking-widest uppercase">
          Three perspectives
        </p>

        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-3">
          {columns.map((col) => (
            <div key={col.id} className="border-border border-t pt-(--space-xl)">
              {/* Column heading — restrained serif, reads like an article subhead */}
              <h2
                id={col.id === 'challenge' ? 'ca-v2-s2-heading' : undefined}
                className="font-heading text-foreground mb-(--space-lg) text-base font-semibold tracking-tight"
              >
                {col.label}
              </h2>

              {/* Body — editorial prose, not marketing copy */}
              <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">
                {col.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
