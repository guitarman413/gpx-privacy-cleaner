# GPX Privacy Cleaner

Check what a GPX file reveals, remove sensitive location and activity data, and download a safer copy before sharing.

The tool is a static, single-page website. GPX files are parsed, scanned and cleaned entirely in the browser. File names, coordinates, timestamps and track contents are never uploaded.

## What it checks

- Timestamps and elevation.
- Heart rate, cadence, power and temperature extensions.
- Author, email, copyright, creator and recognized device fields.
- Waypoints.
- Tracks whose start and end are within 200 metres.
- Unknown extension data that the cleaner will preserve by default.

## Cleaning options

- Remove timestamps, elevation, recognized activity sensor data or personal metadata.
- Remove waypoints.
- Trim a travelled distance from each track or route start and end.
- Reduce coordinate precision to 5, 4 or 3 decimal places.
- Optionally remove all extension data.

Trimming follows cumulative path distance, not a straight-line radius. Track and route elements and track segment boundaries are preserved.

## Run locally

```bash
npm install
npm test
npm run serve
```

Open `http://localhost:4173`.

## Analytics configuration

The UI uses the dedicated `gpxprivacycleaner` GoatCounter site. It sends image requests directly to the public count endpoint instead of loading GoatCounter's general-purpose script.

Only allow-listed fixed event names and a random cache-busting value are sent. Selected cleaning categories are represented by fixed event names such as `scrub_option_timestamps`; no user values are attached. Referrer, query string and screen width are not sent by the application.

The optional `source` query parameter accepts only the hard-coded values `gpxlab` and `reddit`, which produce `source_gpxlab` and `source_reddit`. Unknown values are ignored. The full query string and referrer are never forwarded.

## Feedback configuration

The optional third-party text endpoint is intentionally not configured. The evaluated provider required Google reCAPTCHA and additional account-page analytics, which did not meet this project's minimum-data rule.

“Not quite” displays a text box whose contents are used only to prepare a GitHub Issue draft. The button reads “Review and submit on GitHub”; nothing is submitted automatically, and an empty text box opens the ordinary new-issue page. GitHub requires an account. Yes/No feedback remains independent of written feedback and is counted by GoatCounter.

## Important limitation

Removing metadata or reducing precision cannot guarantee complete anonymity. Users should keep their original file and review the cleaned copy before publishing it.

## License

MIT
