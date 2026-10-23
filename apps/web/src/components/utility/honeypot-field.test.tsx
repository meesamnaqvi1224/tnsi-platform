import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HoneypotField } from './honeypot-field';

describe('HoneypotField', () => {
  const html = renderToStaticMarkup(<HoneypotField />);

  it('is hidden from assistive technology and skipped by the keyboard', () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toMatch(/autocomplete="off"/i);
  });

  it('uses the field name the server checks, and starts empty', () => {
    expect(html).toContain('name="website"');
    expect(html).toContain('value=""');
  });
});
