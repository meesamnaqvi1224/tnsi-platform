import { ImageResponse } from 'next/og';
import { geometryFor } from '@/components/return-path/geometry';

/**
 * Open Graph image for /the-return-path: the Seven Circuits labyrinth,
 * generated from the same geometry the practice draws (no stored image).
 * File-based metadata, so it overrides the site's default OG image for
 * this route only. Colours are the site's forest/bronze tokens in sRGB.
 */
export const alt = 'The Return Path — a short labyrinth breathing practice';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BACKGROUND = '#F6F3EF'; // --neutral-100 (page background)
const CHANNEL = '#D7D3CF'; // the practice's channel: --stone-grey 26% over --neutral-100
const TRACE = '#295233'; // --accent-forest
const INK = '#171311'; // --neutral-900

export default function OpengraphImage() {
  const g = geometryFor(2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <path d="${g.d}" fill="none" stroke="${CHANNEL}" stroke-width="${g.w * 0.62}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${g.d}" fill="none" stroke="${TRACE}" stroke-width="${g.w * 0.3}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${g.L * 0.38} ${g.L * 2}"/>
    <circle cx="200" cy="200" r="${Math.max(10, g.centreR * 0.55)}" fill="${TRACE}" fill-opacity="0.14" stroke="${TRACE}" stroke-width="1.5"/>
  </svg>`;
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 96px',
        background: BACKGROUND,
        color: INK,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
        <div style={{ fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7 }}>
          The Nervous System Institute
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.05 }}>The Return Path</div>
        <div style={{ fontSize: 34, lineHeight: 1.3, opacity: 0.8 }}>
          A short labyrinth breathing practice
        </div>
      </div>
      <img src={src} width={460} height={460} alt="" />
    </div>,
    size,
  );
}
