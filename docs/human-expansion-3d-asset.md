# Human Expansion Theory™ 3D figure — provenance and licence status

**Status: PROTOTYPE ONLY. Not cleared for production use.**

## What the asset is

`apps/web/public/models/human-expansion/figure.glb` — a single static,
front-facing, standing female sculptural figure (geometry only: no textures,
no materials, no UVs). 51,954 triangles, ~165 KB (Meshopt-compressed).

> **Current model (second generation, 2026-10-05).** The first figure (a
> blank-faced mannequin, 52,060 triangles) was replaced at the owner's request
> with a figure closer to the mockup: a serene closed-eyes face and more
> sculpted proportions. The history below covers both; the first figure's file
> is not shipped.

## Where it came from

1. **Art direction:** the owner-approved Human Expansion Theory™ mockup (the
   translucent sculptural figure with a warm internal network).
2. **Reference image (generated, 2026-10-05):** a clean matte-clay mannequin
   reference produced from that mockup with the Magnific image tool
   (2 variants, 75 credits each; one used).
3. **3D generation (2026-10-05):** image-to-3D with **Meshy 7.1** via the
   Magnific 3D tool (1,160 credits). Trellis 2 (730) and Hi3D Portrait pro
   (1,230) were also generated and compared; Tripo v3.1 rejected the input
   (content policy) and was not charged. Total spend 3,270 credits of an
   approved 5,000 cap.
4. **Second generation (2026-10-05, owner-approved):** a new reference image
   (sculpted clay statue, closed eyes; 2 variants, 75 credits each, the first
   used) from the same mockup, then **Meshy 7.1** image-to-3D (1,160 credits).
   Cost of this round: 1,310 credits. Cumulative generation spend 4,580 credits.
5. **Local clean-up (no credits):** stray fragments removed; nipple and navel
   detail softened by blending toward a smoothed copy; light volume-preserving
   smoothing; height normalised; textures/UVs dropped; Meshopt-compressed with
   `@gltf-transform/cli`.

## Licence status (as of 6 October 2026)

**Licensing verification: PASS, subject to reference-input confirmation.**
The reference-input confirmation (below) is **open**; it is the only licensing
item left before the production release.

### What the published terms say

**Meshy.** Meshy's current Terms of Service, updated September 19, 2026, state
that paid-plan customers own their Customer Output, to the extent possible under
applicable law. Meshy's current documentation also confirms commercial use of
paid-plan generated assets, subject to rights in the input materials. This is
not an unconditional statement that Meshy guarantees copyright ownership in every
jurisdiction. Meshy's terms also require the customer to have the necessary
rights, licences and permissions for the input material they submit.

**Magnific.** Magnific's current documentation confirms that paid plans include a
commercial license for AI-generated content. Magnific also notes that copyright
ownership of AI-generated content remains subject to applicable law and does not
guarantee copyright ownership in every jurisdiction.

**Magnific confirmation.** No separate written confirmation from Magnific is
being awaited. The published paid-plan commercial-use documentation is the basis
for the commercial-use determination. Magnific has not given us a bespoke
licence or individual approval, and none is implied.

The figure was generated with Meshy 7.1 (image-to-3D) on a paid plan, run through
Magnific, the generation platform the account uses to reach Meshy. No
attribution is known to be required; if that changes, record it here and in the
site credits.

### Generation chain (unchanged)

1. Owner-approved Human Expansion Theory™ mockup, uploaded to Magnific as the
   reference (creation `xSGgTGijfW`);
2. a reference image generated through Magnific from that mockup (sculpted clay
   statue, closed eyes; creation `huU5CR8vqL`);
3. Meshy 7.1 generated the final figure from that reference (creation
   `1l2Js8mr4r`), which was then cleaned up locally.

The earlier blank-faced figure (built from a different reference) is no longer
shipped.

### Open item: reference-input confirmation (not yet recorded as passed)

Because Meshy's output terms are subject to rights in the input, the following
remains to be confirmed internally, and each box is to be ticked, dated and
initialled only when evidence exists:

- [ ] Confirm who created the original mockup.
- [ ] Confirm we hold the necessary rights and permission to use the mockup as an
      AI reference input.
- [ ] Confirm the mockup and the generated reference image do not reproduce
      third-party protected work without authorisation.
- [ ] Confirm the imagery does not contain an unauthorised real person's
      likeness.

No project evidence establishing any of these is recorded in this repository, so
none is marked as passed.

### Terms archive

Online terms can change. Dated copies (screenshots or PDFs) of the Meshy and
Magnific terms and documentation reviewed on 6 October 2026 should be retained
with the project records. No archived copy is currently recorded in this
repository; none has been created or implied by this note. Re-read the terms if
the figure is regenerated or the plan changes.

### State when this note was written (6 October 2026)

No model was regenerated and no generation credits were spent for this
verification. The mobile work is untouched. The production-release commit
`5703cc0` had not been pushed or deployed.

## Content map and integration plan (prototype → `/method`)

All copy comes from `apps/web/src/content/human-expansion-theory.ts` (and
the existing `MethodStatement`, `MethodPullQuote`, `MethodFinalCta`,
`PolyvagalHierarchyFigure` components). Nothing is rewritten, shortened or
renamed; `editorial-content.test.tsx` asserts every word renders unaltered.

