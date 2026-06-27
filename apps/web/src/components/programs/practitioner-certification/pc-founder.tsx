import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Stack, Text } from '@tnsi/ui';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { founder } = practitionerCertificationContent;

export function PcFounder() {
  return (
    <section
      aria-label={founder.heading}
      className="border-border grid grid-cols-1 border-t lg:grid-cols-2"
    >
      <div className="border-border bg-secondary relative aspect-[4/5] w-full border-b lg:aspect-auto lg:border-r lg:border-b-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" tone="muted">
            Professional portrait placeholder
          </Text>
        </div>
      </div>

      <div className="flex items-center px-(--space-lg) py-(--space-3xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
        <Stack gap="xl" className="max-w-lg">
          <ChapterMarker index={founder.chapter} as="h2" title={founder.heading} />

          <Stack gap="md">
            {founder.paragraphs.map((paragraph) => (
              <Text key={paragraph} tone="muted" className="leading-relaxed">
                {paragraph}
              </Text>
            ))}
          </Stack>

          <NextLink
            href={founder.cta.href}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            {founder.cta.label}
          </NextLink>
        </Stack>
      </div>
    </section>
  );
}
