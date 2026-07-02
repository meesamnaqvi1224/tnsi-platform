import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack } from '@tnsi/ui';
import { articlesContent } from '@/content/articles';

const { closing } = articlesContent;

export function ArticlesClosing() {
  return (
    <Section
      spacing="xl"
      className="border-border border-t"
      aria-labelledby="articles-closing-heading"
    >
      <Container size="xl">
        <Stack gap="3xl" className="mx-auto max-w-3xl text-center">
          <div className="flex flex-col items-center gap-(--space-sm)">
            <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
              Chapter {closing.chapter}
            </span>
            <div className="border-border w-12 border-t" aria-hidden />
          </div>

          <h2
            id="articles-closing-heading"
            className="font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl"
          >
            {closing.headline}
          </h2>

          <Stack direction="row" gap="sm" wrap="wrap" className="justify-center">
            <NextLink
              href={closing.primaryCta.href}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              {closing.primaryCta.label}
            </NextLink>
            <NextLink
              href={closing.secondaryCta.href}
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {closing.secondaryCta.label}
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
