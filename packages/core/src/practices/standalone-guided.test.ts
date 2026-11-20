import { describe, expect, it } from 'vitest';
import { standaloneGuidedKey } from './standalone-guided';

describe('standaloneGuidedKey', () => {
  it('names the standalone experience of an interactive practice that carries one of the two keys', () => {
    expect(
      standaloneGuidedKey({ contentType: 'interactive', interactiveKey: 'the-empty-chair' }),
    ).toBe('the-empty-chair');
    expect(
      standaloneGuidedKey({ contentType: 'interactive', interactiveKey: '90-second-reset' }),
    ).toBe('90-second-reset');
  });

  it('is null for an ordinary practice, another interactive practice, or an unknown key', () => {
    expect(standaloneGuidedKey({ contentType: 'meditation', interactiveKey: null })).toBeNull();
    expect(
      standaloneGuidedKey({ contentType: 'meditation', interactiveKey: 'the-empty-chair' }),
    ).toBeNull();
    expect(
      standaloneGuidedKey({ contentType: 'interactive', interactiveKey: 'the-return-path' }),
    ).toBeNull();
    expect(standaloneGuidedKey({ contentType: 'interactive' })).toBeNull();
  });
});
