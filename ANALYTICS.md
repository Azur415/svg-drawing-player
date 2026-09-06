# Usage analytics

The live Pages deployment records privacy-preserving product usage in the
`svg_drawing_player_usage` Workers Analytics Engine dataset. This is separate
from SVG processing: imported SVG text stays in the browser and is never sent
to `/api/usage`.

## What is recorded

The client sends small anonymous events for:

- sessions starting and ending;
- import attempts, rejected imports, successful imports and safe error classes;
- playback starts, pauses, completions, restarts, seeks and step navigation;
- chapter selection, playback settings, speed and camera changes;
- zoom buttons, canvas pans, sanitized SVG downloads and language changes.

The payload contains only coarse counts and timings: app version, interface
language, layout bucket, SVG byte size, element/chapter/warning counts,
processing time, playback position, selected indexes and settings. It does not
contain SVG source, a file name, account information, raw IP, user-agent or a
stable cross-device identifier. A random session ID is kept in
`sessionStorage` only so events in one browser tab can be grouped. Users who
block storage still get an ephemeral ID.

The header explains this behavior, and the help dialog repeats it. The privacy
badge is also a visible on/off switch; the choice is stored locally and no
event is sent when analytics are disabled. The player continues to work if
analytics are unavailable. The local development build does not send
analytics.

## Cloudflare setup

`wrangler.jsonc` defines the Pages Function binding and dataset name:

```json
"analytics_engine_datasets": [
  { "binding": "ANALYTICS_ENGINE", "dataset": "svg_drawing_player_usage" }
]
```

The `/functions` directory must stay at the repository root. Deploy with
Wrangler or the included GitHub Action; dashboard drag-and-drop does not
compile a Pages `functions` directory. The first production deployment should
be checked in Cloudflare under Workers & Pages → the Pages project → Settings
→ Bindings, where `ANALYTICS_ENGINE` must point to the same dataset. Redeploy
after changing the binding.

The dataset cannot be used by the Vite browser development server, so local
development intentionally treats `/api/usage` as best effort. Production
queries can use Cloudflare's Analytics Engine SQL API with an account token
that has Account Analytics Read permission. Keep that token outside the
repository.

## Useful SQL queries

Analytics Engine stores the fixed fields in the order documented below.

Blobs: `blob1 event`, `blob2 app version`, `blob3 source`, `blob4 language`,
`blob5 anonymous session`, `blob6 reason`, `blob7 playback mode`,
`blob8 camera`, `blob9 layout`, `blob10 direction`.

Doubles: `double1 file bytes`, `double2 element count`, `double3 chapter
count`, `double4 warning count`, `double5 processing milliseconds`,
`double6 playback position milliseconds`, `double7 duration milliseconds`,
`double8 chapter index`, `double9 speed`, `double10 target seconds`,
`double11 file count`, `double12 event value`, `double13 artwork number in
the current tab`.

Daily event volume:

```sql
SELECT
  toDate(timestamp) AS day,
  blob1 AS event,
  SUM(_sample_interval) AS events
FROM svg_drawing_player_usage
WHERE timestamp >= NOW() - INTERVAL '90' DAY
GROUP BY day, event
ORDER BY day, events DESC
```

Import funnel:

```sql
SELECT blob1 AS event, SUM(_sample_interval) AS rows
FROM svg_drawing_player_usage
WHERE timestamp >= NOW() - INTERVAL '90' DAY
  AND blob1 IN ('import_requested', 'import_rejected', 'import_success', 'import_failed')
GROUP BY event
ORDER BY rows DESC
```

Most-used playback modes and average processed SVG size:

```sql
SELECT
  blob7 AS mode,
  SUM(_sample_interval) AS completed,
  SUM(_sample_interval * double2) / SUM(_sample_interval) AS avg_elements,
  SUM(_sample_interval * double1) / SUM(_sample_interval) AS avg_file_bytes
FROM svg_drawing_player_usage
WHERE timestamp >= NOW() - INTERVAL '90' DAY
  AND blob1 = 'play_complete'
GROUP BY mode
ORDER BY completed DESC
```

When Analytics Engine sampling is active, use `SUM(_sample_interval * value)`
style weighted aggregates rather than assuming every stored row represents
exactly one event. For a presentation, report the date range and query
definition beside the figures.
