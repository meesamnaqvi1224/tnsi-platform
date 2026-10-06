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

## Licence — OPEN ITEM (must close before production launch)

Magnific states that paid plans include a commercial licence for AI-generated
content (see its usage-rights and AI-content-and-copyright pages), but also
that copyright in AI-generated output is legally unsettled and not guaranteed
in every jurisdiction, and that the user is responsible for third-party
rights. Meshy 7.1 is a third-party engine running inside Magnific.

**Before any production launch we need written confirmation that the
Magnific / underlying-engine licence covers commercial website use of this
specific output.** Until that is on file, keep the prototype route hidden and
un-indexed, and do not merge it into the live `/method` page.

No attribution is known to be required; if the confirmation says otherwise,
record it here and in the site credits.

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

### Review build (2026-10-06): `/method` prepared, not public

`/method` now has two versions behind one switch, `ENABLE_HUMAN_EXPANSION_3D`
(`apps/web/src/lib/human-expansion-3d.ts`; read at build time because the page
is static):

- **Off (default; always in production until launch):** the existing page,
  unchanged. Metadata, canonical, Open Graph and JSON-LD are identical in both
  versions (checked).
- **On (local `.env.local` only):** the new composition
  (`components/human-expansion-experience/HumanExpansionPage.tsx`): opening
  statement, theory, polyvagal figure, quote, closing call to action, footer.

`ENABLE_LAB_ROUTES` still opens the temporary `/lab/human-expansion`
comparison route. `/models(.*)` (the model and the still render of it) is open
only when either flag is on; neither is set in Vercel production or preview.
The still is AVIF on purpose: the middleware matcher skips `.webp`/`.png`/
`.jpg`, which would have left it downloadable while the model is gated (a test
guards this).

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

### Still to settle before this goes public

1. **Licence confirmation** for the Magnific/Meshy output (launch blocker; the
   model and still must stay behind the gate until then).
2. When launching: make `/models(.*)` permanently public (or move the files),
   drop the two review flags and the `/lab` route, and set the switch's default.
3. The old `components/method/*` chapter components become unused once the
   switch is removed (separate clean-up), including `ChapterProgress`.
4. Very old browsers without AVIF show the figure's alt text instead of the
   still in the static composition; all text is unaffected.
