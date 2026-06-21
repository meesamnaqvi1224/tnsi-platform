# 04 — Information Architecture

> Status: Drafted (v1.0), source: founding Information Architecture &
> Platform Blueprint doc.

## Platform vision

The platform should feel less like a marketing website and more like a
modern educational institution. Every page should answer one of three
questions: **Learn**, **Experience**, or **Engage**.

## User types

| Type             | Description                    | Key features                                                                                   |
| ---------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Visitor          | Not registered                 | Read, explore, take assessment, register for webinar, book consultation                        |
| Member           | Membership access              | Dashboard, learning library, monthly sessions, community, resources, bookmarks, progress       |
| Programme Client | Life Beyond Trauma participant | Course dashboard, modules, worksheets, meditations, progress, support, session library         |
| Practitioner     | Academy student                | Training, assignments, certification, downloads, resources, community, directory               |
| Executive Client | Private Advisory               | Private dashboard, resources, session notes, planning docs, meeting library, private messaging |
| Administrator    | Platform management            | CMS, users, products, analytics, events, articles, automation                                  |

See [07-technical-architecture.md](./07-technical-architecture.md) for how
this maps onto `packages/auth`'s entitlements model — these are IA-level
roles, not 1:1 Clerk roles (entitlements can stack: a user can be both a
Member and a Practitioner).

## Navigation model

**Primary nav:** Home, About, Programs, Academy, Executive Advisory,
Insights, Assessment, Contact, Login.

## Site map / homepage structure

```
Hero → Core Promise → Choose Your Path → Capacity Framework™
  → Featured Programs → Latest Insights → Capacity Assessment™
  → Success Stories → About Caroline → Newsletter → Footer
```

**About:** Mission, Vision, Founder Story, The Institute, Our Philosophy,
Research, Media, FAQs.

**Programs:** Landing → Life Beyond Trauma → Membership → Workshops →
Events → Free Webinar.

**Academy:** Landing → Practitioner Training → Certification → Faculty →
Registry → Apply.

**Executive Advisory:** Overview, Who It's For, Leadership Capacity,
Private Advisory, Corporate Programs, Application, FAQs.

**Insights Hub:** categories (Capacity, Leadership, Trauma, Relationships,
Performance, Research, Founder Insights, Practitioner Education), plus
Podcast, Videos, Downloads. Every article includes Related Articles,
Related Podcast, Related Webinar, Related Program, Book Consultation,
Newsletter.

**Assessment Centre:** Capacity Assessment™, Leadership Capacity
Assessment™, Burnout Risk Assessment™, Practitioner Readiness
Assessment™. Every assessment generates: profile, score, recommendations,
email journey, Flowi CRM record.

**Member Portal:** Dashboard → My Learning → Resources → Journal →
Downloads → Events → Community → Account.

## Content/data hierarchy

Content is relational, not a flat page tree. Core relationship:

```
Author → writes → Article → belongs to → Category
                              → references → Program → contains → Resources
```

**Content taxonomy** (every piece of content is tagged):

- **Topics:** Capacity, Burnout, Leadership, Relationships, Trauma,
  Regulation, Performance, Overfunctioning, Anxiety, Self-Trust.
- **Audience:** Women, Leaders, Practitioners, Members, Executives.
- **Content type:** Article, Video, Podcast, Course, Worksheet,
  Meditation, Research, Webinar.

This taxonomy is what makes SEO pillar pages possible (see
[06-feature-specification.md](./06-feature-specification.md) §SEO
architecture) and is what an eventual AI guide queries instead of crawling
rendered HTML. The concrete schema (Sanity document types, fields) belongs
in [07-technical-architecture.md](./07-technical-architecture.md), not
here — this section is the conceptual model only.

## Search

Global search should index articles, courses, podcasts, events,
downloads, frameworks, FAQs, and programmes. Phase 2: semantic/AI search
with natural-language queries and personalised results.

## Permission boundaries

Conceptual access tiers, ordered by increasing privilege: Visitor →
Registered User → Member → Programme Client → Practitioner → Executive
Client → Faculty → Administrator. Each role has clearly defined access
permissions; the actual enforcement mechanism (entitlements in Postgres,
checked through one function) is specified in
[`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Platform architecture (conceptual)

```
Public Website → CMS → Flowi CRM → Payments → Authentication
  → Learning Portal → AI Layer → Analytics
```

Each layer is independent but connected — see
[07-technical-architecture.md](./07-technical-architecture.md) for the
concrete stack (Sanity, Flowi, Stripe, Clerk, etc.) this maps to.

## MVP scope (Phase 1 launch)

Public website, Insights Hub, Life Beyond Trauma, Membership page,
Executive Advisory page, Capacity Assessment, webinar registration,
contact & consultation booking, Flowi CRM integration, newsletter, basic
member dashboard. Everything else is a future release — see
[06-feature-specification.md](./06-feature-specification.md) for the full
module list and scalability roadmap.

## Success criteria

A first-time visitor should be able to, within a clear and intuitive
experience: understand the Institute, understand who it serves, understand
which pathway is right for them, take an assessment, register for a
webinar, explore programmes, book a consultation, and join the community.
