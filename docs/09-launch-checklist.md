# Launch Checklist — RC1

Public website release candidate for The Nervous System Institute.

**Target:** Production launch of the marketing site  
**Scope:** All public routes in `apps/web`  
**Last updated:** 1 July 2026

---

## Visual QA

- [ ] Homepage hero, trust bar, and CTA band render correctly
- [ ] About, Method, Programs and all program sub-pages display without layout shifts
- [ ] Resources, Articles, and article template maintain reading column width (760px)
- [ ] Research, Faculty, Discovery Call, and Contact pages match editorial tone
- [ ] Utility pages (404, Search, Privacy, Terms, Accessibility, Cookies) are readable and on-brand
- [ ] Footer legal links resolve correctly (`/privacy`, `/terms`, `/accessibility`, `/cookies`)
- [ ] Placeholder photography treatment is consistent (caption style, aspect ratios)
- [ ] No stock business imagery or off-brand visuals
- [ ] Typography hierarchy is consistent (H1 → H2 → H3) across all pages
- [ ] Chapter markers appear only at major section transitions

---

## Responsive QA

Test at: **1440px**, **1280px**, **1024px**, **768px**, **390px**, ultra-wide (1920px+)

- [ ] Desktop navigation displays all primary links
- [ ] Mobile drawer opens, closes, and links navigate correctly
- [ ] Hero sections do not clip text on small screens
- [ ] Alternating image/text sections stack cleanly on mobile
- [ ] Article template: TOC hidden on mobile, body column full width
- [ ] Contact form fields are full width and tappable on mobile
- [ ] Search interface suggestions wrap without overflow
- [ ] Footer grid collapses to single column on mobile
- [ ] No horizontal scroll on any page
- [ ] Sticky header does not obscure anchor targets

---

## Accessibility QA

- [ ] Keyboard navigation reaches all interactive elements (nav, buttons, links, form, accordions)
- [ ] Focus rings visible on all focusable elements
- [ ] Heading order is logical on every page (no skipped levels)
- [ ] All images have `alt` text or `sr-only` descriptions
- [ ] Accordions use native `<details>` / `<summary>` with visible focus
- [ ] Form fields have associated labels and `aria-describedby` where applicable
- [ ] Colour contrast meets WCAG 2.1 AA (text, links, buttons)
- [ ] `prefers-reduced-motion` disables animations and smooth scroll
- [ ] Screen reader landmarks: `<header>`, `<main>`, `<footer>`, `<nav>`
- [ ] 404 page is helpful and navigable without mouse

---

## SEO QA

- [ ] Every public page has unique `title` and `description`
- [ ] OpenGraph tags present (title, description, url, image)
- [ ] Twitter Card tags present (`summary_large_image`)
- [ ] Canonical URLs set on all indexed pages
- [ ] `/sitemap.xml` includes all public routes and article slugs
- [ ] `/robots.txt` allows crawling and references sitemap
- [ ] JSON-LD: Organization (sitewide), WebPage (per page), BreadcrumbList (where appropriate)
- [ ] Article pages include Article schema
- [ ] Search page set to `noindex` until backend is live
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain before deploy

---

## Performance QA

- [ ] `pnpm build` completes without errors or warnings
- [ ] Lighthouse Performance ≥ 90 on Homepage (production build)
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Images use `next/image` with appropriate `sizes`
- [ ] No unused imports or dead components in production bundle
- [ ] Fonts loaded via `next/font` (no render-blocking external CSS)
- [ ] Client components limited to interactive surfaces (header scroll, search, reading progress)
- [ ] Static pages pre-rendered where possible

---

## Content QA

- [ ] No `@tnsi.org` addresses remain anywhere (`tnsi.org` is an unintended domain the Institute does not use - see the 23 Oct 2026 removal); official contact email addresses are TBC by the owner and are not published until verified
- [ ] Caroline Reed biography consistent across About, Faculty, Discovery Call
- [ ] Programme links resolve (Life Beyond Trauma → `/method`)
- [ ] Article slugs in search index match published articles
- [ ] Legal pages dated and institutionally toned (not tiny legal text)
- [ ] No lorem ipsum or TODO copy visible on public pages
- [ ] Footer copyright year is current (2026)
- [ ] No fake guest faculty listed

---

## Launch Tasks

