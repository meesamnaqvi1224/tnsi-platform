import { CalendlyPlaceholder } from '@/components/discovery-call/calendly-placeholder';

/**
 * Future Calendly integration point.
 *
 * Replace the placeholder render with the live Calendly inline widget
 * without changing the surrounding booking section layout.
 */
export function CalendlyEmbed() {
  return <CalendlyPlaceholder />;
}
