import type { LegalSection } from '@/components/utility/legal-document';

/**
 * Public account-deletion page: the web-accessible path that Google Play (and the App Store) require,
 * reachable without the app and without signing in. Every statement describes what the system does today
 * (see docs/my-reflections-backend.md §6 and docs/07-technical-architecture.md §Backup strategy).
 *
 * STATUS: product wording approved in principle (owner-delegated decisions, 16 Nov 2026). LEGAL APPROVAL IS
 * STILL REQUIRED before this ships to production - in particular "What we keep" and "Copies and backups",
 * and the open items listed in docs/account-deletion-and-data-retention.md (which is also the evidence
 * for every statement here). It deliberately contains NO controller details, privacy contact, DPO details,
 * age limit, response time, encryption claim or statement about who at TNSI can access data: none of
 * those has been confirmed. It names no period for the provider's recovery history because that depends
 * on the provider plan. Change the wording only together with the behaviour it describes.
 */
export const accountDeletionContent = {
  slug: 'delete-account',
  title: 'Delete Your Account',
  lastUpdated: '16 November 2026',
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
        'Your sign-in account is deleted, and you are signed out on every device.',
        'Everything you wrote in My Reflections, including drafts, is permanently deleted.',
        'Your check-ins, your practice history (including the short reflections you added after a practice), your saved practices and any assessment results linked to your account are permanently deleted.',
        'The details on your account, such as your name and email address, are removed from our records, and we delete your contact record from the system we use to manage member communications. From the moment you start deleting your account, we stop sending you marketing messages.',
        'The app or website tells you when your account has been deleted. If it tells you that deletion has started but is not finished, your reflections are already locked and cannot be opened; sign in again and repeat the deletion, or contact us, and it will be finished. If it tells you we are finishing the removal of your information, you do not need to do anything else.',
      ],
    },
    {
      id: 'what-we-keep',
      heading: 'What we keep',
      paragraphs: [
        'We do not erase everything. After your account is deleted we keep a small number of records, none of which contains your name, your email address or anything you wrote:',
        'A record that an account existed and was deleted, and when. This lets us make sure a deleted account stays deleted.',
        'If you ever had a paid membership or a free trial: a record of that membership, including the reference our payment provider uses for it, and a coded marker that prevents a second free trial for the same email address. The marker is not your email address and cannot be turned back into it by us without a separate secret key.',
        'Our payment provider keeps its own records of payments, as it is required to.',
        'If you used a form on our website without being signed in, for example the contact form or an assessment, that submission is not part of your account and is not removed by deleting your account. Contact us if you would like it deleted.',
      ],
    },
    {
      id: 'copies-and-backups',
      heading: 'Copies and backups',
      paragraphs: [
        'After deletion, copies of your information can remain for a limited time in our database provider’s recovery history and in any backup copy we have taken for safety. We keep a safety backup for no longer than 30 days. If we ever have to restore from a backup, we remove deleted accounts from it again before it is used.',
      ],
    },
  ] satisfies readonly LegalSection[],
};
