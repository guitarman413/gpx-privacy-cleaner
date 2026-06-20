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

The UI includes a strict GoatCounter adapter. Set the `analytics-endpoint` meta value in `index.html` to a site endpoint such as `https://example.goatcounter.com/count`.

Only allow-listed fixed event names are sent. Selected cleaning categories are represented by fixed event names such as `scrub_option_timestamps`; no user values are attached.

## Feedback configuration

Set the `feedback-endpoint` meta value to an anonymous form endpoint that accepts JSON. The text body is sent only when the user explicitly submits it. It is never sent to analytics and the UI asks users not to include coordinates or GPX data.

If no endpoint is configured, the text form opens a prefilled public GitHub Issue for the user to review. Yes/No feedback remains independent of the text form.

## Important limitation

Removing metadata or reducing precision cannot guarantee complete anonymity. Users should keep their original file and review the cleaned copy before publishing it.

## License

MIT
