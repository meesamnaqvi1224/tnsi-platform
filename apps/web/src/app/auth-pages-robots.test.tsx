import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs', () => ({ SignIn: () => null, SignUp: () => null }));

import { metadata as signInMetadata } from './sign-in/page';
import { metadata as signUpMetadata } from './sign-up/page';

describe('authentication pages robots metadata', () => {
  it.each([
    ['/sign-in', signInMetadata],
    ['/sign-up', signUpMetadata],
  ])('%s is noindex, follow', (_path, metadata) => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
