# Privacy

Last updated: 2026-06-20

## GPX processing

GPX files are read and processed locally by the browser. The website does not upload or intentionally transmit:

- file names or GPX contents;
- coordinates, start/end locations or track length;
- timestamps;
- author, email, copyright or device values;
- any other track or route data.

The cleaned file is created as a local browser download. The original file is not modified.

## Anonymous usage events

When an analytics endpoint is configured, the website sends only fixed event names for aggregate product validation:

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

No file-derived value is included in an event. The analytics provider may receive ordinary network information, such as an IP address, while handling the request; the selected provider and its policy must be disclosed before promotion.

## Written feedback

Written feedback is optional and separate from GPX processing. If an anonymous form endpoint is configured, only the text the user deliberately submits and the fixed source name `gpx-privacy-cleaner` are sent. The GPX file is never attached.

Users should not include coordinates, addresses, timestamps or other private GPX information in feedback.

## Limits

Cleaning a GPX file reduces selected exposure but cannot guarantee anonymity. The route shape and remaining coordinates may still identify places or habits. Users must review the cleaned file before publishing it.
