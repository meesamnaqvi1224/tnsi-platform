# 06 — Feature Specification

> Status: Drafted (v1.0), source: founding Product Feature Specifications
> (Functional Requirements) doc. Translates
> [01-prd.md](./01-prd.md)/[04-information-architecture.md](./04-information-architecture.md)
> into a buildable spec.

## Scope

Every feature should support one or more of: Education, Assessment,
Transformation, Community, Professional Development, Lead Generation,
Long-Term Engagement.

## Platform modules (nine)

1. Public Website
2. Learning Platform
3. Member Portal
4. Assessment Engine
5. Events & Webinar System
6. Resource Library
7. AI Institute Guide
8. Community
9. Admin & CMS

Each module operates independently while sharing user data through a
common authentication and CRM layer (see
[07-technical-architecture.md](./07-technical-architecture.md)).

## Public website

**Homepage:** hero, interactive "Choose Your Path," Capacity Framework™,
featured programmes, latest insights, testimonials, upcoming webinar,
Capacity Assessment CTA, newsletter signup, footer nav.

**Insights:** categories, featured articles, search, filters, reading
time, author profiles, related resources, share, bookmark (comments:
future).

**Program pages:** overview, who it's for, learning outcomes, curriculum,
testimonials, FAQs, pricing, apply/book consultation, related resources.

## Capacity Assessment Engine

**Purpose:** the primary lead-generation and segmentation tool.

**Functional requirements:** multiple assessments, progress indicator,
autosave, personalised questions, dynamic scoring, personalised report,
recommended learning pathway, CRM integration, email automation trigger,
admin analytics.

**Future:** assessment history, progress comparison, downloadable reports,
AI interpretation.

## Member Portal

Dashboard, current programme, continue learning, upcoming events, journal
prompts, recommended resources, saved articles, personal notes, progress
tracker, certificates, account settings.

## Learning Platform

**Course structure:** modules, lessons, video, audio, worksheets,
downloads, reflection exercises, progress tracking, completion status,
bookmarks, search within courses.

**Learning features:** resume where left off, lesson notes, lesson
completion, discussion prompts, resource downloads, certificates
(Academy).

## Webinar & Events Platform

Upcoming events, registration, calendar integration, replay library,
reminder emails, attendance tracking, certificates (Academy). Event
categories: Public Webinar, Workshop, Masterclass, Member Event,
Practitioner Training, Executive Briefing.

## Resource Library

**Purpose:** a searchable knowledge hub. Content types: articles, videos,
podcasts, worksheets, meditations, research, templates, frameworks,
downloads. Filters: topic, audience, difficulty, format, duration, author.

## AI Institute Guide (Phase 2)

**Purpose:** help users navigate the Institute and discover relevant
resources.

**Capabilities:** ask questions, recommend articles, suggest programmes,
summarise research, recommend podcasts, navigate website, support
assessments.

**Future:** conversation memory, personal learning recommendations,
assessment interpretation, practice reminders, resource generation.

**Hard constraint:** AI supplements education — it does not diagnose or
replace professional support. See
[07-technical-architecture.md](./07-technical-architecture.md) for the
full AI risk callout (moderation, escalation path, eval before shipping
prompt changes).

## Community Platform

User profiles, discussion spaces, topic channels, member introductions,
event discussions, resource sharing, Practitioner Forum, Leader Forum,
notifications, live Q&A. Private groups: future.

## Search Engine

Global search indexes: articles, courses, podcasts, events, downloads,
frameworks, FAQs, programmes. Future: semantic search, natural-language
questions, personalised recommendations.

## User Account

Profile, saved resources, learning history, assessment results,
certificates, invoices, membership, notification preferences, security
settings, password management.

### Membership and billing: implementation and verification status (27 October 2026)

Membership is **closed in production** and the integration is **not launch-ready**.
The approved model is a free account plus paid membership (£5.99 per month or
£59.99 per year), a 30-day card-free trial managed by the application, a 7-day
grace period after a failed payment, and no new Lifetime purchases. The policy
and detail are in `membership-commercial-decisions.md`; the release procedure and
test results are in `membership-release-runbook.md`.

