import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The form posts a check-in from the browser, but the dashboard that shows today's practice and
 * suggestions is rendered on the server and only shows them once a check-in exists. Saving must
 * therefore re-render the page, or the member sees nothing new until they reload. The tests run in
 * plain Node, which cannot click through a form, so these check the source for that behaviour.
 */
const source = readFileSync(new URL('./check-in-form.tsx', import.meta.url), 'utf8');

describe('CheckInForm refreshes the dashboard after saving', () => {
  it('uses the Next.js router', () => {
    expect(source).toContain("from 'next/navigation'");
    expect(source).toMatch(/const router = useRouter\(\)/);
  });

  it('refreshes after a successful save', () => {
    expect(source).toMatch(/setStatus\('success'\);[\s\S]{0,300}router\.refresh\(\)/);
  });

  it('also refreshes when the check-in already existed, so a stale page catches up', () => {
    expect(source).toMatch(/setStatus\('already'\);[\s\S]{0,200}router\.refresh\(\)/);
  });

  it('does not refresh on an error, so the member keeps what they typed', () => {
    const errorBranches = source.split("setStatus('error');").slice(1);
    for (const branch of errorBranches) {
      expect(branch.slice(0, 150)).not.toContain('router.refresh()');
    }
  });
});
