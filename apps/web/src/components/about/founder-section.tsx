import { Eyebrow, Heading, Stack, Text } from '@tnsi/ui';

export function FounderSection() {
  return (
    <section aria-labelledby="founder-heading" className="grid grid-cols-1 lg:grid-cols-2">
      {/* TODO: swap for approved Caroline Reed portrait once added to apps/web/public */}
      <div className="border-border bg-secondary relative aspect-[4/5] w-full border lg:aspect-auto">
        <div className="absolute inset-0 flex items-center justify-center">
          <Text size="sm" tone="muted">
            Portrait placeholder
          </Text>
        </div>
      </div>

      <div className="dark bg-background text-foreground flex items-center px-[var(--space-lg)] py-[var(--space-3xl)] sm:px-[var(--space-2xl)] lg:px-[var(--space-3xl)]">
        <Stack gap="md" className="max-w-md">
          <Eyebrow className="text-muted-foreground">The Founder</Eyebrow>
          <Heading as="h2" id="founder-heading" size="xl">
            Caroline Reed
          </Heading>
          <Text tone="muted">
            Caroline Reed is a nervous system educator, clinical researcher, and founder of The
            Nervous System Institute. With over fifteen years in private practice and post-graduate
            training in polyvagal theory, attachment-informed therapy, and somatic approaches, she
            has developed a proprietary framework for sustainable high performance.
          </Text>
          <Text tone="muted">
            Her work is grounded in the recognition that ambitious women are systematically trained
            to override their physiological signals — and that this override, not lack of effort, is
            what limits long-term capacity. She has worked with senior executives, high-achieving
            women, and healthcare practitioners across Europe and North America.
          </Text>
        </Stack>
      </div>
    </section>
  );
}
