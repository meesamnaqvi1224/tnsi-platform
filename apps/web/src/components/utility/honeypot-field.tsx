import { HONEYPOT_FIELD } from '@/lib/form-guard-constants';

/**
 * A spam trap: a text input real visitors never see (moved off-screen, skipped by
 * the keyboard, hidden from assistive technology) but form-filling bots complete.
 * The server treats any value as a bot submission. Must be rendered inside the
 * <form> so it is included in the submission.
 */
export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
    >
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
