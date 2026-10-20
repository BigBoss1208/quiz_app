// Prints SQL only; never executes against Cloudflare.
function buildQueries(table, end = new Date(), groupId = '01', site = 'quiz-app.quangmanh12082005.workers.dev') {
  if (!/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(table || '')) throw new Error('Table must be namespace.table');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(groupId) || !/^[a-z0-9.-]+$/.test(site)) throw new Error('Invalid group/site');
  const to = end.getTime(), from = to - 86400000;
  if (!Number.isFinite(to)) throw new Error('Invalid timestamp');
  const scope = `id = '${groupId}' AND json_get_str(meta, 'site') = '${site}'`;
  const where = `${scope}
  AND json_get_str(meta, 'event') = 'page_view'
  AND json_get_bool(meta, 'is_test') = false
  AND "time" >= to_timestamp_millis(${from}) AND "time" < to_timestamp_millis(${to})`;
  return { from, to, sql: `-- Fixed 24-hour window [start, end), UTC:
-- ${new Date(from).toISOString()} -> ${new Date(to).toISOString()}
-- Confirm namespace/table and DESCRIBE output before running in the teacher's Warehouse.
-- ID is a GROUP key; never COUNT(DISTINCT id) as visits or devices.

-- 1. Recorded page views, distinct event IDs, estimated distinct browsers.
SELECT COUNT(*) AS recorded_page_views,
       COUNT(DISTINCT json_get_str(meta, 'event_id')) AS distinct_events,
       COUNT(DISTINCT json_get_str(meta, 'visitor_id')) AS estimated_browsers
FROM ${table}
WHERE ${where};

-- 2. Countries.
SELECT COALESCE(country, 'UNKNOWN') AS country, COUNT(*) AS page_views,
       COUNT(DISTINCT json_get_str(meta, 'visitor_id')) AS estimated_browsers
FROM ${table}
WHERE ${where}
GROUP BY country ORDER BY page_views DESC;

-- 3. Device families; not an exact physical-device count.
SELECT COALESCE(device, 'unknown') AS device_type, COUNT(*) AS page_views,
       COUNT(DISTINCT json_get_str(meta, 'visitor_id')) AS estimated_browsers
FROM ${table}
WHERE ${where}
GROUP BY device ORDER BY page_views DESC;

-- 4. Latest records (includes clearly marked tests for troubleshooting).
SELECT id, country, device, "time", meta
FROM ${table}
WHERE ${scope}
ORDER BY "time" DESC LIMIT 20;
` };
}
module.exports = { buildQueries };
if (require.main === module) {
  try {
    const args=process.argv.slice(2);
    const get=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
    if (get('--unit')) throw new Error('StreamInfo defines TIMESTAMP/milliseconds; the old --unit option is removed.');
    const rawEnd=get('--end');
    if (rawEnd && !/(Z|[+-]\d{2}:\d{2})$/.test(rawEnd)) throw new Error('--end must include Z or timezone +07:00');
    console.log(buildQueries(get('--table'), rawEnd ? new Date(rawEnd) : new Date(), get('--group') || '01', get('--site') || 'quiz-app.quangmanh12082005.workers.dev').sql);
  } catch(e) { console.error(e.message);process.exitCode=1; }
}
