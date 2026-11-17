import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { MEMBERSHIP_PLANS, MEMBERSHIP_TRIAL_DAYS } from '@tnsi/integrations';
import { FadeIn } from '@/components/utility/fade-in';
import { signUpToMembershipHref } from '@/lib/membership-links';

const headingClass =
  'font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl';

/**
 * The membership section of the public Regulation Suite™ page, shown only
 * while membership is open. It keeps two things apart on purpose, so a visitor
 * cannot mistake one for the other:
 *
 *  - the FREE TRIAL: app-managed, no card, no Stripe subscription, nothing
 *    charged, and the account simply returns to Free;
 *  - the PAID PLANS: a separate, deliberate checkout.
 *
 * Nothing here starts a trial or a payment: every link leads to account
 * creation and then the membership page, where the server decides what is
 * offered. No saving is quoted here until that wording is approved.
 */
export function RegulationSuiteMembership() {
  const { monthly, annual } = MEMBERSHIP_PLANS;

  return (
    <Section
      className="border-foreground/15 border-t py-(--space-3xl) sm:py-(--space-4xl)"
      aria-label="Membership"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
          <FadeIn>
            <Stack gap="lg" className="max-w-[60ch]">
              <h2 id="rs-trial-heading" className={headingClass}>
                {`Try the Regulation Suite free for ${MEMBERSHIP_TRIAL_DAYS} days`}
              </h2>
              <Text size="lg" tone="muted" className="leading-relaxed">
                {`Eligible accounts can try the Regulation Suite free for ${MEMBERSHIP_TRIAL_DAYS} days without entering payment card details. No paid subscription is created during the trial, and nothing is charged. When the trial ends, your account returns to Free unless you choose a paid plan.`}
              </Text>
              <Text size="lg" tone="muted" className="leading-relaxed">
                One free trial is available per verified email address.
              </Text>
              <Text size="lg" tone="muted" className="leading-relaxed">
                If you decide to become a member, you can choose a monthly or annual plan and
                complete checkout separately. A paid subscription starts only when you complete that
                purchase.
              </Text>
            </Stack>
          </FadeIn>

          <FadeIn delayMs={100}>
            <Stack gap="lg" className="max-w-[60ch]">
              <h2 id="rs-plans-heading" className={headingClass}>
                Membership plans
              </h2>
              <Text size="lg" tone="muted" className="leading-relaxed">
                {`Paid membership is ${monthly.price} per ${monthly.interval} or ${annual.price} per ${annual.interval}, and you can cancel at any time. No discovery call is needed.`}
              </Text>
              <ul
                aria-labelledby="rs-plans-heading"
                className="border-foreground/15 divide-foreground/15 m-0 list-none divide-y border-y p-0"
              >
                {(['monthly', 'annual'] as const).map((tier) => {
                  const plan = MEMBERSHIP_PLANS[tier];
                  return (
                    <li
                      key={tier}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-4"
                    >
                      <span className="font-heading text-2xl leading-none font-semibold tracking-tight">
                        {plan.price}
                        <span className="text-muted-foreground font-sans text-sm font-normal">
                          {` per ${plan.interval}`}
                        </span>
                      </span>
                      <span className="flex items-baseline gap-4">
                        <span className="text-muted-foreground text-sm">{plan.label}</span>
                        <NextLink
                          href={signUpToMembershipHref(tier)}
                          className="interaction-text-link-underline text-sm"
                        >
                          {`Choose ${plan.label}`}
                          <span className="sr-only"> (you will create an account first)</span>
                        </NextLink>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-col items-start gap-(--space-sm) pt-(--space-sm)">
                <NextLink
                  href={signUpToMembershipHref()}
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  Get started
                </NextLink>
                <Text size="sm" tone="muted" className="leading-relaxed">
                  You create an account first. You choose a plan, and pay, on your membership page.
                </Text>
              </div>
            </Stack>
          </FadeIn>
        </div>
      </Container>
    </Section>
  );
}
