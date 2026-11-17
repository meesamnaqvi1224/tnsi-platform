/**
 * JSON body for POST /api/the-return-path/subscribe. Deliberately carries no
 * campaign (UTM) attribution: the route never reads it, and sending it would
 * transmit data the visitor may not have consented to. Campaign attribution
 * is attached only to consent-gated analytics events.
 */
export function buildSubscribeBody(email: string, level: number): string {
  return JSON.stringify({ email, consent: true, level });
}
