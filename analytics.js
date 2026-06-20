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

let configured = false;

function endpoint() {
  return document.querySelector('meta[name="analytics-endpoint"]')?.content.trim() || "";
}

export function configureAnalytics() {
  const countEndpoint = endpoint();
  if (!countEndpoint || configured) return;
  configured = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.dataset.goatcounter = countEndpoint;
  script.dataset.goatcounterSettings = JSON.stringify({ no_onload: true, allow_local: false });
  document.head.appendChild(script);
}

function send(path) {
  if (!endpoint() || !window.goatcounter?.count) return;
  window.goatcounter.count({ path, title: path, event: true });
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
