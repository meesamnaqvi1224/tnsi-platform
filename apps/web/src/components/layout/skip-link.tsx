import NextLink from 'next/link';

export function SkipLink() {
  return (
    <NextLink href="#main-content" className="skip-link">
      Skip to main content
    </NextLink>
  );
}
