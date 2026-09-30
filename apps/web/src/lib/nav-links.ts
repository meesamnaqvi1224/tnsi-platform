export const primaryNavLinks = [
  { label: 'About', href: '/about' },
  { label: 'Human Expansion Theory', href: '/method' },
  { label: 'Programs', href: '/programs' },
  { label: 'Resources', href: '/resources' },
  { label: 'Insights', href: '/articles' },
] as const;

export const footerColumns = [
  {
    title: 'Institute',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Human Expansion Theory', href: '/method' },
      { label: 'Research', href: '/research' },
    ],
  },
  {
    title: 'Programs',
    links: [
      { label: 'The Regulation Suite™', href: '/programs/regulation-suite' },
      { label: 'Life Beyond Trauma Method™', href: '/programs/life-beyond-trauma' },
      { label: 'The Nervous System Academy', href: '/programs/academy' },
      { label: 'Private Executive Advisory', href: '/programs/executive-advisory' },
      { label: 'System-Level Executive Advisory', href: '/programs/organisational-advisory' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Insights', href: '/articles' },
      { label: 'Resources', href: '/resources' },
      { label: 'Book a Call', href: '/book-a-call' },
      { label: 'Contact', href: '/contact' },
    ],
  },
] as const;
