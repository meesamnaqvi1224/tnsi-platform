/**
 * Review switch for the Human Expansion Theory™ 3D experience on `/method`.
 *
 * Off (the default, and always in production until launch): `/method` is the
 * existing page, unchanged. On (set `ENABLE_HUMAN_EXPANSION_3D=true` in
 * `apps/web/.env.local` to review locally): `/method` renders the new
 * experience. The 3D figure's licence for commercial use is not yet confirmed,
 * so this must stay off in any public environment until it is — see
 * docs/human-expansion-3d-asset.md. `/method` is statically generated, so the
 * value is read when the site is built.
 */
export function isHumanExpansion3dEnabled(): boolean {
  return process.env.ENABLE_HUMAN_EXPANSION_3D === 'true';
}
