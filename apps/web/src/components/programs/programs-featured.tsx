import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';

export function ProgramsFeatured() {
  return (
    <Section
      spacing="xl"
      className="border-border bg-secondary border-t"
      aria-labelledby="featured-program-heading"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-(--space-3xl) lg:grid-cols-2">
          {/* Left — editorial text block */}
          <Stack gap="xl">
            <Stack gap="sm">
              <p className="text-muted-foreground text-xs tracking-widest uppercase">
                Featured program
              </p>
              <h2
                id="featured-program-heading"
                className="font-heading text-foreground text-4xl leading-[1.1] font-semibold tracking-tight lg:text-5xl"
              >
                Life Beyond
                <br />
                Trauma Method
              </h2>
            </Stack>

            <Text tone="muted" className="max-w-prose">
              A structured transformational journey combining neuroscience, trauma recovery, nervous
              system regulation and practical application. Designed for ambitious women who are
              ready to build lasting capacity from the ground up.
            </Text>

            <Stack gap="md">
              <div className="border-border border-t pt-(--space-md)">
                <Text size="sm" tone="muted">
                  <span className="text-foreground font-medium">Format —</span> Live group programme
                  with individual coaching support
                </Text>
              </div>
              <div className="border-border border-t pt-(--space-md)">
                <Text size="sm" tone="muted">
                  <span className="text-foreground font-medium">Structure —</span> Neuroscience
                  education, somatic practice, community and application
                </Text>
              </div>
              <div className="border-border border-t pt-(--space-md)">
                <Text size="sm" tone="muted">
                  <span className="text-foreground font-medium">Outcome —</span> A regulated nervous
                  system, expanded capacity and sustainable success
                </Text>
              </div>
            </Stack>

            <div>
              <NextLink
                href="/programs/life-beyond-trauma"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Explore the Program
              </NextLink>
            </div>
          </Stack>

          {/* Right — large editorial image placeholder */}
          {/* TODO: swap for approved Life Beyond Trauma programme image once added to apps/web/public */}
          <div className="border-border bg-background relative aspect-[3/4] w-full overflow-hidden rounded-sm border">
            <div className="absolute inset-0 flex items-end justify-start p-(--space-lg)">
              <Text size="sm" tone="muted">
                Programme image placeholder
              </Text>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
