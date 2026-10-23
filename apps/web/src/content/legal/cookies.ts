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
        'We use essential cookies to maintain core website functionality and security. We use analytics cookies only if you accept them, to understand how visitors interact with our content, always in aggregate where possible.',
        'We do not use cookies for intrusive advertising or to sell personal data.',
      ],
    },
    {
      id: 'analytics-cookies',
      heading: 'Analytics Cookies and Your Choice',
      paragraphs: [
        'If you accept analytics, we use Google Analytics to understand which pages are visited and how visitors move around the site, so that we can improve our content. Google Analytics sets cookies on your device; they are named _ga and _ga_ followed by an identifier.',
        'When you first visit the site you can accept or reject analytics. Google Analytics is not loaded, and no analytics cookies are set, unless you accept. If you reject, or do not choose, it stays off.',
        'Your choice is saved in your browser on this device so that we can remember it. You can review or change it at any time using “Cookie preferences” in the footer of any page. If you withdraw consent, analytics collection stops and we remove the Google Analytics cookies we are able to remove.',
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
