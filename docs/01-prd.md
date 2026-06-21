# 01 — Product Requirements Document

> Status: Drafted (v1.0), source: founding PRD. Project Lead: Meesam Naqvi.
> Founder: Caroline Reed.

## Problem statement

High-achieving people — particularly women in demanding roles, practitioners
who support them, and executives carrying organizational pressure — are
told their struggles are a mindset problem. They aren't: capacity is shaped
by the nervous system, not by motivation, discipline, or willpower. TNSI
exists to make that physiological reality teachable, practical, and
actionable, as an alternative to coaching/therapy framing.

## Vision

To become the world's leading institute for nervous system education,
capacity building, and sustainable leadership.

## Mission

To help people succeed without sacrificing themselves by making nervous
system education practical, accessible, and transformative.

## Brand promise

Recalibrate your nervous system. Expand your capacity. Succeed without
sacrificing yourself.

## Core philosophy

Most people do not have a mindset problem — they have a capacity problem.
Capacity is shaped by the nervous system, not motivation or willpower. When
people understand and regulate the system beneath behaviour, they create
sustainable success, healthier relationships, stronger leadership, and
greater emotional freedom. See [02-brand-strategy.md](./02-brand-strategy.md)
for the fuller philosophical framing (adaptation, not brokenness).

## Goals

The platform should:

- Establish TNSI as the leading authority in nervous system education.
- Generate qualified leads for Life Beyond Trauma.
- Deliver premium educational experiences.
- Support practitioner training and certification.
- Provide executive advisory pathways.
- Build a scalable membership ecosystem.
- Publish high-quality research and educational content.
- Deliver personalised learning journeys through AI and assessments.

## Non-goals

- TNSI is **not** a therapy practice, a coaching business, a personal
  brand, or an online-course company (see
  [02-brand-strategy.md](./02-brand-strategy.md) — Brand Position). It does
  not diagnose or provide clinical advice, including via AI (see
  [07-technical-architecture.md](./07-technical-architecture.md) — AI risk
  callout).
- Not solving for: a generic wellness/mindfulness audience, B2C mass-market
  positioning, or anything that trades long-term institutional credibility
  for short-term growth tactics ("transform overnight," "life hack" framing
  is explicitly rejected — see brand strategy's language framework).

## Target users

See [05-user-personas.md](./05-user-personas.md) for full detail. Summary:

1. **High-Achieving Women** (primary) — burnout, perfectionism,
   over-functioning; served by Life Beyond Trauma + Membership.
2. **Practitioners** (secondary) — therapists/coaches/health professionals
   seeking structured, certifiable training; served by TNSI Academy.
3. **Executives & Leaders** (third) — founders/CEOs/senior leaders managing
   sustained pressure; served by Executive Advisory.
4. **Curious Learners** — not yet ready for a programme, need trust-building
   content first.

## Core requirements

Independent of implementation (see
[06-feature-specification.md](./06-feature-specification.md) for the
buildable spec):

- Public marketing site establishing institutional credibility.
- Insights hub (articles, podcast, research) as the trust-building layer.
- Capacity Assessment™ as the primary lead-qualification mechanism.
- Webinar/event registration.
- Programme pages (Life Beyond Trauma, Academy, Executive Advisory) with
  application/booking flows.
- Membership with a learning portal and community.
- CRM sync (Flowi) on every meaningful conversion event.
- AI guidance, scoped to approved Institute content only, never diagnostic.

## Business goals

**Short term (12 months):** launch the institute website, Life Beyond
Trauma, Insights; grow webinar registrations and programme applications;
build automated lead generation.

**Medium term (24 months):** launch TNSI Academy and practitioner
certification; launch Executive Advisory; build the membership community.

**Long term (3–5 years):** recognised authority status; internationally
recognised certification pathways; mobile application; AI-powered nervous
system guidance; organisational consulting.

## Success metrics

**Business:** programme applications, discovery calls, membership growth,
webinar registrations, Academy/Advisory enquiries.

**Marketing:** organic traffic, SEO rankings, email subscribers, social
growth, content engagement, returning visitors.

**Product:** assessment completion rate, course completion rate, dashboard
engagement, member retention, user satisfaction.

## Guiding principles

Everything built must feel: evidence-informed, professional, calm,
premium, intelligent, human, structured, trustworthy. This is an institute,
not a coaching website — every design decision, feature, and piece of
content should reinforce credibility, clarity, and long-term authority.

## Future vision

TNSI evolves from a digital education platform into a full ecosystem:
education, certification, research, leadership development, assessments,
AI guidance, community, publications, events, corporate partnerships. The
website is the first step; the platform is the destination.

## Open questions

- Webinar broadcast provider not yet chosen (Zoom Webinars vs. Livestorm —
  see [`ARCHITECTURE.md`](../ARCHITECTURE.md) open items).
- Transactional email and analytics vendors not yet chosen.
- Legal/product review of AI guidance scope has not happened yet — required
  before `packages/ai` is built (see
  [07-technical-architecture.md](./07-technical-architecture.md)).
