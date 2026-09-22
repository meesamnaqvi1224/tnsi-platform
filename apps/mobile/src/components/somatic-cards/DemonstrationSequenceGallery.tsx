import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { SomaticImageBlock } from './SomaticImageBlock';
import { sortByOrder } from '@/lib/somatic-card-order';
import { colors, spacing } from '@/theme';
import type { SomaticDemonstrationFrame } from '@/api/types';

interface DemonstrationSequenceGalleryProps {
  frames: SomaticDemonstrationFrame[];
  cardTitle: string;
}

/**
 * Ordered movement/demonstration frames - kept distinct from
 * supportingImages (a genuinely different asset type), never flattened
 * into one unordered gallery. Preserves order, label, instruction, and
 * alt text exactly as returned.
 */
export function DemonstrationSequenceGallery({
  frames,
  cardTitle,
}: DemonstrationSequenceGalleryProps) {
  if (frames.length === 0) return null;
  const ordered = sortByOrder(frames);

  return (
    <View>
      {ordered.map((frame, i) => (
        <View key={`${frame.order}-${i}`} style={styles.frame}>
          <SomaticImageBlock
            image={{ url: frame.imageUrl, alt: frame.imageAlt }}
            fallbackLabel={frame.label ?? cardTitle}
            aspectRatio={9 / 16}
            style={styles.image}
          />
          {frame.label || frame.instruction ? (
            <View>
              {frame.label ? (
                <ThemedText variant="body" color={colors.navy} style={styles.label}>
                  {frame.label}
                </ThemedText>
              ) : null}
              {frame.instruction ? (
                <ThemedText variant="caption" color={colors.charcoal}>
                  {frame.instruction}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginBottom: spacing.lg,
  },
  image: {
    marginBottom: spacing.sm,
    maxWidth: 220,
  },
  label: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});