- **Verified on 27 October 2026**, in a local run against Stripe **Sandbox**, a
  Clerk **development** instance and a disposable PostgreSQL, with no production
  configuration changed: checkout session creation, two owner-paid payments on
  the hosted Checkout page (genuine `checkout.session.completed`, valid
  signatures, one subscription, one entitlement row and one invoice each time),
  the success page recording the subscription **while the genuine webhooks were
  held** (zero webhooks processed by the app; signature verification was never
  disabled), with the held deliveries then released unchanged and processed safely, duplicate-subscription
  flagging, cancellation at period end and immediately, a failed payment with its
  grace period and recovery, webhook signature rejection and replay safety (the
  last two with locally forged requests), and the card-free trial through live
  Clerk. Grace expiry was verified only as a database simulation.
- **Unverified or not tested:** the Stripe-to-localhost browser redirect after
  payment (the browser returned to Clerk's sign-in page; the success page passed
  when its exact URL was loaded after signing in again, and the redirect has not
  been checked with a production Clerk configuration), the visible price on the
  hosted page (Stripe's data confirms £5.99; no screenshot), a natural renewal
  cycle, and the lapse at the end of a paid period. The trial with an unverified
  primary email is **blocked**, because Clerk does not allow that account state in
  the development instance.
- **Required before launch:** live-mode Stripe configuration (it does not exist),
  a named owner and backup, an alerting mechanism and an approved procedure for
  flagged duplicate subscriptions (today only a log line and a metadata flag),
  counsel's review of the refund wording, and a separate launch authorisation.

## Admin Dashboard

User management, content management, programme management, assessment
builder, events management, media library, CRM sync status, analytics
dashboard, AI knowledge management, email broadcasts.

## Analytics Dashboard

Traffic, SEO, programme applications, assessment completion, course
progress, popular resources, user retention, search queries, AI
conversations, webinar attendance, revenue, export reports.

## CRM integration (Flowi)

Every important action syncs automatically:

```
Assessment        → Create Contact
Newsletter        → Lead
Webinar Registration → Pipeline
Consultation Booking → Opportunity
Programme Purchase → Client
Membership         → Member
```

Automation triggers: welcome emails, nurture sequences, webinar
follow-ups, programme onboarding, renewals, re-engagement. See
[`ARCHITECTURE.md`](../ARCHITECTURE.md) for how this is implemented as one
adapter in `packages/integrations`, driven by domain events defined in
`packages/core`.

### CRM outbox (how the website forms reach Flowi)

Contact form, newsletter and assessment submissions are written to a durable
queue (`crm_outbox`, Postgres) and then sent to Flowi with retries. The assessment
row is stored in the same transaction as the visitor's own submission, so a CRM
outage, slow response or missing credential can never lose a submission.

- **Delivery:** one immediate attempt when the form is submitted, then a worker
  (`GET /api/internal/crm-outbox`, bearer `CRON_SECRET`, fails closed when unset)
  retries. Delivery is **two steps**: upsert the contact, then add the TNSI tag with
  Flowi's Add Tags call. The upsert never sends `tags`, because Flowi documents that
  tags on an upsert "overwrite all current tags associated with the contact", which
  would wipe the tags Caroline's automations use. A row is `sent` only when both
  steps succeeded; if the tag step fails the row stays `pending` with the Flowi
  contact id saved, so the retry only re-adds the tag.
- **Immediate attempt:** made inside the visitor's own request, after the submission
  is stored, with one shared limit of about 3 seconds across both Flowi calls
  (`OUTBOX.immediateBudgetMs`). If Flowi is slow the row simply stays `pending` for
  the worker; the visitor's response never depends on Flowi. The worker's own calls
  keep the longer 8-second limit.
- **Stale contact id:** if adding tags returns 404 for a contact id saved on the row
  (the contact was deleted or merged in Flowi), the id is cleared and the row retried;
  the next attempt upserts again to get a fresh id. Only that case clears it.
- **Failure handling:** temporary failures (429, 5xx, timeouts, network) retry with
  doubling back-off (2 min up to 6 h) up to 10 attempts. Configuration/permission
  failures (not configured, 401, 403, 404) are retried only 5 times. Any other 4xx is
  a rejected request and is not retried. After that the row is left `failed`, never
  deleted. Rows sent more than 30 days ago are deleted. These numbers are
  engineering defaults in `apps/web/src/lib/crm-outbox.ts`.
- **Visibility and recovery:** the worker's response reports `failedRows` and
  `failedBy` (counts per category such as `HTTP 401` - no emails, payloads or provider
  text). `requeueFailed()` puts failed rows back in the queue (optionally one
  category) once the cause is fixed; it is a tested function that is **not exposed
  by any route yet** - exposing it is an access-control decision.
- **Time budget:** the worker claims one row at a time and stops starting new rows
  after 40 s, so a run (each row can make two 8 s Flowi calls) finishes inside the
  route's 60 s limit; unprocessed rows wait for the next run.
- **What is sent:** contact form - name, email, tag, and the message, subject and
  organisation in the "TNSI Website" custom fields (IDs in
  `packages/integrations/src/flowi-fields.ts`); newsletter - email and tag (the
  marketing-consent field is deliberately not set until the consent wording is
  decided); assessment - email, tag and the result tier's name only, **never the
  answers or the score**.
- **Direction:** one way, from the website to Flowi. Nothing changed in Flowi
  affects access or any other website state.
- **Scheduler (Vercel Hobby plan):** `apps/web/vercel.json` runs the worker **once
  a day at 06:00 UTC (11:30 India time)**. Hobby cron jobs cannot run more often
  than daily, and a more frequent schedule makes the deployment fail (a test guards
  this); Hobby also only promises the run happens within that hour, and cron runs
  only on production deployments. Needs `CRON_SECRET` set on the Vercel project.
- **What that means for retries:** the immediate attempt when a form is submitted
  covers the normal case. If Flowi is down at that moment the row waits for the next
  daily run, so a failed delivery is retried about once a day, not every few
  minutes, and the 10-attempt limit means roughly ten days before a row is left as
  `failed`. Moving to Vercel Pro and changing the schedule to `*/5 * * * *` (the
  worker's back-off already supports it) makes recovery near-immediate.
- **Running twice is safe:** the worker claims rows with `FOR UPDATE SKIP LOCKED`
  and a short lease, so two overlapping runs never take the same row, and a repeat
  delivery of a row would only rewrite the same contact in Flowi (matched by email).
- **Not done yet:** applying the `crm_outbox` migration to production (before this
  code is deployed), adding `CRON_SECRET`, verification of the custom-field payload
  against the live Flowi account with a throw-away contact, and an admin view of
  failed rows. Membership state is not mirrored into Flowi (separate project).

## Notification System

Email, in-app, future push. Examples: course reminders, upcoming webinars,
new articles, membership updates, certificates, community replies.

## Security & permissions

Roles: Visitor, Registered User, Member, Programme Client, Practitioner,
Executive Client, Faculty, Administrator — each with clearly defined
access permissions (conceptual model in
[04-information-architecture.md](./04-information-architecture.md);
enforcement mechanism in [`ARCHITECTURE.md`](../ARCHITECTURE.md)).

## Future platform features

Institute Mobile App, AI Coach, Practitioner Directory, Corporate Portal,
Research Repository, Annual Conference Portal, Learning Paths,
Gamification, Digital Credentials, Partner Portal, API Access.

## MVP (Phase 1 launch)

- Public Website
- Insights Hub
- Life Beyond Trauma
- Membership Page
- Executive Advisory Page
- Capacity Assessment
- Webinar Registration
- Contact & Consultation Booking
- Flowi CRM Integration
- Newsletter
- Basic Member Dashboard

Everything else is planned for future releases.

## Product design principles

Every feature must answer three questions — if the answer to any is "no,"
the feature should not be included:

1. Does this increase trust?
2. Does this improve the user's understanding or capacity?
3. Does this help users move to the next stage of their journey?

Prioritise clarity, simplicity, accessibility, and long-term scalability
over feature quantity. The goal is not to build the biggest platform — it's
to build the most valuable one.

## Feature specification template

For new features added beyond this initial set, use this template (one
section per feature/epic):

- **Summary**
- **User story / stories**
- **Functional requirements**
- **Edge cases**
- **Out of scope**
- **Dependencies**
