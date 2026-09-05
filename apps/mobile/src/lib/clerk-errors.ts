/** Clerk's error shape is `{ errors: [{ message, longMessage? }] }`. */
export function extractClerkErrorMessage(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'errors' in err &&
    Array.isArray((err as { errors: unknown }).errors)
  ) {
    const first = (err as { errors: { longMessage?: string; message?: string }[] }).errors[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  return 'Something went wrong. Please try again.';
}
