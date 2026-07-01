import type { LegalSection } from '@/components/utility/legal-document';

export const termsContent = {
  slug: 'terms',
  title: 'Terms of Use',
  lastUpdated: '1 July 2026',
  introduction:
    'These Terms of Use govern your access to and use of The Nervous System Institute website and educational materials. Please read them carefully.',
  sections: [
    {
      id: 'acceptance',
      heading: 'Acceptance of Terms',
      paragraphs: [
        'By accessing this website, you agree to be bound by these Terms of Use and all applicable laws. If you do not agree, please do not use the website.',
      ],
    },
    {
      id: 'educational-content',
      heading: 'Educational Content',
      paragraphs: [
        'Content published by The Nervous System Institute is provided for educational purposes. It does not constitute medical, psychological or legal advice.',
        'Programmes and materials are designed to support understanding and capacity-building. They are not a substitute for professional clinical care where that is required.',
      ],
    },
    {
      id: 'intellectual-property',
      heading: 'Intellectual Property',
      paragraphs: [
        'All content on this website — including text, graphics, logos, curricula and methodologies — is the property of The Nervous System Institute or its licensors and is protected by copyright and other intellectual property laws.',
        'You may not reproduce, distribute or create derivative works without prior written permission, except for personal, non-commercial use.',
      ],
    },
    {
      id: 'programme-enrolment',
      heading: 'Programme Enrolment',
      paragraphs: [
        'Separate terms and conditions apply to programme enrolment, certification and advisory engagements. Those terms will be provided at the point of registration or agreement.',
      ],
    },
    {
      id: 'limitation',
      heading: 'Limitation of Liability',
      paragraphs: [
        'To the fullest extent permitted by law, The Nervous System Institute shall not be liable for any indirect, incidental or consequential damages arising from your use of this website or reliance on its content.',
        'We make reasonable efforts to ensure accuracy but do not warrant that all content is complete, current or error-free.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to Terms',
      paragraphs: [
        'We may update these Terms of Use from time to time. Continued use of the website after changes are posted constitutes acceptance of the revised terms.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: ['Questions about these terms may be directed to hello@tnsi.org.'],
    },
  ] satisfies readonly LegalSection[],
};
