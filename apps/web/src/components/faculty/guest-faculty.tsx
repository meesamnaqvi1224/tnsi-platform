import NextLink from 'next/link';
import { buttonVariants, ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { facultyContent } from '@/content/faculty';

const { guestFaculty } = facultyContent;

export function GuestFaculty() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={guestFaculty.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_1.2fr] lg:gap-(--space-5xl)">
          <ChapterMarker
            index={guestFaculty.chapter}
            as="h2"
            title={guestFaculty.heading}
            className="lg:sticky lg:top-(--space-3xl) lg:self-start"
          />

          <Stack gap="2xl">
            <Text tone="muted" className="text-base leading-relaxed">
              {guestFaculty.intro}
            </Text>

            <ul className="grid grid-cols-1 gap-(--space-sm) sm:grid-cols-2">
              {guestFaculty.collaborationAreas.map((area) => (
                <li
                  key={area}
                  className="border-border/70 text-muted-foreground border-b py-(--space-sm) text-sm"
                >
                  {area}
                </li>
              ))}
            </ul>

            <Text tone="muted" className="text-sm leading-relaxed">
              {guestFaculty.supportingCopy}
            </Text>

            <Stack direction="row" gap="sm" wrap="wrap">
              <NextLink
                href={guestFaculty.primaryCta.href}
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                {guestFaculty.primaryCta.label}
              </NextLink>
              <NextLink
                href={guestFaculty.secondaryCta.href}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                {guestFaculty.secondaryCta.label}
              </NextLink>
            </Stack>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
