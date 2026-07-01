import NextLink from 'next/link';
import { Container, Divider, Grid, Stack, Text } from '@tnsi/ui';
import { footerColumns } from '@/lib/nav-links';

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Accessibility', href: '/accessibility' },
  { label: 'Cookies', href: '/cookies' },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-secondary">
      <Container size="xl" className="py-(--space-3xl)">
        <Grid cols="4" gap="xl">
          <Stack gap="sm">
            <Text size="sm" weight="semibold" className="font-heading tracking-[0.05em] uppercase">
              The Nervous System Institute
            </Text>
            <Text size="sm" tone="muted">
              Evidence-informed education at the intersection of neuroscience, leadership and human
              transformation.
            </Text>
          </Stack>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <Stack gap="sm">
                <Text size="sm" weight="semibold">
                  {column.title}
                </Text>
                <ul className="flex flex-col gap-(--space-xs)">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <NextLink
                        href={link.href}
                        className="text-muted-foreground duration-base ease-standard hover:text-foreground text-sm transition-colors"
                      >
                        {link.label}
                      </NextLink>
                    </li>
                  ))}
                </ul>
              </Stack>
            </nav>
          ))}
        </Grid>

        <Divider className="my-(--space-xl)" />

        <Stack direction="row" justify="between" wrap="wrap" gap="sm">
          <Text size="sm" tone="muted">
            © 2026 The Nervous System Institute. All rights reserved.
          </Text>
          <Stack direction="row" gap="lg" wrap="wrap">
            {legalLinks.map((link) => (
              <NextLink
                key={link.href}
                href={link.href}
                className="text-muted-foreground duration-base ease-standard hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </NextLink>
            ))}
          </Stack>
        </Stack>
      </Container>
    </footer>
  );
}