| #   | Existing content                                                                                                               | In the experience                                                                                           | Scroll window (wide / phone)             | 3D state                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------- |
| 0   | "Healing doesn't begin when you think differently… It begins when your nervous system experiences safety." (`MethodStatement`) | Opening section, light ground, before the scene                                                             | page flow                                | —                         |
| –   | (transition)                                                                                                                   | 28svh gradient, light → dark                                                                                | page flow                                | —                         |
| 1   | `hero`: eyebrow, headline, tagline, "Explore the Theory" CTA                                                                   | Intro, left                                                                                                 | 0–0.10                                   | figure at rest, axis only |
| 2   | `whyNewFramework`                                                                                                              | Left, connector to the chest                                                                                | 0.10–0.20                                | network begins to appear  |
| 3   | `centralProposition`                                                                                                           | Right, connector to the torso                                                                               | 0.20–0.30 / phone 0.20–0.29              | —                         |
| 4   | `developmentalConditions` heading + intro                                                                                      | Left                                                                                                        | 0.30–0.55 / phone 0.29–0.335             | —                         |
| 5   | Safety → Capacity → Availability → Expansion → Participation                                                                   | Right list; each condition opens with its description and a connector to its own orb; earlier orbs stay lit | 0.30–0.55 (0.05 each) / phone 0.335–0.55 | orbs 1→5, bottom to top   |
| 6   | `protectionParticipation` (heading, intro, Protection, Participation, closing)                                                 | Left/right terms with connectors to the Safety and Participation orbs                                       | 0.55–0.68 / phone 0.55–0.685             | —                         |
| 7   | `theoryToPractice` text + five pathways                                                                                        | Left text; right list, connector to the hand (phone: list in two parts)                                     | 0.68–0.82                                | outward reaches           |
| 8   | `evolving`                                                                                                                     | Left, connector to the crown orb                                                                            | 0.82–0.955                               | all lit, network complete |
| 9   | (exit)                                                                                                                         | All text fades, scene releases                                                                              | 0.955–1.0                                | —                         |
| 10  | `polyvagalFigure` (Figure 1)                                                                                                   | Normal page flow, light ground                                                                              | after the scene                          | —                         |
| 11  | `quote` (`MethodPullQuote`)                                                                                                    | Normal page flow                                                                                            | —                                        | —                         |
| 12  | `finalCta` — Explore the Institute (`MethodFinalCta`)                                                                          | Normal page flow                                                                                            | —                                        | —                         |
| 13  | Footer (`SiteFooter`)                                                                                                          | Normal page flow                                                                                            | —                                        | —                         |

Not rendered by the scene, as on the live page: `hero.paragraphs`.

### Production release (2026-10-06)

The Human Expansion experience **is** `/method`
(`components/human-expansion-experience/HumanExpansionPage.tsx`: opening
statement, theory, polyvagal figure, quote, closing call to action, footer).
The review mechanism used while it was approved is removed: there is no
`ENABLE_HUMAN_EXPANSION_3D` or `ENABLE_LAB_ROUTES`, no `/lab/human-expansion`
route, and the old chapter-by-chapter implementation (`ChapterProgress`,
`MethodHero`, `MethodFoundation`, `MethodJourney`, `MethodProtectionParticipation`,
`MethodPractice`, `MethodImageSection`, `DevelopmentalConditions`) is deleted.
`/models(.*)` is permanently public in the middleware, because the page loads
the 3D figure (`figure.glb`) and the still render (`figure-still.avif`) from it.
Metadata, canonical, Open Graph, Twitter and JSON-LD are unchanged.

The site URL used for canonical links comes from `NEXT_PUBLIC_SITE_URL`
(set for Production, so Production canonicals are unchanged). On a Vercel
Preview, where it is not set, `resolveSiteUrl` in `apps/web/src/env.ts` falls
back to the deployment's own URL instead of `localhost`.

**One markup, two compositions.** `HumanExpansionTheory` (server component)
renders all the content once, in the initial HTML, plus the connector paths,
the still figure and the chapter indicator. `data-he` on its root selects the
composition:

- `linear` (default; no script needed): the still figure, sticky beside the
  text in editorial columns (stacked on a phone). No animation of any kind. Used
  with no JavaScript, no WebGL, `prefers-reduced-motion`, or if the scene fails.
- `scene`: set before first paint when WebGL is available and motion is not
  reduced; `ExperienceEnhancer` (client) mounts the live figure into the page's
  canvas slot and drives the existing elements by scroll. Three.js is fetched
  only in this case.

**Chapter indicator:** `01 Safety … 05 Participation`, names read from the
content source; small, in the margin under the figure, decorative
(`aria-hidden`). Scroll-driven in the scene; follows the text by plain state
change in the static composition.

**Edge fade (2026-10-06):** the bands either side of the scene carry a continuation of the scene's own edge glow (colour and spread measured from the rendered scene, added as light), so the scene dissolves into the page rather than stopping. Seam step (mean, 0-255) at the exit went from 18.6 to 2.1 and at the entry from 3.2 to 1.7, at 1440/1280/1024/430/390 px. See `.he-band-in` / `.he-band-out` in `human-expansion.css`.

### Before this goes live

1. **Reference-input confirmation** (see "Licence status" above): the only licensing item left. The commercial-use determination rests on the published paid-plan terms; the mockup and reference image still need the rights confirmation recorded.
2. Remove the Preview-only `ENABLE_HUMAN_EXPANSION_3D` variable from Vercel
   (it no longer does anything) and turn Preview authentication back to the
   team's preferred setting if it was enabled only for the review.
3. Orphaned after the clean-up, safe to remove separately:
   `components/utility/draw-line` and `components/utility/scroll-linked`.
4. Very old browsers without AVIF show the figure's alt text instead of the
   still in the static composition; all text is unaffected.
