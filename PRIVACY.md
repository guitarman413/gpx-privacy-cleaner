# Privacy

Last updated: 2026-06-21

## GPX processing

GPX files are read and processed locally by the browser. The website does not upload or intentionally transmit:

- file names or GPX contents;
- coordinates, start/end locations or track length;
- timestamps;
- author, email, copyright or device values;
- any other track or route data.

The cleaned file is created as a local browser download. The original file is not modified.

## Aggregate usage events

GoatCounter receives only fixed event names for aggregate product validation:

- `page_view`
- `file_selected`
- `parse_success` / `parse_failure`
- `privacy_scan_success`
- `sensitive_categories_detected`
- `scrub_success` / `scrub_failure`
- fixed `scrub_option_*` category names
- `download_success`
- `feedback_helpful` / `feedback_not_helpful`
- `feedback_text_submitted`

No file-derived value is included in an event. The application sends only the fixed event name, the same fixed title, an event flag and a random cache-busting value. It does not send referrer, page query, screen size or other browser fields.

The GoatCounter site is configured not to collect individual pageviews, sessions, referrers, browser/system names, screen sizes, countries, regions or languages. Aggregate event data is retained for 31 days.

GoatCounter may still process ordinary network information while handling the request. Its hosted service states that it does not store IP addresses, full User-Agent headers or browser tracker IDs.

## Written feedback

No third-party written feedback provider is currently configured. The evaluated provider required Google reCAPTCHA and additional account-page analytics, so it was not enabled.

Users who choose “Not quite” can open a GitHub Issue draft. GitHub requires an account and may process ordinary network and account information. The user reviews and submits the text on GitHub; the GPX file, file name and processing data are never attached automatically.

Users should not include coordinates, addresses, timestamps or other private GPX information in a GitHub Issue.

## Limits

Cleaning a GPX file reduces selected exposure but cannot guarantee anonymity. The route shape and remaining coordinates may still identify places or habits. Users must review the cleaned file before publishing it.
