import type { LevelId } from './geometry';

/**
 * `practices.interactive_key` of The Return Path (see migration 0010). One
 * definition, shared by the web practice page, the mobile API route and the
 * native app, so none of them can disagree about which practice it is.
 */
export const RETURN_PATH_KEY = 'the-return-path';

/** Levels a signed-in member may start. */
export const MEMBER_RETURN_PATH_LEVELS: LevelId[] = [1, 2, 3];
