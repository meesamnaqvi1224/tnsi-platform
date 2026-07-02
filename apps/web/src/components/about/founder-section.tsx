import { Eyebrow, Heading, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { aboutImages } from '@/content/images';

export function FounderSection() {
  return (
    <section aria-labelledby="founder-heading" className="grid grid-cols-1 lg:grid-cols-2">
      <EditorialImage
        src={aboutImages.founderPortrait}
        alt="Black and white portrait of Caroline Reed seated in a leather chair, wearing glasses and smiling warmly."
        aspect="portrait"
        className="border-border border lg:aspect-auto lg:min-h-full lg:rounded-none"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

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
