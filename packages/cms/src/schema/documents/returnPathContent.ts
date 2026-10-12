import { defineField, defineType } from 'sanity';

/**
 * All on-screen copy and breath timings for The Return Path - one
 * singleton document (fixed id `returnPathContent`, opened from the
 * Studio's "The Return Path — content" item), so Caroline can edit any
 * line without a developer. Grouped by screen to match the build brief's
 * On-screen copy section.
 *
 * Every field is optional on purpose: the site falls back field by field
 * to the approved draft copy in
 * apps/web/src/components/return-path/content.ts, so an empty field never
 * blanks part of the practice. Labyrinth geometry and level access stay
 * in code.
 */

const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

const longText = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'text', rows: 3, description });

const lines = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'array', of: [{ type: 'string' }], description });

const seconds = (name: string, title: string, description?: string) =>
  defineField({
    name,
    title,
    type: 'number',
    description,
    validation: (r) => r.min(1).max(60).integer(),
  });

const group = (name: string, title: string, fields: ReturnType<typeof defineField>[]) =>
  defineField({
    name,
    title,
    type: 'object',
    group: name,
    options: { collapsible: false },
    fields,
  });

export const RETURN_PATH_CONTENT_ID = 'returnPathContent';

export const returnPathContent = defineType({
  name: 'returnPathContent',
  title: 'The Return Path — content',
  type: 'document',
  groups: [
    { name: 'intro', title: 'Intro', default: true },
    { name: 'settings', title: 'Settings' },
    { name: 'choose', title: 'Choose' },
    { name: 'practice', title: 'Practice' },
    { name: 'checkpoints', title: 'Checkpoints' },
    { name: 'ending', title: 'Ending' },
    { name: 'email', title: 'Email' },
    { name: 'timings', title: 'Timings' },
  ],
  fields: [
    group('intro', 'Intro', [
      text('eyebrow', 'Eyebrow', 'Public page only.'),
      text('title', 'Title', 'Public page only.'),
      longText('description', 'Description', 'Public page only.'),
      lines('instructions', 'Instructions', 'Shown as a short list, in this order.'),
      text('beginLabel', 'Begin button'),
      longText('safetyNote', 'Safety note'),
    ]),
    group('settings', 'Settings', [
      text('gentlePauseLabel', 'Gentle pause — label'),
      text('gentlePauseHelp', 'Gentle pause — help text'),
      text('noBreathLabel', 'Without breath focus — label'),
      text('noBreathHelp', 'Without breath focus — help text'),
    ]),
    group('choose', 'Choose a labyrinth', [
      text('heading', 'Heading'),
      longText(
        'lockedMessage',
        'Locked level message',
        'Write {level} where the level name goes. No pricing.',
      ),
      text('lockedLinkLabel', 'Locked level link label', 'Links to the Regulation Suite™ page.'),
    ]),
    group('practice', 'Practice hints', [
      longText('firstHint', 'First hint'),
      text('startHint', 'Start from the glowing point'),
      longText('tracingHint', 'Tracing hint'),
      longText('guideHint', 'Guide mode hint'),
      text('guideFollowHint', 'Guide mode hint after a pause'),
      longText('centreLine', 'Centre'),
      longText('returnHint', 'Return hint'),
    ]),
    group('checkpoints', 'Checkpoints', [
      lines('breathLines', 'Checkpoint lines — with breath', 'Rotate in order, one per marker.'),
      lines(
        'noBreathLines',
        'Checkpoint lines — without breath focus',
        'Rotate in order, one per marker.',
      ),
      text('cueIn', 'Breath cue — in'),
      text('cuePause', 'Breath cue — pause'),
      text('cueOut', 'Breath cue — out'),
      text('noBreathCue', 'Cue without breath focus'),
      text('continueLabel', 'Continue link'),
    ]),
    group('ending', 'Ending', [
      text('eyebrow', 'Eyebrow'),
      longText('heading', 'Heading'),
      longText('line', 'Ending line'),
      text('assessmentLabel', 'Capacity Assessment link (public)'),
      text('practiseAgainLabel', 'Practise again (public)'),
      text('memberSavedLabel', 'Saved to practice history (member)'),
      text('memberSaveFailedLabel', 'Could not save (member)'),
      text('tryAnotherLabel', 'Try another labyrinth (member)'),
      text('backToDashboardLabel', 'Back to dashboard (member)'),
    ]),
    group('email', 'Email offer (public)', [
      text('offer', 'Email offer'),
      text('fieldLabel', 'Email field label'),
      text('buttonLabel', 'Email button'),
      longText('consent', 'Consent wording', 'Needs approval before launch.'),
      longText('success', 'Email success'),
      text('invalidEmail', 'Invalid email message'),
      text('consentRequired', 'Consent required message'),
      text('failure', 'Email failure message'),
    ]),
    group('timings', 'Breath timings', [
      seconds('inhaleSeconds', 'Inhale (seconds)', 'Default 4.'),
      seconds(
        'pauseSeconds',
        'Gentle pause (seconds)',
        'Only with "Add a gentle pause". Default 2.',
      ),
      seconds('exhaleSeconds', 'Exhale (seconds)', 'Default 6.'),
      defineField({
        name: 'centreCycles',
        title: 'Breaths at the centre',
        type: 'number',
        description: 'Default 3.',
        validation: (r) => r.min(1).max(10).integer(),
      }),
      seconds('noBreathMarkerSeconds', 'Marker pause without breath focus (seconds)', 'Default 8.'),
      seconds(
        'noBreathCentreSeconds',
        'Centre pause without breath focus (seconds)',
        'Default 14.',
      ),
    ]),
  ],
  preview: {
    prepare: () => ({ title: 'The Return Path — content' }),
  },
});
