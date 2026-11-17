-- READ-ONLY measurement for check-in time zones (phase 1; see docs/check-in-timezone-plan.md).
--
-- How often does the server's UTC day (check_ins.completed_date, unchanged in phase 1) differ from the
-- member's own calendar day (metadata.localDate, computed by the server from the zone the device
-- reported)? Run against any database you are allowed to read; it changes nothing: the whole script
-- runs in a READ ONLY transaction that is rolled back.
--
--   psql "$DATABASE_URL" -v since="'2026-11-12'" -f packages/db/scripts/measure-check-in-timezones.sql
--
-- Set `since` to the day the timezone recording was released. Rows written before then (and rows from
-- older app builds, or with an unusable zone) have no timeZone in metadata and are counted separately,
-- never guessed.

BEGIN READ ONLY;

-- 1. Coverage and the headline number.
SELECT count(*)                                                        AS check_ins_since,
       count(*) FILTER (WHERE metadata ? 'timeZone')                   AS with_time_zone,
       count(*) FILTER (WHERE NOT metadata ? 'timeZone')               AS without_time_zone,
       count(*) FILTER (WHERE metadata ? 'timeZone'
                          AND (metadata->>'localDate')::date <> completed_date) AS utc_day_differs,
       round(100.0 * count(*) FILTER (WHERE metadata ? 'timeZone'
                          AND (metadata->>'localDate')::date <> completed_date)
             / NULLIF(count(*) FILTER (WHERE metadata ? 'timeZone'), 0), 1)    AS pct_utc_day_differs
FROM check_ins
WHERE created_at >= :since::date;

-- 2. Members affected: distinct members with at least one differing day, out of members with a zone.
SELECT count(DISTINCT user_id) FILTER (WHERE metadata ? 'timeZone')           AS members_with_time_zone,
       count(DISTINCT user_id) FILTER (WHERE metadata ? 'timeZone'
                          AND (metadata->>'localDate')::date <> completed_date) AS members_affected
FROM check_ins
WHERE created_at >= :since::date;

-- 3. By time zone: where the UTC day is wrong for people.
SELECT metadata->>'timeZone'                                            AS time_zone,
       (metadata->>'utcOffsetMinutes')::int                             AS utc_offset_minutes_example,
       count(*)                                                         AS check_ins,
       count(*) FILTER (WHERE (metadata->>'localDate')::date <> completed_date) AS utc_day_differs
FROM check_ins
WHERE created_at >= :since::date AND metadata ? 'timeZone'
GROUP BY 1, 2
ORDER BY utc_day_differs DESC, check_ins DESC;

-- 4. Which direction: the member's day is ahead of (+1) or behind (-1) the server's day.
SELECT ((metadata->>'localDate')::date - completed_date)                AS local_minus_utc_days,
       count(*)                                                         AS check_ins
FROM check_ins
WHERE created_at >= :since::date AND metadata ? 'timeZone'
GROUP BY 1
ORDER BY 1;

ROLLBACK;
