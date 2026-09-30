-- Read-only inspection of the existing E2B event table, not a migration.
-- Run using an authorized database client. Keep DATABASE_URL in Secrets.
-- Requires the table created by backend/src/infrastructure.js.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SELECT type, count(*) AS events, max(received_at) AS most_recent
FROM thcode_e2b_events
WHERE received_at >= NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY events DESC;
SELECT count(*) AS stored_events, count(DISTINCT id) AS unique_events
FROM thcode_e2b_events;
COMMIT;
