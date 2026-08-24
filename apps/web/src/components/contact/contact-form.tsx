'use client';

import * as React from 'react';
import {
  Alert,
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

const { form } = contactContent;

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface ContactResponseBody {
  submitted?: boolean;
  error?: string;
}

export function ContactForm() {
  const [status, setStatus] = React.useState<Status>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);

    setStatus('submitting');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          organisation: data.get('organisation') || undefined,
          subject: data.get('subject'),
          message: data.get('message'),
        }),
      });

      const json = (await response.json().catch(() => null)) as ContactResponseBody | null;

      if (!response.ok || !json?.submitted) {
        setStatus('error');
        setErrorMessage(json?.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      formElement.reset();
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  }

  const submitting = status === 'submitting';

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

          {status === 'success' ? (
            <div role="status" className="w-full max-w-xl">
              <Text className="text-base leading-[1.85]">Message sent.</Text>
              <Text tone="muted" className="text-base leading-[1.85]">
                Thank you for reaching out — we aim to respond within two business days.
              </Text>
            </div>
          ) : (
            <Form onSubmit={handleSubmit} className="w-full max-w-xl min-w-0">
              {status === 'error' && errorMessage ? (
                <Alert variant="destructive">{errorMessage}</Alert>
              ) : null}

              <FormField id="contact-name" label={form.fields.name.label} required>
                {(field) => (
                  <Input
                    {...field}
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
                    placeholder={form.fields.message.placeholder}
                    className="border-border/80 bg-background min-h-36 rounded-sm"
                  />
                )}
              </FormField>

              <Stack gap="md">
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? 'Sending…' : form.submitLabel}
                </Button>
                <Text tone="muted" className="text-sm">
                  {form.note}
                </Text>
              </Stack>
            </Form>
          )}
        </div>
      </Container>
    </Section>
  );
}
