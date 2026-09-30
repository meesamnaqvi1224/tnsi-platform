import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { EditorialImage } from '@/components/utility/editorial-image';
import { getPathway } from '@/content/programs';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const pathway = getPathway('nervous-system-academy');
const PAGE_TITLE = pathway.title;
const PAGE_DESCRIPTION = pathway.tagline;

/**
 * The Academy's three defined routes, per Caroline Reed's
 * "TNSI - Program Summaries.docx" (2026-09). Each has its own purpose, entry
 * requirements, and professional expectations — kept clearly distinct here
 * rather than blended into one generic "certification" description, since
 * that distinction (who needs a clinical licence, who doesn't, and what each
 * route does and doesn't confer) is the whole point of the Academy's
 * structure.
 */
const academyRoutes = [
  {
    id: 'cpd-pathway',
    title: 'The CPD Pathway',
    status: 'Continuing Education',
    paragraphs: [
      'Specialist education for professionals who want to deepen their understanding of nervous-system-informed practice without undertaking certification in a specific TNSI methodology.',
      'Relevant to therapists, counsellors, psychologists, coaches, healthcare professionals, educators, leaders, and other professionals whose work involves stress, trauma, nervous-system regulation, human behaviour, wellbeing, or capacity.',
    ],
    note: 'A CPD certificate confirms completion of continuing professional education. It does not constitute certification or authorisation to independently deliver a proprietary TNSI methodology.',
  },
  {
    id: 'lbt-coaching-certificate',
    title: 'The Life Beyond Trauma Coaching Certificate',
    status: 'Vocational Pathway',
    paragraphs: [
      'A vocational pathway for people who want to support others within the established Life Beyond Trauma Method™. Applicants do not need to be qualified therapists or clinicians — but must first have completed the full 12-week Life Beyond Trauma programme themselves.',
      'Training covers trauma understanding, nervous-system education, protective patterns, self-care, communication, relationships, perfectionism, support, boundaries, and future-focused change, and includes clear expectations around scope, safeguarding, boundaries, escalation, and referral. Assessment is part of the certificate.',
    ],
    note: 'Completion does not qualify someone as a therapist, counsellor, or psychologist. Successful graduates who meet TNSI standards may become eligible to be considered for future TNSI coaching or programme-delivery opportunities — completion does not guarantee employment.',
  },
  {
    id: 'practitioner-certification-pathway',
    title: 'The Practitioner Certification Pathway',
    status: 'Available today',
    paragraphs: [
      'The Academy’s advanced professional route — for practitioners seeking certification to deliver specialist TNSI methodologies that require clinical judgement, professional formulation, assessment, or work with complex presentations.',
      'Entry requires applicants to be appropriately qualified clinicians, holding the relevant licence, registration, regulation, or recognised professional standing for their discipline and jurisdiction. Candidates complete structured theoretical education, formal assessment, practical application, supervised practice, and competency review.',
    ],
    note: 'One of the Pathway’s advanced routes is the Private Executive Advisory Practitioner Certification — based on a 16-module professional curriculum built around the Capacity Recalibration Model™ and the complete Private Executive Advisory client journey.',
  },
] as const;

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/programs/academy',
});

export default function AcademyPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/programs/academy',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Our Pathways', path: '/programs' },
      { name: pathway.title, path: '/programs/academy' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="academy-hero-heading">
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                {pathway.category}
              </p>
              <h1
                id="academy-hero-heading"
                className="font-heading text-foreground text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
              >
                {pathway.title}
              </h1>
              <Text size="lg" tone="muted" className="max-w-prose leading-relaxed">
                {pathway.tagline}
              </Text>
            </Stack>
          </Container>
        </Section>

        {'heroImageSrc' in pathway ? (
          <Section
            spacing="xl"
            className="border-foreground/15 border-t"
            aria-label="Nervous System Academy"
          >
            <Container size="xl">
              <EditorialImage
                src={pathway.heroImageSrc}
                alt={pathway.heroImageAlt}
                aspect="landscape"
                className="rounded-lg"
                sizes="(max-width: 1024px) 100vw, 1152px"
              />
            </Container>
          </Section>
        ) : null}

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="academy-body-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <h2 id="academy-body-heading" className="sr-only">
                About the Nervous System Academy
              </h2>
              {pathway.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="max-w-prose leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="academy-routes-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="academy-routes-heading" size="xl">
                Three routes, three purposes
              </Heading>

              <div className="flex flex-col">
                {academyRoutes.map((route) => (
                  <article
                    key={route.id}
                    className="border-foreground/15 grid grid-cols-1 gap-(--space-lg) border-t py-(--space-2xl) lg:grid-cols-[1fr_2fr] lg:gap-(--space-2xl)"
                  >
                    <Stack gap="xs">
                      <h3 className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                        {route.title}
                      </h3>
                      <p className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                        {route.status}
                      </p>
                    </Stack>

                    <Stack gap="md">
                      {route.paragraphs.map((paragraph) => (
                        <Text key={paragraph} tone="muted" className="max-w-prose leading-relaxed">
                          {paragraph}
                        </Text>
                      ))}
                      <Text size="sm" tone="muted" className="max-w-prose leading-relaxed italic">
                        {route.note}
                      </Text>
                    </Stack>
                  </article>
                ))}
              </div>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="academy-ideal-heading"
        >
          <Container size="xl">
            <Stack gap="2xl">
              <Heading as="h2" id="academy-ideal-heading" size="xl">
                Ideal for
              </Heading>
              <ul className="flex flex-wrap gap-(--space-sm)" aria-label="Ideal for">
                {pathway.idealFor.map((item) => (
                  <li
                    key={item}
                    className="border-foreground/15 text-foreground rounded-full border px-(--space-md) py-(--space-xs) text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="academy-cert-heading"
        >
          <Container size="xl">
            <Stack gap="lg" className="max-w-2xl">
              <Heading as="h2" id="academy-cert-heading" size="xl">
                Advanced certification: Private Executive Advisory
              </Heading>
              <Text tone="muted" className="max-w-prose leading-relaxed">
                Within the Practitioner Certification Pathway, the Private Executive Advisory
                Practitioner Certification is available today for appropriately qualified, licensed
                or regulated clinicians.
              </Text>
              <div>
                <NextLink
                  href="/programs/practitioner-certification"
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  Explore Practitioner Certification
                </NextLink>
              </div>
            </Stack>
          </Container>
        </Section>

        <Section
          spacing="xl"
          className="border-foreground/15 border-t"
          aria-labelledby="academy-cta-heading"
        >
          <Container size="xl">
            <Stack gap="xl" className="max-w-2xl">
              <Stack gap="md">
                <Heading as="h2" id="academy-cta-heading" size="xl">
                  Other Academy enquiries
                </Heading>
                <Text tone="muted" className="max-w-prose leading-relaxed">
                  For the CPD Pathway, the Life Beyond Trauma Coaching Certificate, supervision, or
                  other Academy enquiries, book a Discovery Call to speak with the Institute.
                </Text>
              </Stack>

              <div>
                <NextLink
                  href="/book-a-call"
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
                >
                  Book a Discovery Call
                </NextLink>
              </div>
            </Stack>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
