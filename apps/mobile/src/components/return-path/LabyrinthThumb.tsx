import Svg, { Circle, Path } from 'react-native-svg';
import { VIEWBOX, geometryFor, type LevelId } from '@tnsi/core';
import { rp } from './palette';

/** A small, non-interactive picture of a labyrinth (the level list). */
export function LabyrinthThumb({ level, size }: { level: LevelId; size: number }) {
  const g = geometryFor(level);
  const centre = VIEWBOX / 2;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={g.d}
        fill="none"
        stroke={rp.channel}
        strokeWidth={g.w * 0.62}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={centre}
        cy={centre}
        r={Math.max(10, g.centreR * 0.55)}
        fill={rp.centreFill}
        stroke={rp.trace}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
