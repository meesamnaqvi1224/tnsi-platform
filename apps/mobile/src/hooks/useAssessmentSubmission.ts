import { useCallback, useState } from 'react';
import { env } from '@/lib/env';
import type { AssessmentSubmitResponse } from '@/api/types';

export type AssessmentSubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; result: AssessmentSubmitResponse['result'] }
  | { status: 'error'; message: string };

interface SubmitPayload {
  assessmentSlug: string;
  email: string;
  answers: Record<string, string>;
}

/**
 * Calls the existing POST /api/assessments/submit directly rather than
 * through `useApiClient()`/`createApiClient()` - that shared client
 * unwraps the `{data}`/`{error}` envelope every `/api/v1/*` route uses,
 * but this endpoint predates that convention and returns its own shape
 * (`{submitted, result}` on success; `{error, fields}` on failure - see
 * apps/web/src/app/api/assessments/submit/route.ts). Forcing it through
 * the shared client would misread a real 201 success as a failure (no
 * `data` key) and lose the server's actual error message (`error` is a
 * plain string there, not the `{code,message}` object the shared client
 * expects) - so it's read here exactly as the endpoint really responds,
 * not as a mismatched assumption of the newer convention.
 *
 * No bearer token attached: this endpoint is public/unauthenticated on
 * the web (see apps/web/src/middleware.ts's `isPublicRoute` list) and
 * takes `email` as its own identifier, independent of any Clerk session.
 */
export function useAssessmentSubmission() {
  const [state, setState] = useState<AssessmentSubmissionState>({ status: 'idle' });

  const submit = useCallback(async (payload: SubmitPayload) => {
    setState({ status: 'submitting' });

    let response: Response;
    try {
      response = await fetch(`${env.apiBaseUrl}/api/assessments/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      setState({
        status: 'error',
        message: 'Unable to reach TNSI. Please check your connection and try again.',
      });
      return;
    }

    let body: (AssessmentSubmitResponse & { error?: string }) | null = null;
    try {
      body = await response.json();
    } catch {
      // fall through to the generic error below
    }

    if (!response.ok || !body?.submitted) {
      // The server's own `error` string is already calm, user-safe copy
      // (e.g. "Your answers could not be processed.") - not a raw stack
      // trace - so it's shown directly rather than re-humanized.
      setState({
        status: 'error',
        message: body?.error ?? 'Something went wrong. Please try again.',
      });
      return;
    }

    setState({ status: 'success', result: body.result ?? null });
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, submit, reset };
}
