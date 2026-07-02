import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { founder } = executiveAdvisoryContent;

export function EaFounder() {
  return (
    <section
      aria-label={founder.heading}
      className="border-border grid grid-cols-1 border-t lg:grid-cols-2"
    >
      <div className="flex items-center px-(--space-lg) py-(--space-3xl) sm:px-(--space-2xl) lg:order-1 lg:px-(--space-3xl)">
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

      <EditorialImage
        src={founder.imageSrc}
        alt={founder.imageAlt}
        aspect="landscape"
        className="lg:order-2 lg:aspect-auto lg:min-h-full lg:rounded-none"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    </section>
  );
}
