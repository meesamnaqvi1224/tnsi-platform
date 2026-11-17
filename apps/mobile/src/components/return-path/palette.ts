import { colors } from '@/theme';

/**
 * The Return Path's colours, matching the web practice: a forest green for the
 * inward trace, head and breathing orb, and bronze for the return trace. The
 * labyrinth is the only bold element - no shadows or celebration.
 */
export const rp = {
  trace: colors.success,
  returnTrace: colors.bronze,
  channel: '#E4DCC8',
  centreFill: 'rgba(62, 92, 58, 0.14)',
  glow: 'rgba(62, 92, 58, 0.33)',
  overlay: 'rgba(247, 243, 234, 0.94)',
  orb: '#5E7B58',
  marker: colors.cream,
} as const;
