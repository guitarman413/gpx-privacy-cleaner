const ALLOWED_EVENTS = new Set([
  "page_view",
  "file_selected",
  "parse_success",
  "parse_failure",
  "privacy_scan_success",
  "sensitive_categories_detected",
  "scrub_success",
  "download_success",
  "scrub_failure",
  "feedback_helpful",
  "feedback_not_helpful",
  "feedback_text_submitted",
]);

const ALLOWED_CATEGORIES = new Set([
  "timestamps",
  "elevation",
  "activity_extensions",
  "personal_metadata",
  "waypoints",
  "all_extensions",
  "start_trim",
  "end_trim",
  "coordinate_precision",
]);

function endpoint() {
  return document.querySelector('meta[name="analytics-endpoint"]')?.content.trim() || "";
}

export function configureAnalytics() {}

function send(path) {
  const countEndpoint = endpoint();
  if (!countEndpoint) return;
  const query = new URLSearchParams({
    p: path,
    t: path,
    e: "1",
    rnd: Math.random().toString(36).slice(2, 8),
  });
  const pixel = new window.Image();
  pixel.referrerPolicy = "no-referrer";
  pixel.src = `${countEndpoint}?${query.toString()}`;
}

export function trackEvent(name) {
  if (!ALLOWED_EVENTS.has(name)) return;
  send(name);
}

export function trackSelectedCategories(categories) {
  for (const category of new Set(categories)) {
    if (ALLOWED_CATEGORIES.has(category)) send(`scrub_option_${category}`);
  }
}

export function analyticsIsConfigured() {
  return Boolean(endpoint());
}
