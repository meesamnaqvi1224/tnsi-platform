import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { founder } = practitionerCertificationContent;

export function PcFounder() {
  return (
    <section
      aria-labelledby="pc-founder-heading"
      className="border-border grid grid-cols-1 border-t lg:grid-cols-2"
    >
      <EditorialImage
        src={founder.imageSrc}
        alt={founder.imageAlt}
        aspect="portrait"
        className="border-border border-b lg:aspect-auto lg:min-h-full lg:rounded-none lg:border-r lg:border-b-0"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      <div className="flex items-center px-(--space-lg) py-(--space-3xl) sm:px-(--space-2xl) lg:px-(--space-3xl)">
        <Stack gap="xl" className="max-w-lg">
          <ChapterMarker
            index={founder.chapter}
            as="h2"
            headingId="pc-founder-heading"
            title={founder.heading}
          />

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
