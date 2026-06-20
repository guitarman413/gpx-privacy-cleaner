# Validation

Date: 2026-06-20

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

Current result: 15 tests passed, 0 failed.

## Static checks

- `node --check app.js`
- `node --check analytics.js`
- `node --check gpx-core.js`
- Local HTTP response checked at `http://127.0.0.1:4173/`.

## Manual browser checks

Pending final in-app browser inspection because the browser control connection was unavailable during the first validation attempt. This must be completed before broad promotion.

## Known limits

- No map preview is provided.
- The cleaner cannot identify a home address.
- Start/end proximity uses a simple 200 metre comparison between the first and last coordinates; it is a warning, not a location classification.
- Trimming is applied independently to every Track and Route in the file.
- Only recognized heart rate, cadence, power, temperature and device extension names are categorized. Unknown extensions are preserved unless “Remove all extension data” is selected.
- Import compatibility varies by service and by the fields removed. No universal Garmin, Strava, Komoot or other platform guarantee is made.
- Text feedback requires a configured anonymous form endpoint; otherwise it opens a GitHub Issue draft.
