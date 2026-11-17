/**
 * The Home screen's own colours, from the approved Home redesign reference: a clean white page, deep
 * navy type, one restrained bronze accent and a visible but quiet grey border. Kept local to Home so
 * the rest of the app keeps its existing palette until those screens are redesigned and approved.
 */
export const home = {
  page: '#FFFFFF',
  navy: '#14253D',
  ink: '#4B5563',
  bronze: '#A87942',
  bronzeTint: '#F4EBDD',
  border: '#DDE1E5',
  cool: '#F7F9FB',
} as const;

/** The surface every Home card shares: a visible 1 px border, a 14 px corner and only a hint of shadow. */
export const homeCardStyle = {
  borderWidth: 1,
  borderColor: home.border,
  borderRadius: 14,
  shadowColor: home.navy,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 1,
} as const;
