import type { LegalSection } from '@/components/utility/legal-document';

/**
 * Full privacy policy covering the website, the Academy, the mobile app and My Reflections.
 * Published on the owner's instruction (19 Nov 2026) WITHOUT external legal review: nothing here
 * may claim a legal review, an ICO registration or a provider certification. Controller: Caroline
 * Reed (sole trader), as confirmed by the owner. Update `lastUpdated` whenever the text changes.
 */
export const PRIVACY_CONTACT_EMAIL = 'carolinereedofficial@gmail.com';

export const privacyContent = {
  slug: 'privacy',
  title: 'Privacy Policy',
  lastUpdated: '19 November 2026',
  introduction:
    'This policy explains what personal information The Nervous System Institute collects, why, who we share it with, how long we keep it, and the choices you have. It covers our website, the TNSI Academy, the TNSI mobile app and the optional My Reflections journal.',
  sections: [
    {
      id: 'who-we-are',
      heading: 'Who we are',
      paragraphs: [
        'The Nervous System Institute (“TNSI”, “we”, “us”) is run by Caroline Reed, based in Manchester, United Kingdom. Caroline Reed is the controller of your personal information.',
        `Privacy contact: ${PRIVACY_CONTACT_EMAIL}. Write to this address for any request or question about your information.`,
      ],
    },
    {
      id: 'what-this-covers',
      heading: 'What this policy covers',
      paragraphs: [
        'This policy covers our website, the TNSI Academy (your account), the TNSI mobile app, the optional My Reflections journal, our email communications, and enquiries you send us.',
      ],
    },
    {
      id: 'who-can-use-tnsi',
      heading: 'Who can use TNSI',
      paragraphs: [
        'TNSI is for people aged 18 and over. We do not knowingly collect information from anyone younger. If you think a child has given us information, contact us and we will delete it.',
      ],
    },
    {
      id: 'what-we-collect',
      heading: 'What we collect, and why',
      paragraphs: [
        'Account details: your name, email address and sign-in details (handled by our sign-in provider), when you create an account. We use them to create and run your account, sign you in and keep it secure. Our legal basis is contract.',
        'Membership and billing details: your plan, dates and payment-provider references, when you start or change a membership. We do not see your full card number. We use them to provide the membership, take payment and keep accounting records. Our legal bases are contract and legal obligation.',
        'Activity in the Academy and app: check-ins, practice completions, saved practices, quick practice notes and PowerDrop use. We use them to show your history and progress and to suggest practices. Our legal basis is contract.',
        'Assessment answers: what you submit when you take an assessment. We use them to give you your result and, if you are signed in, to add it to your account. Answers may reveal information about your wellbeing. Our legal basis is your consent, given when you choose to submit them, and your explicit consent for any health information they contain.',
        'My Reflections: your entries and drafts, if you choose to write them (see the My Reflections section below). Our legal bases are your consent and, for health information you choose to write, your explicit consent.',
        'A record that you agreed to the My Reflections notice: the version, the time you agreed and the time you withdrew, never what you wrote. We keep it to show that we asked properly. Our legal basis is legitimate interests (accountability) and the establishment or defence of legal claims.',
        'Enquiries and messages: your name, email, message and booking details, when you use a form or book a call. We use them to reply to you and run the booking. Our legal bases are steps taken at your request and legitimate interests.',
        'Newsletter and email preferences, and how you engage with our emails: when you sign up or consent. We use them to send you what you asked for. Our legal basis is your consent.',
        'Technical data: your IP address, device and the pages you request, when you visit. We use it to run, secure and fix the site. Our legal basis is legitimate interests.',
        'Analytics data: the pages you visit and how you move around, only if you accept analytics. We use it to understand and improve our content. Our legal basis is your consent.',
        'A scrambled, one-way marker of your email address if you use a free trial. We use it to stop repeated free trials. Our legal basis is legitimate interests (preventing misuse of the offer).',
        'We do not sell your personal information.',
      ],
    },
    {
      id: 'my-reflections',
      heading: 'My Reflections',
      paragraphs: [
        'My Reflections is an optional private journal. What you write may include information about your health or wellbeing, which is special category data. You choose whether to use it and what to write.',
        'What we store: your entries and drafts, when they were created or changed, and a record that you agreed to the notice. We do not store anything on your device.',
        'How we use it: only to store your entries so you can come back to them, show them to you, and let you edit or delete them. We do not use your reflections to recommend practices, to profile or analyse you, for marketing, or to train AI. They are not sent to our email platform and are not included in website analytics.',
        'Who can see it: other members cannot see your reflections. We do not routinely read them. Limited, authorised technical access may sometimes be needed to keep the service running and secure, to help you if you ask us to, or where the law requires it.',
        'Our basis: your consent, and your explicit consent for health information you choose to write. You can withdraw permission at any time in My Reflections. Withdrawing stops you adding or changing reflections; you can choose to keep your existing entries (you can still read and delete them) or delete them all at once. Withdrawing does not affect anything done before.',
        'Deleting: deleting an entry removes it from our live database straight away. Deleting your account removes all your reflections and drafts.',
      ],
    },
    {
      id: 'cookies-and-analytics',
      heading: 'Cookies and analytics',
      paragraphs: [
        'We use essential cookies to run the site. We use Google Analytics only if you accept analytics; it is off until you choose, and stays off if you reject or if your browser sends a Global Privacy Control signal. You can change your choice at any time using Cookie preferences in the footer. See our Cookie Policy.',
        'Our Discovery Call page embeds a booking calendar from Flowi, which may set its own cookies. Those are outside our analytics choice.',
      ],
    },
    {
      id: 'who-we-share-with',
      heading: 'Who we share information with',
      paragraphs: [
        'We use these service providers to run TNSI. They process information on our instructions, except where stated.',
        'Neon: database hosting. Receives all account and activity data, including My Reflections.',
        'Vercel: website hosting. Receives technical request data.',
        'Clerk: sign-in and account security. Receives your email, name and sign-in sessions.',
        'Flowi (HighLevel): email, contact records and booking. Receives your name, email, tags and enquiries, never My Reflections.',
        'Stripe: payments. Receives payment details and billing contact. Stripe also uses payment information for its own legal and fraud-prevention purposes and has its own privacy policy.',
        'Sanity: content management. Holds website content, not member data.',
        'Google Analytics: analytics, only if you accept. Receives pseudonymous visit data.',
        'Apple and Google app stores: app distribution, as described in their own policies.',
        'We may also share information where the law requires it, to protect rights or safety, or in a business transfer, with the same protections.',
      ],
    },
    {
      id: 'international-transfers',
      heading: 'International transfers',
      paragraphs: [
        'Some providers are in, or use systems in, the United States and other countries outside the UK. Where we transfer personal information outside the UK, we rely on safeguards recognised under UK law, such as the UK Extension to the EU–US Data Privacy Framework where the provider is certified, the UK Addendum to the EU Standard Contractual Clauses, or the UK International Data Transfer Agreement. You can ask us for details.',
      ],
    },
    {
      id: 'how-long-we-keep-information',
      heading: 'How long we keep information',
      paragraphs: [
        'My Reflections entries and drafts: until you delete them or your account.',
        'Account, check-ins, completions and saved practices: until you delete your account.',
        'Anonymised account placeholder (no name or email): 12 months after deletion, or for as long as any record below is kept.',
        'Deletion record: 12 months.',
        'Record of agreement to the My Reflections notice: six years from account deletion.',
        'Free-trial marker (scrambled): 12 months from your last trial.',
        'Billing and membership records: six years.',
        'Website enquiries and booking details: 24 months after last contact.',
        'Assessment answers not linked to an account: 12 months.',
        'Backups: removed as they expire (30 days for our own backups, and our providers’ rolling windows of hours).',
        'Providers may keep limited records for a short time under their own policies.',
      ],
    },
    {
      id: 'deleting-your-account',
      heading: 'Deleting your account',
      paragraphs: [
        `You can delete your account in the app (Profile, then Delete Account), on the website (Academy, then Account), or by writing to ${PRIVACY_CONTACT_EMAIL}. We delete your journal, check-ins, practice completions, saved practices and practice notes, your sign-in account and your contact record in our email platform, and keep your account only as an anonymous placeholder. We keep some records for the reasons and periods in the section above. If you have a paid subscription you must cancel it first.`,
        'Messages you sent while signed out are not linked to your account and are not deleted automatically. Write to us and we will find and handle them.',
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your rights',
      paragraphs: [
        `You can ask us for a copy of your information, to correct it, to erase it, to restrict or object to our use of it, and, where we rely on consent, to withdraw consent at any time. There is no self-service export yet: we handle copy requests by email within one month. Write to ${PRIVACY_CONTACT_EMAIL}. We may ask you to confirm who you are.`,
        'If you are unhappy, please contact us first. You can also complain to the Information Commissioner’s Office (ico.org.uk, 0303 123 1113).',
      ],
    },
    {
      id: 'security',
      heading: 'Security',
      paragraphs: [
        'We use access controls, our providers’ security measures, and limited, authorised access to protect your information. We do not use your reflections for any purpose other than storing them for you. No method of transmission or storage is completely secure.',
      ],
    },
    {
      id: 'automated-decisions',
      heading: 'Automated decisions',
      paragraphs: [
        'We suggest practices using your check-ins by fixed rules; this does not make decisions with legal or similarly significant effects about you. We do not use AI to read your reflections.',
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      paragraphs: [
        'We will post changes here and, for important changes, tell you in the app or by email before they apply. Where a change affects how My Reflections works, we will ask for your permission again.',
      ],
    },
  ] satisfies readonly LegalSection[],
};
