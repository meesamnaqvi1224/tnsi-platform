import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { TopicChip } from '@/components/articles/topic-chip';
import { articlesContent } from '@/content/articles';

const { topics } = articlesContent;

export function ArticlesTopics() {
  return (
    <Section
      id="topics"
      spacing="xl"
      className="border-border bg-secondary/20 border-t"
      aria-label={topics.heading}
    >
      <Container size="xl">
        <div className="flex flex-col gap-(--space-3xl)">
          <ChapterMarker index={topics.chapter} as="h2" title={topics.heading} />

          <div className="flex flex-wrap gap-(--space-md)">
            {topics.items.map((topic) => (
              <TopicChip key={topic.id} label={topic.label} href={topic.href} />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
