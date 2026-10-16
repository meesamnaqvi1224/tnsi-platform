import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards `apps/web/vercel.json` (the project's Root Directory is apps/web). On
 * Vercel's Hobby plan a cron expression that runs more than once a day makes the
 * whole deployment FAIL, so this fails first if someone makes the schedule more
 * frequent without moving to a plan that allows it.
 */
const file = fileURLToPath(new URL('../../vercel.json', import.meta.url));
const config = JSON.parse(readFileSync(file, 'utf8')) as {
  crons?: Array<{ path: string; schedule: string }>;
};

describe('vercel.json crons', () => {
  it('schedules exactly the CRM outbox worker', () => {
    expect(config.crons).toHaveLength(1);
    expect(config.crons![0]!.path).toBe('/api/internal/crm-outbox');
  });

  it('points at a route that exists', () => {
    const route = fileURLToPath(
      new URL('../app/api/internal/crm-outbox/route.ts', import.meta.url),
    );
    expect(existsSync(route)).toBe(true);
  });

  it('runs at most once a day (Hobby plan limit): fixed minute and hour, every day', () => {
    const [minute, hour, dayOfMonth, month, dayOfWeek, ...extra] =
      config.crons![0]!.schedule.split(' ');
    expect(extra).toHaveLength(0);
    expect(minute).toMatch(/^\d+$/);
    expect(hour).toMatch(/^\d+$/);
    expect([dayOfMonth, month, dayOfWeek]).toEqual(['*', '*', '*']);
  });

  it('is 06:00 UTC (11:30 India time)', () => {
    expect(config.crons![0]!.schedule).toBe('0 6 * * *');
  });
});
