import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReflectionsInvitation } from './reflections-invitation';

describe('ReflectionsInvitation', () => {
  const html = renderToStaticMarkup(<ReflectionsInvitation />);
  it('uses the proposed invitation wording and opens a new reflection', () => {
    expect(html).toContain('A Moment for Yourself');
    expect(html).toContain('There’s no right or wrong way to reflect.');
    expect(html).toContain('Write a Reflection');
    expect(html).toContain('href="/dashboard/reflections/new"');
  });
  it('shows nothing about what the member has written', () => {
    expect(html).not.toMatch(/\d+ reflection|streak|score/i);
  });
});
