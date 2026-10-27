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
- [ ] **Membership / billing launch gates** (membership stays CLOSED until every item is done and the launch is separately authorised; PR #12)
  - [x] Server-side launch gate (`REGULATION_SUITE_MEMBERSHIP_OPEN` exactly `true` + full Stripe configuration), checked in the route and inside `createCheckoutSession`; closed by default
  - [x] Lifetime purchases rejected server-side; existing Lifetime entitlements preserved (webhook never overwrites or revokes them; signed Lifetime payments after 23 Oct 2026 are skipped for manual review)
  - [x] Duplicate-subscription protection: refused for current members, Stripe checked for live subscriptions, one Stripe customer per user, session reuse/expiry, idempotency keys, second live subscription flagged (never auto-cancelled)
  - [ ] **Stripe Dashboard, live mode (owner/account holder; nothing exists or has been touched):** create the two recurring GBP Prices (£5.99/month, £59.99/year) with no trial and no Lifetime Price; create a **restricted Billing Portal configuration** (payment methods, invoice history, cancellation at period end; no plan switching, quantity changes, pausing or customer-information editing) and set `STRIPE_PORTAL_CONFIGURATION_ID`; register the webhook endpoint and signing secret; retry schedule aligned with the 7-day grace period. _The Sandbox equivalents were created and verified on 27 Oct 2026; they do not count for live mode._
  - [x] Release procedure and rollback documented: [membership-release-runbook.md](./membership-release-runbook.md)
  - [x] Sandbox verification run on 27 Oct 2026 and recorded in runbook section 3 (Stripe Sandbox, Clerk development instance, disposable local PostgreSQL; no production resource touched). **Passed:** monthly and annual checkout session creation; subscription payment (substituted through the Stripe API, not the hosted Checkout page) and entitlement sync; invalid-signature rejection; webhook replay and out-of-order safety; duplicate-subscription flagging (never auto-cancelled or refunded); cancellation at period end; immediate cancellation; failed payment with the 7-day grace; failed-payment recovery; Billing Portal session creation; card-free trial with live Clerk
  - [ ] **Not verified, still required (runbook 3.3):** one manual Sandbox checkout through the hosted Checkout page (covers `checkout.session.completed` and the success-page reconciliation); the lapse at the end of a paid period; a natural renewal cycle; grace expiry in real time (verified only as a database simulation); the trial with an unverified primary email (**blocked** by Clerk, which does not allow that account state; covered only by simulated-provider route tests); and the cases listed as not re-run in 3.3
  - [ ] See [membership-trial-integration-plan.md](./membership-trial-integration-plan.md) for how the trial reaches `main`
  - [ ] **The 30-day card-free trial is not implemented on `main`** (checkout has no trial). It exists only on the unreleased membership branch; it must be merged and tested before the public page's trial wording is true at launch
  - [ ] Existing Lifetime rows audited on an approved isolated copy (never production data directly)
  - [ ] **Duplicate-subscription manual review** (verified behaviour: flagged, never cancelled or refunded; today only a log line and an entitlement metadata flag): a named owner and backup, an alerting mechanism so a person is told, and an owner-approved procedure (runbook 3.4)
  - [ ] Refund wording ("Payments are not refunded") reviewed by counsel
  - [ ] Authorised launch decision, then set `REGULATION_SUITE_MEMBERSHIP_OPEN=true`
- [ ] Integrate Calendly embed on `/book-a-call` (replace `CalendlyEmbed` placeholder)
- [ ] Connect contact form server action to email service (Resend / SendGrid)
- [ ] Replace placeholder SVG photography with approved editorial assets
- [ ] Add Caroline Reed approved portrait to `/public`
- [ ] Configure analytics (privacy-compliant)
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
