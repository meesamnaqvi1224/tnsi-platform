import type { LegalSection } from '@/components/utility/legal-document';

export const accessibilityContent = {
  slug: 'accessibility',
  title: 'Accessibility',
  lastUpdated: '1 July 2026',
  introduction:
    'The Nervous System Institute is committed to ensuring our website is accessible to the widest possible audience, regardless of technology or ability.',
  sections: [
    {
      id: 'commitment',
      heading: 'Our Commitment',
      paragraphs: [
        'We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. Accessibility is an ongoing priority, not a one-time checklist.',
      ],
    },
    {
      id: 'wcag',
      heading: 'WCAG Standards',
      paragraphs: [
        'Our website is designed with perceivable, operable, understandable and robust content. We use semantic HTML, readable typography and meaningful alternative text for images.',
        'Colour contrast is an area we are still improving: some secondary (muted grey) text is below the 4.5:1 ratio that WCAG 2.1 Level AA requires for normal-sized text. We have not yet completed a full audit against every success criterion.',
      ],
    },
    {
      id: 'keyboard',
      heading: 'Keyboard Navigation',
      paragraphs: [
        'All interactive elements — navigation, buttons, links, form fields and accordions — are reachable and operable via keyboard.',
        'Visible focus indicators are provided for keyboard users throughout the site.',
      ],
    },
    {
      id: 'screen-readers',
      heading: 'Screen Readers',
      paragraphs: [
        'We use semantic landmarks, heading hierarchy, ARIA labels where appropriate and descriptive link text to support screen reader users.',
        'Decorative images are marked accordingly; meaningful images include alternative text.',
      ],
    },
    {
      id: 'continuous-improvement',
      heading: 'Continuous Improvement',
      paragraphs: [
        'Accessibility is reviewed with each release. We welcome feedback from users who encounter barriers and will work to resolve issues promptly.',
      ],
    },
    {
      id: 'contact',
      heading: 'Report an Accessibility Issue',
      paragraphs: [
        'If you experience difficulty accessing any part of our website, please contact us through our Contact page with a description of the issue and the page URL. We aim to respond within two business days.',
      ],
    },
  ] satisfies readonly LegalSection[],
};
