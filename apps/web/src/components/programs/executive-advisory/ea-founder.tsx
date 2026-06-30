import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Stack, Text } from '@tnsi/ui';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { founder } = executiveAdvisoryContent;

export function EaFounder() {
  return (
    <section
      aria-label={founder.heading}
      className="border-border grid grid-cols-1 border-t lg:grid-cols-2"
    >
      {/* Content first on mobile; portrait on right for desktop — reversed from Practitioner page */}
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

      <div className="bg-foreground relative aspect-[4/3] w-full lg:order-2 lg:aspect-auto">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" className="text-background/50">
            Executive portrait placeholder
          </Text>
        </div>
        <span className="sr-only">{founder.imageAlt}</span>
      </div>
    </section>
  );
}
