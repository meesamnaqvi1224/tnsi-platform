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
      { label: 'Life Beyond Trauma', href: '/programs/life-beyond-trauma' },
      { label: 'Practitioner Certification', href: '/programs/practitioner-certification' },
      { label: 'Executive Advisory', href: '/programs/executive-advisory' },
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
