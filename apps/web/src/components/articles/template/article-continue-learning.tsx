import NextLink from 'next/link';
import { buttonVariants, Container, Stack } from '@tnsi/ui';

export function ArticleContinueLearning() {
  return (
    <section aria-labelledby="continue-learning-heading" className="border-border border-t">
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <Stack gap="xl" className="mx-auto max-w-[760px] text-center">
          <h2
            id="continue-learning-heading"
            className="font-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl"
          >
            Continue your learning journey
          </h2>

          <Stack direction="row" gap="sm" wrap="wrap" className="justify-center">
            <NextLink
              href="/resources"
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              Explore Resources
            </NextLink>
            <NextLink
              href="/articles"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              Browse Articles
            </NextLink>
          </Stack>
        </Stack>
      </Container>
    </section>
  );
}
