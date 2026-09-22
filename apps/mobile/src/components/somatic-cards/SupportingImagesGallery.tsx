import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { SomaticImageBlock } from './SomaticImageBlock';
import { sortByOrder } from '@/lib/somatic-card-order';
import { colors, spacing } from '@/theme';
import type { SomaticSupportingImage } from '@/api/types';

interface SupportingImagesGalleryProps {
  images: SomaticSupportingImage[];
  cardTitle: string;
}

/** Ordered supporting images - never merged with demonstrationSequence into one flat gallery. Captions preserved when provided, never invented. */
export function SupportingImagesGallery({ images, cardTitle }: SupportingImagesGalleryProps) {
  if (images.length === 0) return null;
  const ordered = sortByOrder(images);

  return (
    <View style={styles.row}>
      {ordered.map((img, i) => (
        <View key={`${img.order}-${i}`} style={styles.item}>
          <SomaticImageBlock
            image={{ url: img.imageUrl, alt: img.imageAlt }}
            fallbackLabel={cardTitle}
            aspectRatio={1}
          />
          {img.caption ? (
            <ThemedText variant="caption" color={colors.charcoal} style={styles.caption}>
              {img.caption}
            </ThemedText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  item: {
    width: '31%',
  },
  caption: {
    marginTop: spacing.xs,
  },
});
