import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { programsOverviewContent } from '@/content/programs';

const { featured } = programsOverviewContent;

function FeaturedImage({ label }: { label: string }) {
  return (
    <div className="bg-secondary relative min-h-[28rem] w-full overflow-hidden lg:min-h-[36rem]">
      <div className="absolute inset-0 flex items-center justify-center">
        <Text size="sm" tone="muted" className="max-w-[14rem] text-center">
          {label}
        </Text>
      </div>
    </div>
  );
}

function FeaturedSection({
  eyebrow,
  title,
  description,
  details,
  href,
  cta,
  imageLabel,
  layout,
  index,
}: (typeof featured)[number] & { index: number }) {
  const isImageRight = layout === 'image-right';

  const contentBlock = (
    <Stack
      gap="xl"
      className={
        index === 1
          ? 'lg:py-(--space-2xl)'
          : index === 2
            ? 'border-border lg:border-l lg:pl-(--space-3xl)'
            : 'lg:pr-(--space-xl)'
      }
    >
      <Stack gap="sm">
        <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">{eyebrow}</p>
        <h2 className="font-heading text-foreground text-3xl leading-[1.08] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h2>
      </Stack>

      <Text tone="muted" className="max-w-prose leading-relaxed">
        {description}
      </Text>

      {index === 1 ? (
        <dl className="grid grid-cols-1 gap-(--space-md) sm:grid-cols-3">
          {details.map(({ label, value }) => (
            <div key={label} className="border-border border-t pt-(--space-md)">
              <dt className="text-muted-foreground mb-(--space-2xs) font-mono text-[0.625rem] tracking-[0.15em] uppercase">
                {label}
              </dt>
              <dd className="text-foreground text-sm leading-snug font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <Stack gap="sm">
          {details.map(({ label, value }) => (
            <div
              key={label}
              className="border-border flex min-w-0 items-baseline justify-between gap-(--space-md) border-t py-(--space-sm)"
            >
              <span className="text-muted-foreground shrink-0 text-xs tracking-[0.15em] uppercase">
                {label}
              </span>
              <span className="text-foreground min-w-0 text-right text-sm font-medium break-words">
                {value}
              </span>
            </div>
          ))}
        </Stack>
      )}

      <div>
        <NextLink href={href} className={buttonVariants({ variant: 'primary', size: 'lg' })}>
          {cta}
        </NextLink>
      </div>
    </Stack>
  );

  const imageBlock = <FeaturedImage label={imageLabel} />;

  return (
    <div className="grid grid-cols-1 items-center gap-(--space-2xl) lg:grid-cols-2 lg:gap-(--space-3xl)">
      {isImageRight ? (
        <>
          {contentBlock}
          {imageBlock}
        </>
      ) : (
        <>
          {imageBlock}
          {contentBlock}
        </>
      )}
    </div>
  );
}

export function ProgramsFeatured() {
  return (
    <Section spacing="none" className="border-border border-t" aria-label="Featured programs">
      <Container size="xl" className="py-(--space-4xl)">
        <Stack gap="4xl">
          {featured.map((program, index) => (
            <div
              key={program.id}
              className={
                index < featured.length - 1 ? 'border-border border-b pb-(--space-4xl)' : undefined
              }
            >
              <FeaturedSection {...program} index={index} />
            </div>
          ))}
        </Stack>
      </Container>
    </Section>
  );
}
