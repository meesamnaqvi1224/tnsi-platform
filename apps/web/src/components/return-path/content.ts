/**
 * Everything on screen in The Return Path, plus the breath timings - the
 * shape of the `returnPathContent` Sanity singleton
 * (packages/cms/src/schema/documents/returnPathContent.ts). Defaults are
 * the build brief's draft copy (pending Caroline's approval) and are used
 * field by field whenever Sanity is unreachable or a field is left empty,
 * so the practice can never render blank.
 */
export interface ReturnPathContent {
  intro: {
    eyebrow: string;
    title: string;
    description: string;
    instructions: string[];
    beginLabel: string;
    safetyNote: string;
  };
  settings: {
    gentlePauseLabel: string;
    gentlePauseHelp: string;
    noBreathLabel: string;
    noBreathHelp: string;
  };
  choose: {
    heading: string;
    /** `{level}` is replaced with the level's name. */
    lockedMessage: string;
    lockedLinkLabel: string;
  };
  practice: {
    firstHint: string;
    startHint: string;
    tracingHint: string;
    guideHint: string;
    guideFollowHint: string;
    centreLine: string;
    returnHint: string;
  };
  checkpoints: {
    breathLines: string[];
    noBreathLines: string[];
    cueIn: string;
    cuePause: string;
    cueOut: string;
    noBreathCue: string;
    continueLabel: string;
  };
  ending: {
    eyebrow: string;
    heading: string;
    line: string;
    assessmentLabel: string;
    practiseAgainLabel: string;
    memberSavedLabel: string;
    memberSaveFailedLabel: string;
    tryAnotherLabel: string;
    backToDashboardLabel: string;
  };
  email: {
    offer: string;
    fieldLabel: string;
    buttonLabel: string;
    consent: string;
    success: string;
    invalidEmail: string;
    consentRequired: string;
    failure: string;
  };
  timings: {
    inhaleSeconds: number;
    pauseSeconds: number;
    exhaleSeconds: number;
    centreCycles: number;
    noBreathMarkerSeconds: number;
    noBreathCentreSeconds: number;
  };
}

export const DEFAULT_RETURN_PATH_CONTENT: ReturnPathContent = {
  intro: {
    eyebrow: 'The Nervous System Institute · Free practice',
    title: 'The Return Path',
    description: 'A short labyrinth practice that combines slow tracing with slow breathing.',
    instructions: [
      'Trace the path with your finger.',
      "When you reach a marker, pause and breathe. When you're ready, continue.",
      "There's no right speed and no wrong way. You can stop at any time.",
    ],
    beginLabel: 'Begin',
    safetyNote:
      'This is an educational self-regulation practice, not a treatment. If focusing on your breath feels uncomfortable, switch to "practise without breath focus", or simply stop.',
  },
  settings: {
    gentlePauseLabel: 'Add a gentle pause',
    gentlePauseHelp: 'Breathe in for 4, pause for 2, out for 6. Off by default.',
    noBreathLabel: 'Practise without breath focus',
    noBreathHelp: 'Markers become simple pauses to notice your surroundings. No counting.',
  },
  choose: {
    heading: 'Choose a labyrinth',
    lockedMessage:
      "{level} is part of the Regulation Suite™, TNSI's membership and daily practice space.",
    lockedLinkLabel: 'About the Regulation Suite™',
  },
  practice: {
    firstHint:
      'Place your finger on the glowing point at the entrance, and trace slowly along the path.',
    startHint: "Start from the glowing point. There's no rush.",
    tracingHint: "Continue when you're ready. Slowly. Let your finger lead your attention.",
    guideHint: 'The path is tracing itself. Follow it with your eyes, at your own pace.',
    guideFollowHint: 'Follow the path with your eyes.',
    centreLine: "You've reached the centre. Stay here for three slow breaths.",
    returnHint:
      "When you're ready, trace your way back out. You're returning to your day, bringing a little more steadiness with you.",
  },
  checkpoints: {
    breathLines: [
      'Pause here. Breathe in… and out, a little longer.',
      'Notice the contact of your finger on the screen.',
      'Breathe in… and let the out-breath take its time.',
      'Notice where your body is supported right now.',
      'Nothing to fix. Just this breath.',
    ],
    noBreathLines: [
      'Pause here. Notice your feet on the floor.',
      'Notice the contact of your finger on the screen.',
      'Notice the sounds around you, near and far.',
      'Notice where your body is supported right now.',
      'Nothing to fix. Just this pause.',
    ],
    cueIn: 'Breathe in',
    cuePause: 'Pause',
    cueOut: 'Breathe out',
    noBreathCue: 'Pause',
    continueLabel: 'Continue',
  },
  ending: {
    eyebrow: 'Practice complete',
    heading: 'Take a moment to notice how you feel now.',
    line: 'Calmer, the same, or something else: whatever you notice is useful information.',
    assessmentLabel: 'Take the Capacity Assessment',
    practiseAgainLabel: 'Practise again',
    memberSavedLabel: 'Saved to your practice history',
    memberSaveFailedLabel: "We couldn't save this to your practice history just now.",
    tryAnotherLabel: 'Try another labyrinth',
    backToDashboardLabel: 'Back to dashboard',
  },
  email: {
    offer: 'Get the printable version + new practices by email',
    fieldLabel: 'Email address',
    buttonLabel: 'Send me the practices',
    consent:
      "I'd like to receive practices and updates from The Nervous System Institute by email. I can unsubscribe at any time.",
    success: 'Thank you. Check your inbox for the printable version.',
    invalidEmail: 'Please enter a full email address, like name@example.com.',
    consentRequired:
      'Please tick the box to agree to receive emails, so we can send the practices.',
    failure: "We couldn't save your email just now. Please try again.",
  },
  timings: {
    inhaleSeconds: 4,
    pauseSeconds: 2,
    exhaleSeconds: 6,
    centreCycles: 3,
    noBreathMarkerSeconds: 8,
    noBreathCentreSeconds: 14,
  },
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[] | null
    : T[K] extends object
      ? DeepPartial<T[K]> | null
      : T[K] | null;
};

export type ReturnPathContentInput = DeepPartial<ReturnPathContent> | null | undefined;

const isFilledString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isPositiveNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * Merges what Sanity returned over the defaults, one field at a time. An
 * empty string, empty list or non-positive timing falls back to the
 * default rather than blanking part of the practice.
 */
export function resolveReturnPathContent(input: ReturnPathContentInput): ReturnPathContent {
  const out = structuredClone(DEFAULT_RETURN_PATH_CONTENT) as unknown as Record<
    string,
    Record<string, unknown>
  >;
  if (!input) return out as unknown as ReturnPathContent;

  for (const [group, fields] of Object.entries(out)) {
    const given = (input as Record<string, unknown>)[group];
    if (!given || typeof given !== 'object') continue;
    for (const [key, fallback] of Object.entries(fields)) {
      const value = (given as Record<string, unknown>)[key];
      if (Array.isArray(fallback)) {
        const items = Array.isArray(value) ? value.filter(isFilledString) : [];
        if (items.length > 0) fields[key] = items;
      } else if (typeof fallback === 'number') {
        if (isPositiveNumber(value)) fields[key] = value;
      } else if (isFilledString(value)) {
        fields[key] = value;
      }
    }
  }
  return out as unknown as ReturnPathContent;
}
