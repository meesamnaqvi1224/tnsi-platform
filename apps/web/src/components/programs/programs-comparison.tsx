import { Container, Section, Stack } from '@tnsi/ui';

const programs = [
  'Life Beyond Trauma',
  'Practitioner Certification',
  'Executive Advisory',
] as const;

const rows = [
  {
    label: 'Best For',
    values: [
      'Individuals seeking personal healing and sustainable wellbeing',
      'Therapists, coaches and health professionals',
      'Leaders, founders and organisations',
    ],
  },
  {
    label: 'Format',
    values: [
      'Live group programme with individual support',
      'Structured certification curriculum',
      'Private advisory, bespoke to each organisation',
    ],
  },
  {
    label: 'Duration',
    values: ['Ongoing cohorts', 'One year', 'Ongoing engagement'],
  },
  {
    label: 'Support',
    values: [
      'Community, coaching sessions, resource library',
      'Supervision, peer learning, mentorship',
      'Direct access to Caroline Reed',
    ],
  },
  {
    label: 'Outcome',
    values: [
      'Regulated nervous system, expanded capacity, sustainable success',
      'Certifiable trauma-informed nervous system education',
      'Healthier leadership culture and measurable organisational change',
    ],
  },
] as const;

export function ProgramsComparison() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-labelledby="comparison-heading">
      <Container size="xl">
        <Stack gap="sm" className="mb-(--space-3xl) max-w-2xl">
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Compare the pathways
          </p>
          <h2
            id="comparison-heading"
            className="font-heading text-foreground text-4xl font-semibold tracking-tight"
          >
            Find the right fit.
          </h2>
        </Stack>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-border border-b">
                {/* Empty header for the row-label column */}
                <th
                  scope="col"
                  className="w-[160px] pr-(--space-xl) pb-(--space-lg)"
                  aria-label="Category"
                />
                {programs.map((program) => (
                  <th
                    key={program}
                    scope="col"
                    className="font-heading text-foreground pr-(--space-xl) pb-(--space-lg) text-base font-semibold tracking-tight last:pr-0"
                  >
                    {program}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-border border-b last:border-0">
                  <th
                    scope="row"
                    className="text-muted-foreground py-(--space-lg) pr-(--space-xl) align-top text-xs font-medium tracking-widest uppercase"
                  >
                    {row.label}
                  </th>
                  {row.values.map((value, i) => (
                    <td
                      key={i}
                      className="text-muted-foreground py-(--space-lg) pr-(--space-xl) align-top text-sm leading-relaxed last:pr-0"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}
