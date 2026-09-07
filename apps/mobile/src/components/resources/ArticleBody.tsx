import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { ArticleThumbnail } from './ArticleThumbnail';
import { colors, spacing } from '@/theme';
import type { ArticleBodyBlock } from '@/api/types';

interface ArticleBodyProps {
  blocks: ArticleBodyBlock[];
}

/**
 * Native renderer for the API's stable block DSL (mirrors
 * apps/web/src/lib/article-api.ts's `ApiArticleBodyBlock` exactly - see
 * api/types.ts). Every block type the API can currently return is
 * handled; nothing beyond that is assumed. Plain React Native views/text
 * only - no HTML, no WebView, no Portable Text renderer.
 */
export function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <View>
      {blocks.map((block, index) => (
        <Fragment key={index}>
          <ArticleBodyBlockView block={block} />
        </Fragment>
      ))}
    </View>
  );
}

function ArticleBodyBlockView({ block }: { block: ArticleBodyBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <ThemedText variant="heading" style={block.level === 3 ? styles.h3 : styles.h2}>
          {block.text}
        </ThemedText>
      );

    case 'paragraph':
      return (
        <ThemedText variant="body" color={colors.charcoal} style={styles.paragraph}>
          {block.text}
        </ThemedText>
      );

    case 'pullQuote':
      return (
        <View style={styles.pullQuote}>
          <ThemedText variant="display" color={colors.navy} style={styles.pullQuoteText}>
            {block.quote}
          </ThemedText>
        </View>
      );

    case 'unorderedList':
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <ThemedText variant="body" color={colors.bronze} style={styles.bullet}>
                {'—'}
              </ThemedText>
              <ThemedText variant="body" color={colors.charcoal} style={styles.listItemText}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      );

    case 'orderedList':
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <ThemedText variant="body" color={colors.bronze} style={styles.bullet}>
                {i + 1}.
              </ThemedText>
              <ThemedText variant="body" color={colors.charcoal} style={styles.listItemText}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      );

    case 'figure':
      return (
        <View style={styles.figure}>
          <ArticleThumbnail
            coverImage={block.imageSrc ? { url: block.imageSrc, alt: block.imageAlt } : null}
            fallbackLabel="Figure"
            height={220}
          />
          {block.caption ? (
            <ThemedText variant="caption" color={colors.charcoal} style={styles.caption}>
              {block.caption}
            </ThemedText>
          ) : null}
        </View>
      );

    case 'callout':
      return (
        <Card style={styles.callout}>
          {block.title ? (
            <ThemedText variant="label" color={colors.bronze} style={styles.calloutTitle}>
              {block.title}
            </ThemedText>
          ) : null}
          <ThemedText variant="body" color={colors.charcoal}>
            {block.text}
          </ThemedText>
        </Card>
      );

    default:
      // Exhaustiveness guard - if the API ever adds a block type this
      // component doesn't know about, it's silently skipped rather than
      // crashing the reader. block is `never` here as long as every real
      // variant above is handled.
      return null;
  }
}

const styles = StyleSheet.create({
  h2: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  h3: {
    fontSize: 19,
    lineHeight: 26,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginBottom: spacing.lg,
  },
  pullQuote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.bronze,
    paddingLeft: spacing.lg,
    marginVertical: spacing.xl,
  },
  pullQuoteText: {
    fontSize: 24,
    lineHeight: 32,
  },
  list: {
    marginBottom: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 28,
  },
  listItemText: {
    flex: 1,
  },
  figure: {
    marginBottom: spacing.lg,
  },
  caption: {
    marginTop: spacing.sm,
  },
  callout: {
    backgroundColor: colors.creamMuted,
    marginBottom: spacing.lg,
  },
  calloutTitle: {
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
});
