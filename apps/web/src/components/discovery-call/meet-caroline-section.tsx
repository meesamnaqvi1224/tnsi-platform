import Image from 'next/image';
import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { discoveryCallContent } from '@/content/discovery-call';

const { caroline } = discoveryCallContent;

export function MeetCarolineSection() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={caroline.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-(--space-3xl) lg:grid-cols-[0.9fr_1.1fr] lg:gap-(--space-5xl)">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-lg lg:mx-0 lg:max-w-none">
            <Image
              src={caroline.imageSrc}
              alt={caroline.imageAlt}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <p className="text-muted-foreground absolute inset-x-0 bottom-6 text-center text-xs tracking-[0.12em] uppercase">
              Portrait placeholder
            </p>
          </div>

          <Stack gap="2xl">
            <ChapterMarker index={caroline.chapter} as="h2" title={caroline.heading} />

            <Stack gap="md">
              <h3 className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                {caroline.name}
              </h3>
              <ul className="flex flex-wrap gap-(--space-sm)">
                {caroline.credentials.map((credential) => (
                  <li
                    key={credential}
                    className="border-border/70 text-muted-foreground rounded-full border px-(--space-md) py-(--space-xs) text-xs tracking-wide"
                  >
                    {credential}
                  </li>
                ))}
              </ul>
            </Stack>

            <Stack gap="lg">
              {caroline.biography.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="text-base leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>

            <NextLink
              href={caroline.cta.href}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {caroline.cta.label}
            </NextLink>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
