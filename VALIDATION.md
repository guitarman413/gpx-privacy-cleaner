# Validation

Date: 2026-06-21

## Automated checks

Run with `npm test`.

The suite covers:

- GPX 1.0 and GPX 1.1 parsing.
- Single and multiple track segments.
- Route-only GPX files.
- Waypoints.
- Garmin and Strava-style heart rate, cadence, power and temperature fields.
- Unknown extension detection and default preservation.
- Files without timestamps or elevation.
- Cumulative-distance trimming across segment boundaries.
- Route trimming.
- Coordinate precision reduction.
- Extremely short tracks and zero remaining points.
- Damaged/incomplete XML and non-GPX XML.
- Original document immutability.
- Full page flow from file drop to scan, clean result and short-track confirmation.
- Analytics request allow-list and minimal request fields.
- Allowed, unknown and absent campaign source parameters, including one-source-event-per-load behavior.

Current result: 16 tests passed, 0 failed.

Source tests cover `gpxlab`, `reddit`, an unknown value and no value. They also verify that arbitrary parameters are not forwarded and that no more than one source event is emitted per page load.

Both deployed campaign links were exercised during internal setup. `source_gpxlab` and `source_reddit` each appeared once in GoatCounter. The source events and their internal `page_view` records were then deleted; the dashboard returned to 0 visits.

## Static checks

- `node --check app.js`
- `node --check analytics.js`
- `node --check gpx-core.js`
- Local HTTP response checked at `http://127.0.0.1:4173/`.

## Analytics integration

- Dedicated GoatCounter site: `gpxprivacycleaner`.
- Data collection is limited to aggregate paths/events; browser, location, referrer, session and individual-pageview collection are disabled.
- A 12-event internal product flow was sent on 2026-06-21 and every event was visible in the dashboard.
- One additional endpoint probe was recorded.
- All 13 internal records were deleted after verification.
- Formal validation baseline after deletion: 0 events.

These records are internal setup tests and are not part of product validation.

## Manual browser checks

Pending final in-app browser inspection because the browser control connection remains unavailable. This must be completed before broad promotion. Automated DOM interaction tests are not reported as manual browser acceptance.

## Known limits

- No map preview is provided.
- The cleaner cannot identify a home address.
- Start/end proximity uses a simple 200 metre comparison between the first and last coordinates; it is a warning, not a location classification.
- Trimming is applied independently to every Track and Route in the file.
- Only recognized heart rate, cadence, power, temperature and device extension names are categorized. Unknown extensions are preserved unless “Remove all extension data” is selected.
- Import compatibility varies by service and by the fields removed. No universal Garmin, Strava, Komoot or other platform guarantee is made.
- No third-party written feedback endpoint is enabled. “Not quite” falls back to a GitHub Issue, which requires a GitHub account.
