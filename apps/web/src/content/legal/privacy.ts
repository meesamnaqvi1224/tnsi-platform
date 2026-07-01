import type { LegalSection } from '@/components/utility/legal-document';

export const privacyContent = {
  slug: 'privacy',
  title: 'Privacy Policy',
  lastUpdated: '1 July 2026',
  introduction:
    'The Nervous System Institute is committed to protecting your privacy. This policy explains how we collect, use and safeguard personal information when you visit our website, enrol in programmes or contact us.',
  sections: [
    {
      id: 'introduction',
      heading: 'Introduction',
      paragraphs: [
        'This Privacy Policy applies to The Nervous System Institute website and related educational services. By using our website or submitting information to us, you acknowledge that you have read this policy.',
        'We process personal data in accordance with applicable data protection legislation, including the UK General Data Protection Regulation (UK GDPR).',
      ],
    },
    {
      id: 'information-we-collect',
      heading: 'Information We Collect',
      paragraphs: [
        'We may collect information you provide directly — such as your name, email address, organisation, programme interests and messages submitted through contact forms or Discovery Call bookings.',
        'We may also collect technical information automatically, including IP address, browser type, device information and pages visited, through cookies and similar technologies.',
      ],
    },
    {
      id: 'how-we-use-information',
      heading: 'How We Use Information',
      paragraphs: [
        'We use personal information to respond to enquiries, deliver educational programmes, improve our website, send relevant communications (where you have consented) and fulfil legal obligations.',
        'We do not sell personal information. We share data only with trusted service providers who assist in operating our website and services, subject to appropriate safeguards.',
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies',
      paragraphs: [
        'Our website uses cookies to maintain essential functionality and understand how visitors use the site. You can manage cookie preferences through your browser settings.',
        'For further detail, please see our Cookie Policy.',
      ],
    },
    {
      id: 'data-security',
      heading: 'Data Security',
      paragraphs: [
        'We implement appropriate technical and organisational measures to protect personal information against unauthorised access, alteration, disclosure or destruction.',
        'No method of transmission over the internet is completely secure. We encourage you to use strong passwords and exercise caution when sharing sensitive information online.',
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your Rights',
      paragraphs: [
        'Depending on your location, you may have rights to access, correct, delete or restrict processing of your personal data, and to object to certain processing or request data portability.',
        'To exercise these rights, contact us at hello@tnsi.org. You also have the right to lodge a complaint with your local data protection authority.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [
        'For privacy-related enquiries, contact The Nervous System Institute at hello@tnsi.org or via our Contact page.',
      ],
    },
  ] satisfies readonly LegalSection[],
};
