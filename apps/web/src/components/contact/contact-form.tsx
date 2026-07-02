import {
  Button,
  ChapterMarker,
  Container,
  Form,
  FormField,
  Input,
  Section,
  Stack,
  Text,
  Textarea,
} from '@tnsi/ui';
import { contactContent } from '@/content/contact';
import { submitContactForm } from '@/lib/contact-actions';

const { form } = contactContent;

export function ContactForm() {
  return (
    <Section id={form.id} spacing="xl" className="border-border bg-secondary/15 border-t">
      <Container size="xl">
        <div className="grid min-w-0 grid-cols-1 gap-(--space-3xl) lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-(--space-5xl)">
          <ChapterMarker
            index={form.chapter}
            as="h2"
            title={form.heading}
            className="lg:sticky lg:top-(--space-3xl) lg:self-start"
          />

          <Form action={submitContactForm} className="w-full max-w-xl min-w-0">
            <FormField id="contact-name" label={form.fields.name.label} required>
              {(field) => (
                <Input
                  {...field}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder={form.fields.name.placeholder}
                  className="border-border/80 bg-background h-11 rounded-sm"
                />
              )}
            </FormField>

            <FormField id="contact-email" label={form.fields.email.label} required>
              {(field) => (
                <Input
                  {...field}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={form.fields.email.placeholder}
                  className="border-border/80 bg-background h-11 rounded-sm"
                />
              )}
            </FormField>

            <FormField id="contact-organisation" label={form.fields.organisation.label}>
              {(field) => (
                <Input
                  {...field}
                  name="organisation"
                  type="text"
                  autoComplete="organization"
                  placeholder={form.fields.organisation.placeholder}
                  className="border-border/80 bg-background h-11 rounded-sm"
                />
              )}
            </FormField>

            <FormField id="contact-subject" label={form.fields.subject.label} required>
              {(field) => (
                <Input
                  {...field}
                  name="subject"
                  type="text"
                  required
                  placeholder={form.fields.subject.placeholder}
                  className="border-border/80 bg-background h-11 rounded-sm"
                />
              )}
            </FormField>

            <FormField id="contact-message" label={form.fields.message.label} required>
              {(field) => (
                <Textarea
                  {...field}
                  name="message"
                  required
                  rows={6}
                  placeholder={form.fields.message.placeholder}
                  className="border-border/80 bg-background min-h-36 rounded-sm"
                />
              )}
            </FormField>

            <Stack gap="md">
              <Button type="submit" size="lg">
                {form.submitLabel}
              </Button>
              <Text tone="muted" className="text-sm">
                {form.note}
              </Text>
            </Stack>
          </Form>
        </div>
      </Container>
    </Section>
  );
}
