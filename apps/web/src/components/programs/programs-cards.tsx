import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Eyebrow, Section, Stack, Text } from '@tnsi/ui';

const programs = [
  {
    eyebrow: 'Personal',
    title: 'Life Beyond Trauma',
    for: 'For individuals',
    description:
      'For ambitious women who are ready to move beyond survival and reclaim lasting wellbeing. A structured journey through the neuroscience of regulation, recovery and expanded capacity.',
    href: '/programs/life-beyond-trauma',
    cta: 'Explore Program',
  },
  {
    eyebrow: 'Professional',
    title: 'Practitioner Certification',
    for: 'For professionals',
    description:
      'For professionals who want to integrate trauma-informed nervous system education into their work. A certifiable curriculum grounded in clinical research and structured for practice.',
    href: '/programs/practitioner-certification',
    cta: 'Learn More',
  },
  {
    eyebrow: 'Organisational',
    title: 'Executive Advisory',
    for: 'For organisations',
    description:
      "For organisations committed to building healthier leadership and workplace cultures. Private advisory bespoke to each organisation's structure, needs and leadership team.",
    href: '/programs/executive-advisory',
    cta: 'Explore Advisory',
  },
] as const;

function ProgramCard({
  eyebrow,
  title,
  for: forLabel,
  description,
  href,
  cta,
}: (typeof programs)[number]) {
  return (
    <article className="group border-border duration-base ease-standard hover:border-foreground flex flex-col border-t pt-(--space-xl) transition-[border-color]">
      <Stack gap="md" className="flex-1">
        <div className="flex items-baseline justify-between gap-(--space-sm)">
          <Eyebrow>{eyebrow}</Eyebrow>
          <span className="text-muted-foreground shrink-0 text-xs">{forLabel}</span>
        </div>

        <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight">
          {title}
        </h3>

        <Text size="sm" tone="muted" className="flex-1">
          {description}
        </Text>
      </Stack>

      <NextLink
        href={href}
        className="text-foreground duration-base ease-standard hover:text-muted-foreground mt-(--space-xl) inline-flex items-center gap-(--space-xs) text-sm font-medium transition-colors"
      >
        {cta}
        <ArrowRight
          aria-hidden
          className="duration-base ease-standard size-4 transition-transform group-hover:translate-x-1"
        />
      </NextLink>
    </article>
  );
}

export function ProgramsCards() {
  return (
    <Section
      spacing="xl"
      className="border-border border-t"
      aria-labelledby="programs-cards-heading"
    >
      <Container size="xl">
        <Stack gap="sm" className="mb-(--space-3xl) max-w-2xl">
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Choose your path
          </p>
          <h2
            id="programs-cards-heading"
            className="font-heading text-foreground text-4xl font-semibold tracking-tight"
          >
            Three programs.
            <br />
            One Institute.
          </h2>
        </Stack>

        <div className="grid grid-cols-1 gap-(--space-2xl) lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.href} {...program} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
