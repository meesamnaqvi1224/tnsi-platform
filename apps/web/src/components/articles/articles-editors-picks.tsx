import { ChapterMarker, Container, Section } from '@tnsi/ui';
import { EditorsPick } from '@/components/articles/editors-pick';
import { articlesContent } from '@/content/articles';

const { editorsPicks } = articlesContent;

export function ArticlesEditorsPicks() {
  return (
    <Section spacing="none" className="border-border border-t" aria-label={editorsPicks.heading}>
      <Container size="xl" className="px-(--space-xl) py-(--space-4xl) sm:px-(--space-2xl)">
        <ChapterMarker index={editorsPicks.chapter} as="h2" title={editorsPicks.heading} />
      </Container>

      <div>
        {editorsPicks.items.map((pick) => (
          <EditorsPick key={pick.id} pick={pick} />
        ))}
      </div>
    </Section>
  );
}
