import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { artworkAspectRatio, artworkMaxHeight, fitArtwork } from '@/lib/artwork-fit';
import { colors, radius } from '@/theme';
import type { PowerDropImage } from '@/api/types';

interface PowerDropArtworkProps {
  title: string;
  cardImage: PowerDropImage | null;
  /** 'library' is a little narrower than 'detail'; both show the whole visual. */
  variant?: 'library' | 'detail';
  style?: StyleProp<ViewStyle>;
}

const MAX_WIDTH = { library: 340, detail: 520 } as const;
/** Shown only when there is no artwork (or it cannot load); never over real artwork. */
const FALLBACK_RATIO = 16 / 9;
/** Space held while the real image size is being read, so the page does not jump far. */
const LOADING_HEIGHT = 240;

/**
 * A PowerDrop™'s standalone visual. The artwork is a finished image in its
 * own right: it is drawn whole, at its own aspect ratio (read from the image,
 * never assumed), with `contain` — never cropped, never stretched — and with
 * no background, so transparent artwork sits directly on the page. No text is
 * ever placed over it; the instructions stay native text beside it.
 *
 * When there is no artwork (or it fails to load) a plain branded surface
 * names the PowerDrop — never a broken-image icon, never invented art.
 */
export function PowerDropArtwork({
  title,
  cardImage,
  variant = 'detail',
  style,
}: PowerDropArtworkProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [columnWidth, setColumnWidth] = useState(0);
  // What is known about the current URL, keyed by it: a changed URL simply
  // reads as "not measured yet" without resetting state inside an effect.
  const [measure, setMeasure] = useState<{
    url: string;
    ratio: number | null;
    failed: boolean;
  } | null>(null);
  const url = cardImage?.url ?? null;
  const current = url && measure?.url === url ? measure : null;
  const ratio = current?.ratio ?? null;
  const failed = current?.failed ?? false;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    Image.getSize(
      url,
      (width, height) => {
        if (cancelled) return;
        const next = artworkAspectRatio(width, height);
        setMeasure({ url, ratio: next, failed: next === null });
      },
      () => {
        if (!cancelled) setMeasure({ url, ratio: null, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  const maxWidth = MAX_WIDTH[variant];
  const maxHeight = artworkMaxHeight(windowHeight);
  const onLayout = (event: LayoutChangeEvent) => setColumnWidth(event.nativeEvent.layout.width);

  let content;
  if (!url || failed) {
    const { width, height } = fitArtwork(
      FALLBACK_RATIO,
      columnWidth || maxWidth,
      maxWidth,
      maxHeight,
    );
    content = (
      <View
        style={[styles.fallback, { width, height }]}
        accessible
        accessibilityLabel={`${title} card`}
      >
        <ThemedText
          variant="label"
          color={colors.bronzeMuted}
          style={styles.fallbackLabel}
          numberOfLines={2}
        >
          {title}
        </ThemedText>
      </View>
    );
  } else if (ratio === null || columnWidth === 0) {
    content = <View style={{ height: LOADING_HEIGHT }} accessibilityState={{ busy: true }} />;
  } else {
    const { width, height } = fitArtwork(ratio, columnWidth, maxWidth, maxHeight);
    content = (
      <Image
        source={{ uri: url }}
        style={{ width, height }}
        resizeMode="contain"
        onError={() => setMeasure({ url, ratio: null, failed: true })}
        accessible
        accessibilityLabel={cardImage?.alt || `${title} visual`}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[styles.column, variant === 'library' && styles.columnStart, style]}
      onLayout={onLayout}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignItems: 'center',
  },
  // In the library the visual shares a left edge with its title; the detail
  // view centres it above the reading column, like the Core Series.
  columnStart: {
    alignItems: 'flex-start',
  },
  fallback: {
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fallbackLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
