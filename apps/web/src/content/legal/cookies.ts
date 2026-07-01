import type { LegalSection } from '@/components/utility/legal-document';

export const cookiesContent = {
  slug: 'cookies',
  title: 'Cookie Policy',
  lastUpdated: '1 July 2026',
  introduction:
    'This policy explains how The Nervous System Institute uses cookies and similar technologies on our website.',
  sections: [
    {
      id: 'what-are-cookies',
      heading: 'What Are Cookies',
      paragraphs: [
        'Cookies are small text files stored on your device when you visit a website. They help the site function correctly and provide information about how it is used.',
      ],
    },
    {
      id: 'how-we-use',
      heading: 'How We Use Cookies',
      paragraphs: [
        'We use essential cookies to maintain core website functionality and security. We may use analytics cookies to understand how visitors interact with our content, always in aggregate where possible.',
        'We do not use cookies for intrusive advertising or to sell personal data.',
      ],
    },
    {
      id: 'managing-cookies',
      heading: 'Managing Cookies',
      paragraphs: [
        'You can control cookies through your browser settings. Disabling certain cookies may affect website functionality.',
        'For more information about how we handle personal data, see our Privacy Policy.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: ['Questions about our use of cookies may be directed to hello@tnsi.org.'],
    },
  ] satisfies readonly LegalSection[],
};
