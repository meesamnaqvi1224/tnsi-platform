import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * My Journey page: where-you-left-off, the quiet milestones, the filter, the
 * counts and the empty state. Auth and the data layer are mocked at the module
 * boundary - no Clerk session or database.
 */

vi.mock('@/lib/auth-api', () => ({
  requireMemberAccessOrRedirect: () => Promise.resolve({ id: 'user-1', entitlements: {} }),
}));

vi.mock('@/lib/membership', () => ({
  contentAccessFor: () => ({ gatingActive: false, membership: { hasPaidAccess: true } }),
}));

const mockGetCheckInHistory = vi.fn();
vi.mock('@/lib/check-ins', () => ({
  getCheckInHistory: () => mockGetCheckInHistory(),
}));

const mockGetJourneyEntries = vi.fn();
const mockGetMilestoneDates = vi.fn();
vi.mock('@/lib/journey', () => ({
  getJourneyEntries: (...args: unknown[]) => mockGetJourneyEntries(...args),
  getMilestoneDates: () => mockGetMilestoneDates(),
}));

const mockGetInProgressPractices = vi.fn();
const mockGetTodayPractice = vi.fn();
vi.mock('@/lib/practices', () => ({
  formatContentTypeLabel: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
  formatPracticeDuration: (seconds: number | null) =>
    seconds ? `${Math.round(seconds / 60)} min` : null,
  getCompletedPracticeCount: () => Promise.resolve(3),
  getInProgressPracticeCount: () => Promise.resolve(1),
  getInProgressPractices: () => mockGetInProgressPractices(),
  getTodayPractice: () => mockGetTodayPractice(),
}));

const JourneyPage = (await import('./page')).default;

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function practiceEntry(id: string, daysAgo: number) {
  return {
    kind: 'practice' as const,
    id,
    occurredAt: new Date(NOW - daysAgo * DAY),
    practiceId: `p-${id}`,
    title: `Practice ${id}`,
    contentType: 'interactive',
    category: null,
    durationSeconds: 240,
    reflection: { response: 'DIFFERENT' as const, reflection: null },
  };
}

function checkInEntry(id: string, daysAgo: number) {
  return {
    kind: 'check_in' as const,
    id,
    occurredAt: new Date(NOW - daysAgo * DAY),
    moodScore: 4,
    capacityScore: 4,
    notes: null,
  };
}

async function render(search: Record<string, string> = {}) {
  return renderToStaticMarkup(await JourneyPage({ searchParams: Promise.resolve(search) }));
}

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetJourneyEntries.mockResolvedValue({
    entries: [checkInEntry('c1', 1), practiceEntry('a', 5)],
    hasMore: false,
  });
  mockGetMilestoneDates.mockResolvedValue({
    firstCheckIn: new Date(NOW - 5 * DAY),
    firstPractice: new Date(NOW - 5 * DAY),
    firstReflection: null,
  });
  mockGetInProgressPractices.mockResolvedValue([]);
  mockGetTodayPractice.mockResolvedValue(null);
  mockGetCheckInHistory.mockResolvedValue({ checkIns: [{ completedDate: new Date() }] });
});

describe('JourneyPage — where you left off', () => {
  it('offers an unfinished practice first, with its progress', async () => {
    mockGetInProgressPractices.mockResolvedValue([
      {
        id: 'ip',
        title: 'Half done',
        contentType: 'audio',
        durationSeconds: 600,
        progressPct: 0.4,
      },
    ]);
    const html = await render();
    expect(text(html)).toContain('Pick up where you left off');
    expect(text(html)).toContain('Half done');
    expect(text(html)).toContain('40%');
    expect(html).toContain('href="/dashboard/practices/ip"');
    expect(mockGetTodayPractice).not.toHaveBeenCalled();
  });

  it("otherwise suggests today's practice when it has not been done", async () => {
    mockGetTodayPractice.mockResolvedValue({
      completed: false,
      practice: {
        id: 'tp',
        title: 'Future Self Integration',
        contentType: 'audio',
        durationSeconds: 600,
      },
    });
    const html = await render();
    expect(text(html)).toContain('A place to begin next');
    expect(html).toContain('href="/dashboard/practices/tp"');
  });

  it('shows no card when there is nothing in progress and today’s practice is done', async () => {
    mockGetTodayPractice.mockResolvedValue({
      completed: true,
      practice: { id: 'tp', title: 'Done already', contentType: 'audio', durationSeconds: 600 },
    });
    const t = text(await render());
    expect(t).not.toContain('Pick up where you left off');
    expect(t).not.toContain('A place to begin next');
  });
});

describe('JourneyPage — milestones', () => {
  it('marks the first times on the timeline, in plain words', async () => {
    const t = text(await render());
    expect(t).toContain('Your first check-in');
    expect(t).toContain('Your first practice completed');
    expect(t).not.toContain('Your first reflection');
  });

  it('keeps milestones off a filtered view', async () => {
    const t = text(await render({ type: 'practices' }));
    expect(t).not.toContain('Your first check-in');
    expect(t).not.toContain('Your first practice completed');
  });
});

describe('JourneyPage — filter, counts and entries', () => {
  it('asks only for the chosen kind of entry, and keeps the choice in the paging links', async () => {
    mockGetJourneyEntries.mockResolvedValue({ entries: [practiceEntry('a', 2)], hasMore: true });
    const html = await render({ type: 'practices' });
    expect(mockGetJourneyEntries).toHaveBeenCalledWith('user-1', 20, 0, 'practice');
    expect(html).toContain('href="/dashboard/journey?type=practices&amp;page=2"');
    await render({ type: 'check-ins' });
    expect(mockGetJourneyEntries).toHaveBeenLastCalledWith('user-1', 20, 0, 'check_in');
    await render({ type: 'nonsense' });
    expect(mockGetJourneyEntries).toHaveBeenLastCalledWith('user-1', 20, 0, undefined);
  });

  it('shows the real counts and nothing like a streak or score', async () => {
    const t = text(await render());
    expect(t).toContain('Check-ins this month 1');
    expect(t).toContain('Practices completed 3');
    expect(t).toContain('In progress 1');
    expect(t.toLowerCase()).not.toContain('streak');
  });

  it('groups entries under a month and year, with a plain label for each check-in', async () => {
    const t = text(await render());
    expect(t).toMatch(
      /(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/,
    );
    expect(t).toContain("I'm feeling good");
    expect(t).toContain('I feel different');
    expect(t).toContain('View practice');
  });

  it('shows the empty state for a member with no activity at all', async () => {
    mockGetJourneyEntries.mockResolvedValue({ entries: [], hasMore: false });
    const t = text(await render());
    expect(t).toContain('Your journey starts here');
    expect(t).not.toContain('Practices completed');
  });
});
