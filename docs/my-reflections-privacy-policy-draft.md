# My Reflections: draft privacy-policy wording

**STATUS: DRAFT FOR CAROLINE AND LEGAL REVIEW. NOT APPROVED. NOT PUBLISHED.**
Nothing in `apps/web/src/content/legal/privacy.ts` has been changed, and it must not be changed until this is
approved. This is proposed wording, not legal advice. Items in **[DECISION]** and **[VERIFY]** need an answer
from the owner, Caroline or a qualified adviser before anything is published.

The current policy (last updated 1 July 2026) covers the website only, cites UK GDPR, and says nothing about
the app, member accounts, My Reflections, or account deletion.

## 1. Facts this wording rests on (so reviewers can check them)

| Fact                                                                                                                                                                                                                                                                                                                                                        | Source                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Reflections are stored in the TNSI Postgres database (Neon), tied to the member's account. Only the signed-in member can read, edit or delete their own; other members get "not found".                                                                                                                                                                     | `docs/my-reflections-backend.md` §2-3                                    |
| **Drafts are saved automatically.** While a member writes a new or draft reflection on the website or in the app, the text is saved to their own journal on our server as a draft a few seconds after they stop typing, and as the page is closed. It is never stored in the browser. A saved reflection is only ever changed when the member presses Save. | web editor (PR #55)                                                      |
| Reflection text is never sent to analytics, the CRM (Flowi) or any third party, never logged, and never used for recommendations, check-ins or any analysis. There is no AI.                                                                                                                                                                                | §5; tests in `journal-independence`, `private-response`                  |
| The website's analytics (GA4) is switched off for the reflections pages.                                                                                                                                                                                                                                                                                    | `analytics-exclusions.ts`                                                |
| The production database is hosted by Neon in the **United States** (`aws-us-east-2`).                                                                                                                                                                                                                                                                       | `docs/07-technical-architecture.md`                                      |
| Deleted rows can remain in Neon's restore history for **6 hours** and in any **manual backup branch** until it is deleted.                                                                                                                                                                                                                                  | `docs/07-technical-architecture.md` §Backup strategy                     |
| Account deletion removes the journal, the sign-in identity (Clerk) and marks the account deleted. Check-ins, practice completions, reflections-on-practices and saves are **retained** (the account row is soft-deleted).                                                                                                                                   | `docs/my-reflections-backend.md` §6                                      |
| Account deletion is refused while a paid membership is active.                                                                                                                                                                                                                                                                                              | §6                                                                       |
| Staff and engineers with database access could technically read reflection text.                                                                                                                                                                                                                                                                            | Inherent in the design: **no end-to-end encryption**. State it, see 3.4. |

## 2. Questions that change the wording (need answers first)

1. **[DECISION] Special category data.** A private journal about nervous-system regulation can easily contain
   health information, which is special category data under UK GDPR Article 9 and normally needs explicit
   consent in addition to a lawful basis. Does legal want an explicit consent step the first time a member
   opens My Reflections? (Not built. It is a product change.)
2. **[DECISION] Staff access.** May the policy say "we do not read your reflections"? Today that is a rule,
   not a technical guarantee. Proposed honest wording is in 3.4. Alternatively add a written access policy
   (who, when, logged).
3. **[DECISION] International transfers.** The database is in the United States while the policy cites UK
   GDPR. Legal to confirm the transfer mechanism (for example the UK addendum or an adequacy route) for Neon,
   Vercel and Clerk, and whether a region change is wanted.
4. **[DECISION] Retention of other member data on deletion.** Check-ins, completions and saves are kept after
   deletion. Either say so plainly (3.7) or change the product to erase them.
5. **[DECISION] Backups.** Choose and commit to a delete-by period for manual backup branches (proposed: 30
   days) and whether to buy a longer restore window.
6. **[VERIFY] Encryption at rest.** Do not claim it until confirmed in Neon's current documentation for the
   plan in use. In transit (HTTPS) is standard.
7. **[VERIFY] Controller details, contact address and DPO/ICO registration** for the policy header.

## 3. Proposed wording

### 3.1 New section: "My Reflections (private journal)"

> **My Reflections**
>
> My Reflections is a private space in the TNSI app where you can write for yourself. What you write there
> is called a reflection.
>
> **What we store.** We store the reflections you choose to save (and any drafts), together with the date you
> began writing and the date you last changed them. Each reflection is linked to your account.
>
> **Who can see them.** Only you can read, edit or delete your reflections. Other members cannot see them.
> We do not use your reflections to choose practices for you, to change your recommendations, or to analyse
> you in any way. We do not use artificial intelligence on them. We do not send them to our analytics tools,
> our customer-management system, or any other third party for their own purposes.
>
> **Special care.** Reflections can be very personal and may include information about your health or
> wellbeing. **[DECISION: add explicit-consent wording here if legal requires it.]**
>
> **Where they are kept.** Reflections are stored with our database provider, Neon, in the United States
> **[VERIFY transfer mechanism]**, protected in transit by HTTPS. **[VERIFY: add encryption at rest only if
> confirmed.]**
>
> **Automatic drafts.** On the website and in the app, what you are writing is saved automatically to your private journal as a draft, so you do not lose it if you close the page. You can delete a draft at any time.
>
> **How long we keep them.** We keep your reflections until you delete them or delete your account.

### 3.2 Deleting a reflection

> You can delete any reflection at any time from the app or the website. A deleted reflection is removed
> from your journal immediately and cannot be recovered by you or by us from the app.

### 3.3 Deleting your account

> You can delete your account in the app (Profile, then Delete Account) or on our website at
> **[URL of the account-deletion page]**. If you can no longer sign in, contact us at
> **[support address]** and we will delete your account after confirming it is yours.
>
> When you delete your account, your reflections are permanently deleted, your sign-in is removed, and you
> are signed out. If you have an active paid membership, please cancel it first; we cannot delete an account
> while a paid membership is running, and the app will tell you how to cancel.

### 3.4 Who at TNSI can access the database (choose one)

> **Option A (honest default):** Reflections are stored in our database and are not end-to-end encrypted.
> Our staff do not read members' reflections, and access to the database is limited to a small number of
> people who need it to run the service **[confirm this is true and enforced]**. We may be required to
> disclose information where the law requires it.
>
> **Option B:** add a written access policy (who, when, logged) and refer to it.

### 3.5 Backups (use the retention period decided in 2.5)

> After you delete a reflection or your account, copies can remain in our database provider's recovery
> history for up to **6 hours** **[VERIFY number still correct at publication]**, and in any backup we have
> taken for safety, which we delete within **[30] days** **[DECISION]**. We do not restore deleted data
> except to recover the service after a failure, and any restored data is deleted again straight away.

### 3.6 Service providers (add to the existing "share data" paragraph)

> We use Neon (database), Vercel (hosting), Clerk (sign-in and account identity) and, for the CRM,
> Flowi. Reflections are not shared with the CRM.

### 3.7 What account deletion does not remove (only if the product is unchanged)

> Deleting your account permanently deletes your reflections. Records of your check-ins, practice activity
> and saved practices are kept in a form tied to your now-deleted account **[DECISION: or delete them]**.
> Records we must keep by law (for example payment records) are kept as required.

### 3.8 Rights (extend the existing "Your Rights" section)

> You can ask us for a copy of your reflections, to correct them, or to delete them. You can delete
> reflections and your account yourself, as described above. **[DECISION: export. There is no export feature
> today; a request-based process or a built feature is needed to honour access/portability requests.]**

## 4. Store privacy declarations (to complete alongside the policy)

- **Apple App Privacy:** user content (journal text), linked to the user's identity, **not** used for tracking.
- **Google Play Data safety:** collects user-generated content; not shared; encrypted in transit; users can
  request deletion (in-app and via the web page); links to the policy and to the deletion URL.
- Both stores need the **public deletion URL** and the final policy text published before submission.

## 5. Publishing checklist

1. Owner and Caroline answer section 2.
2. Legal reviews and edits section 3.
3. Update `privacy.ts` (and its `lastUpdated`) in a separate PR after approval.
4. Publish **before** the first release that contains My Reflections.
5. Fill in the store declarations from section 4.