- [ ] Set `NEXT_PUBLIC_SITE_URL` in production environment
- [ ] Deploy `apps/web` to hosting (Vercel or equivalent)
- [ ] Verify `/sitemap.xml` and `/robots.txt` on production URL
- [ ] Submit sitemap to Google Search Console
- [ ] Connect domain and SSL certificate
- [ ] Integrate Calendly embed on `/book-a-call` (replace `CalendlyEmbed` placeholder)
- [ ] Connect contact form server action to email service (Resend / SendGrid)
- [ ] Replace placeholder SVG photography with approved editorial assets
- [ ] Add Caroline Reed approved portrait to `/public`
- [ ] Configure analytics (privacy-compliant) — **W-01 (PR #9) is implemented and tested; production analytics stays OFF until every item under "Remaining" is closed. Nothing here is a statement of legal compliance.**
  - **Completed (verified):**
    - [x] Consent: Google Analytics loads only after "Accept analytics"; Reject, no choice and withdrawal keep it off; withdrawal disables collection and expires GA cookies; "Cookie preferences" footer control; choice persists; fails closed without a valid `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Browser-tested with a fake ID and intercepted Google requests.
    - [x] Global Privacy Control: read from `navigator.globalPrivacyControl`. While on, analytics never starts, a saved Accept does not enable it, a new Accept is stored but inert, a running session is stopped (checked again when the tab is focused or shown), and the saved choice is never rewritten by the signal. Banner states this and keeps Reject and Accept equal. Unit-tested; **not** a claim that any law is satisfied.
    - [x] Do Not Track is **not supported** (discontinued W3C signal, not treated as GPC); the cookie policy says so.
    - [x] Measurement only: ad storage / ad user data / ad personalization declared denied before config; Google signals and ad-personalization signals off on every page view.
    - [x] UTM kept in memory until consent, stored only after Accept, cleared on Reject/withdrawal; no UTM fields in the Return Path sign-up request.
    - [x] Banner: equal-weight Reject/Accept, 320×568 now about 52% of the viewport (was 67%); axe-core 0 violations on the first-visit and reopened panel; focus returns to the footer control after a choice.
    - [x] Re-verified after merging `main` (incl. PR #8) on 23 Oct 2026: TypeScript, ESLint (0 warnings) and Prettier clean; web suite 347 passed / 42 skipped; the same 2 DB suites (`sync-somatic.integration.test.ts`, `somatic-cards.integration.test.ts`) do not load without `DATABASE_URL` (run later with: `TNSI_TEST_DATABASE_URL=<non-production test DB> pnpm --filter @tnsi/web exec vitest run`). Combined cookie/privacy text keeps the analytics wording and has no `tnsi.org` addresses.
    - [x] PR coordination: PR #8 + PR #9 merge-simulate with no conflicts and keep both changes (re-check after any further edit to `cookies.ts` or `privacy.ts`).
  - **Remaining before release (owner action):**
    - [ ] Owner/legal approval of the proposed `cookies.ts` / `privacy.ts` wording, including: Google's role and the data-processing terms accepted, international transfers, retention, lawful basis (UK/EU consent vs. any statistical-purposes exception), whether UTM attribution should ever accompany sign-up, and the `lastUpdated` date (unchanged on purpose)
    - [ ] Decide whether an Accept should be able to override an active GPC signal (currently it cannot) and confirm the US-state coverage that applies to TNSI
    - [ ] In the GA4 property (not inspectable from the repository): confirm data retention (2 or 14 months), Google signals / data-sharing settings, and that the data-processing terms and US state addendum are accepted
    - [ ] **Flowi booking embed** (`link.flowi.io`, an iframe on the Discovery Call page): it loads without consent and the parent page cannot control cookies or storage set inside a cross-origin iframe. Ask Flowi (or the owner, via the Flowi account) which cookies/storage and analytics the booking widget uses and whether it can be switched off; then confirm or adjust the "Booking Calendar" paragraph in `cookies.ts`. Until confirmed, the policy only says Flowi may set its own cookies and that they are outside the analytics choice. If it is not acceptable to load before consent, the page needs a click-to-load placeholder (not built: it changes the booking experience).
    - [ ] Manual screen-reader pass (VoiceOver on iOS Safari and macOS Safari; NVDA on Windows Chrome/Firefox): banner announced as a dialog with its title, description and (when present) the GPC notice; Reject and Accept reachable in order and announced by name; choice announced; "Cookie preferences" reopens with focus on the heading and the current choice announced; Escape/Close and a first-visit choice return focus to the footer control. Not run in the build environment.
    - [ ] CI: the `tnsi-platform-somatic-prod` Vercel check fails on every recent PR (#7, #8, #9) and is outside this change; the `tnsi-platform` preview build must be green. Two web test files need `DATABASE_URL` and do not load without it (`sync-somatic.integration.test.ts`, `somatic-cards.integration.test.ts`).
    - [ ] Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel **Production only**, then redeploy (value is inlined at build); check the live site sends nothing to Google before Accept and that a browser with GPC on stays silent after Accept
- [ ] Set up error monitoring (Sentry or equivalent)
- [ ] Run full Visual + Responsive + Accessibility QA on production URL

---

## Post Launch Tasks

- [ ] Implement backend search (replace static search index)
- [ ] Connect Sanity CMS for content management
- [ ] Build Life Beyond Trauma dedicated programme page (`/programs/life-beyond-trauma`)
- [ ] Add real office address and map to Contact page
- [ ] Publish formal research white papers when available
- [ ] Add guest faculty profiles as partnerships are confirmed
- [ ] Monitor 404 logs and add redirects for common misspellings
- [ ] Quarterly accessibility audit
- [ ] Review legal pages with counsel before major programme launches
- [ ] A/B test Discovery Call conversion (no urgency tactics)

---

## Verification Commands

```bash
pnpm lint
pnpm type-check
pnpm build
```

All three must pass with zero errors and zero warnings before tagging RC1.
