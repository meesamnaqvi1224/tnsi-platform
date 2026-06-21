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
