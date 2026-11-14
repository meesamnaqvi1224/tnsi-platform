import type { LegalSection } from '@/components/utility/legal-document';

/**
 * Public account-deletion page: the web-accessible path that Google Play (and the App Store) require,
 * reachable without the app and without signing in. Every statement describes what the system does today
 * (see docs/my-reflections-backend.md §6 and docs/07-technical-architecture.md §Backup strategy).
 *
 * PENDING CAROLINE/LEGAL APPROVAL before this ships to production, in particular the "Other records" and
 * "Copies and backups" sections (docs/my-reflections-privacy-policy-draft.md §2 lists the open decisions).
 */
export const accountDeletionContent = {
  slug: 'delete-account',
  title: 'Delete Your Account',
  lastUpdated: '14 November 2026',
  introduction:
    'You can delete your TNSI account at any time, in the app or on this website. This page explains how, and exactly what happens to your information.',
  sections: [
    {
      id: 'in-the-app',
      heading: 'In the app',
      paragraphs: [
        'Open the TNSI app, go to Profile, then tap Delete Account and follow the steps. The app tells you when your account has been deleted.',
      ],
    },
    {
      id: 'on-the-website',
      heading: 'On the website',
      paragraphs: [
        'Sign in to your account and open Account in the Academy menu. There you can delete your account. You will be asked to confirm before anything is deleted.',
        'If you can no longer sign in, contact us through our Contact page, tell us the email address on the account, and we will delete it after confirming it is yours.',
      ],
    },
    {
      id: 'before-you-delete',
      heading: 'Before you delete',
      paragraphs: [
        'If you have an active paid membership, cancel it first. We cannot delete an account while a paid membership is running. In the app, go to Profile, then Membership & Access, then Manage. On the website, open Membership in the Academy menu.',
      ],
    },
    {
      id: 'what-is-deleted',
      heading: 'What is deleted',
      paragraphs: [
        'Everything you wrote in My Reflections, including drafts, is permanently deleted. Your sign-in account is deleted, and you are signed out on every device.',
        'Deletion takes effect straight away. If something interrupts it, your reflections stay locked and unavailable; sign in again and repeat the deletion, or contact us, and it will be finished.',
      ],
    },
    {
      id: 'other-records',
      heading: 'Other records',
      paragraphs: [
        'Records of your check-ins, practice activity and saved practices are kept in a form linked to your deleted account, rather than being erased. Records we are legally required to keep, such as payment records, are kept as required.',
      ],
    },
    {
      id: 'copies-and-backups',
      heading: 'Copies and backups',
      paragraphs: [
        'After deletion, copies of your information can remain for a short time in our database provider’s recovery history (currently up to 6 hours), and in any backup copy taken for safety, which we remove once it is no longer needed.',
      ],
    },
  ] satisfies readonly LegalSection[],
};
