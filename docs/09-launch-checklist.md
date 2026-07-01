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

- [ ] All placeholder emails use `@tnsi.org` domain consistently
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
