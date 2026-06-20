import { GpxError, parseGpx, planScrub, scanGpx, scrubGpx } from "./gpx-core.js";
import {
  analyticsIsConfigured,
  configureAnalytics,
  trackEvent,
  trackSelectedCategories,
  trackSource,
} from "./analytics.js";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ISSUE_URL = "https://github.com/guitarman413/gpx-privacy-cleaner/issues/new";

const elements = {
  fileInput: document.querySelector("#file-input"),
  dropZone: document.querySelector("#drop-zone"),
  fileStatus: document.querySelector("#file-status"),
  workspace: document.querySelector("#workspace"),
  scanSummary: document.querySelector("#scan-summary"),
  unknownNotice: document.querySelector("#unknown-extension-notice"),
  trimStart: document.querySelector("#trim-start"),
  trimEnd: document.querySelector("#trim-end"),
  customStart: document.querySelector("#custom-start"),
  customEnd: document.querySelector("#custom-end"),
  customStartWrap: document.querySelector("#custom-start-wrap"),
  customEndWrap: document.querySelector("#custom-end-wrap"),
  coordinatePrecision: document.querySelector("#coordinate-precision"),
  preflight: document.querySelector("#preflight"),
  riskConfirmWrap: document.querySelector("#risk-confirm-wrap"),
  riskConfirm: document.querySelector("#risk-confirm"),
  cleanButton: document.querySelector("#clean-button"),
  resultStage: document.querySelector("#result-stage"),
  comparison: document.querySelector("#comparison"),
  resultWarning: document.querySelector("#result-warning"),
  downloadButton: document.querySelector("#download-button"),
  feedbackStage: document.querySelector("#feedback-stage"),
  feedbackYes: document.querySelector("#feedback-yes"),
  feedbackNo: document.querySelector("#feedback-no"),
  feedbackForm: document.querySelector("#feedback-form"),
  feedbackText: document.querySelector("#feedback-text"),
  feedbackCompany: document.querySelector("#feedback-company"),
  feedbackStatus: document.querySelector("#feedback-status"),
};

const state = {
  document: null,
  scan: null,
  result: null,
  downloadUrl: null,
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCount(value, singular, plural = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function scanCard(label, present, detail, tone = "sensitive") {
  const className = present ? tone : "clear";
  const status = present ? "Found" : "Not found";
  return `<article class="scan-card ${className}"><div class="scan-status"><span class="status-dot"></span>${status}</div><h3>${escapeHtml(label)}</h3><p>${escapeHtml(detail)}</p></article>`;
}

function renderScan(scan) {
  const personalParts = [];
  if (scan.metadata.hasAuthor) personalParts.push("author");
  if (scan.metadata.hasEmail) personalParts.push("email");
  if (scan.metadata.hasCopyright) personalParts.push("copyright");
  if (scan.metadata.hasCreator) personalParts.push("generator");
  if (scan.metadata.hasDevice) personalParts.push("device fields");

  elements.scanSummary.innerHTML = [
    scanCard("Timestamps", scan.hasTime, scan.hasTime ? formatCount(scan.timeCount, "time field") : "No exact activity times detected."),
    scanCard("Elevation", scan.hasElevation, scan.hasElevation ? formatCount(scan.elevationCount, "elevation value") : "No elevation values detected."),
    scanCard("Activity sensors", scan.extensions.sportsCount > 0, scan.extensions.sportsCount > 0 ? "Heart rate, cadence, power or temperature data detected." : "No recognized sport sensor fields detected."),
    scanCard("Personal details", scan.hasPersonalMetadata, personalParts.length ? `Detected: ${personalParts.join(", ")}.` : "No recognized author, email, copyright, generator or device fields."),
    scanCard("Waypoints", scan.waypointCount > 0, scan.waypointCount > 0 ? formatCount(scan.waypointCount, "waypoint") : "No separate waypoints detected."),
    scanCard("Start and end", scan.hasCloseStartEnd, scan.hasCloseStartEnd ? "At least one path starts and ends within 200 metres." : "No path starts and ends within 200 metres.", scan.hasCloseStartEnd ? "warning" : "sensitive"),
    scanCard("Track size", true, `${formatCount(scan.totalPathPointCount, "path point")} across ${formatCount(scan.trackCount, "track")} and ${formatCount(scan.routeCount, "route")}.`, "neutral"),
    scanCard("GPX structure", true, `GPX ${scan.version}; ${formatCount(scan.segmentCount, "track segment")}.`, "neutral"),
  ].join("");

  if (scan.extensions.unknownCount > 0) {
    elements.unknownNotice.hidden = false;
    elements.unknownNotice.innerHTML = `<strong>Unknown extension data detected.</strong> ${formatCount(scan.extensions.unknownCount, "unrecognized field type")} will be kept by default. Choose “Remove all extension data” only if you are comfortable discarding it.`;
  } else {
    elements.unknownNotice.hidden = true;
    elements.unknownNotice.textContent = "";
  }
}

function setSuggestedOptions(scan) {
  document.querySelector('[name="removeTimes"]').checked = scan.hasTime;
  document.querySelector('[name="removeElevation"]').checked = false;
  document.querySelector('[name="removeSportsExtensions"]').checked = scan.extensions.sportsCount > 0;
  document.querySelector('[name="removePersonalMetadata"]').checked = scan.hasPersonalMetadata;
  document.querySelector('[name="removeWaypoints"]').checked = scan.waypointCount > 0;
  document.querySelector('[name="removeAllExtensions"]').checked = false;
  elements.trimStart.value = "0";
  elements.trimEnd.value = "0";
  elements.coordinatePrecision.value = "";
  elements.riskConfirm.checked = false;
  updateCustomDistanceVisibility();
}

function selectedDistance(select, input) {
  if (select.value === "custom") return Number(input.value) || 0;
  return Number(select.value) || 0;
}

function selectedOptions() {
  return {
    removeTimes: document.querySelector('[name="removeTimes"]').checked,
    removeElevation: document.querySelector('[name="removeElevation"]').checked,
    removeSportsExtensions: document.querySelector('[name="removeSportsExtensions"]').checked,
    removePersonalMetadata: document.querySelector('[name="removePersonalMetadata"]').checked,
    removeWaypoints: document.querySelector('[name="removeWaypoints"]').checked,
    removeAllExtensions: document.querySelector('[name="removeAllExtensions"]').checked,
    trimStartMeters: selectedDistance(elements.trimStart, elements.customStart),
    trimEndMeters: selectedDistance(elements.trimEnd, elements.customEnd),
    coordinateDecimals: elements.coordinatePrecision.value,
  };
}

function updateCustomDistanceVisibility() {
  elements.customStartWrap.hidden = elements.trimStart.value !== "custom";
  elements.customEndWrap.hidden = elements.trimEnd.value !== "custom";
}

function categoryLabel(category) {
  return {
    timestamps: "timestamps",
    elevation: "elevation",
    activity_extensions: "activity sensor data",
    personal_metadata: "personal and device details",
    waypoints: "waypoints",
    all_extensions: "all extension data",
    start_trim: "points near each path start",
    end_trim: "points near each path end",
    coordinate_precision: "coordinate precision",
  }[category] || category;
}

function updatePreflight() {
  if (!state.document) return;
  try {
    const plan = planScrub(state.document, selectedOptions());
    const categories = plan.categories.map(categoryLabel);
    const categoriesText = categories.length
      ? categories.join(", ")
      : "Nothing is currently selected for removal";
    const pointText = plan.removed.pathPoints > 0
      ? `${formatCount(plan.removed.pathPoints, "path point")} expected to be trimmed.`
      : "No path points will be trimmed.";
    const warnings = plan.warnings.length
      ? `<div class="preflight-warning"><strong>Check these settings:</strong> ${plan.warnings.map(escapeHtml).join(" ")}</div>`
      : "";
    elements.preflight.innerHTML = `<strong>Before cleaning</strong><p>${escapeHtml(categoriesText)}.</p><p>${escapeHtml(pointText)}</p>${warnings}`;
    elements.riskConfirmWrap.hidden = !plan.highRisk;
    if (!plan.highRisk) elements.riskConfirm.checked = false;
    elements.cleanButton.disabled = plan.categories.length === 0 || (plan.highRisk && !elements.riskConfirm.checked);
  } catch {
    elements.preflight.innerHTML = "<strong>Unable to preview these settings.</strong> Check the custom distances and try again.";
    elements.cleanButton.disabled = true;
  }
}

function resetResult() {
  state.result = null;
  if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
  state.downloadUrl = null;
  elements.resultStage.hidden = true;
  elements.feedbackStage.hidden = true;
  elements.feedbackForm.hidden = true;
  elements.feedbackStatus.textContent = "";
}

function sensitiveCategoryCount(scan) {
  return [
    scan.hasTime,
    scan.hasElevation,
    scan.extensions.sportsCount > 0,
    scan.hasPersonalMetadata,
    scan.waypointCount > 0,
    scan.hasCloseStartEnd,
    scan.extensions.unknownCount > 0,
  ].filter(Boolean).length;
}

async function handleFile(file) {
  resetResult();
  state.document = null;
  state.scan = null;
  elements.workspace.hidden = true;
  trackEvent("file_selected");

  if (!file || file.size > MAX_FILE_SIZE) {
    elements.fileStatus.innerHTML = '<span class="error-message">Choose one GPX file smaller than 25 MB.</span>';
    trackEvent("parse_failure");
    return;
  }

  elements.fileStatus.textContent = "Checking the file locally…";
  try {
    const xmlText = await file.text();
    const gpxDocument = parseGpx(xmlText);
    const scan = scanGpx(gpxDocument);
    state.document = gpxDocument;
    state.scan = scan;
    elements.fileStatus.innerHTML = `<span class="success-message">File parsed successfully. ${formatCount(scan.totalPathPointCount, "path point")} found.</span>`;
    renderScan(scan);
    setSuggestedOptions(scan);
    elements.workspace.hidden = false;
    updatePreflight();
    trackEvent("parse_success");
    trackEvent("privacy_scan_success");
    if (sensitiveCategoryCount(scan) > 0) trackEvent("sensitive_categories_detected");
    document.querySelector("#scan-title").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    const message = error instanceof GpxError ? error.message : "This file could not be read as GPX.";
    elements.fileStatus.innerHTML = `<span class="error-message">${escapeHtml(message)}</span>`;
    trackEvent("parse_failure");
  }
}

function comparisonRow(label, before, after, removed) {
  return `<div class="comparison-row"><span>${escapeHtml(label)}</span><strong>${before.toLocaleString()}</strong><span aria-hidden="true">→</span><strong>${after.toLocaleString()}</strong><em>${removed > 0 ? `Removed ${removed.toLocaleString()}` : "Kept"}</em></div>`;
}

function renderResult(result) {
  const before = result.before;
  const after = result.after;
  elements.comparison.innerHTML = `<div class="comparison-head"><span>Data</span><span>Before</span><span></span><span>After</span><span>Change</span></div>${[
    comparisonRow("Path points", before.totalPathPointCount, after.totalPathPointCount, before.totalPathPointCount - after.totalPathPointCount),
    comparisonRow("Time fields", before.timeCount, after.timeCount, before.timeCount - after.timeCount),
    comparisonRow("Elevation values", before.elevationCount, after.elevationCount, before.elevationCount - after.elevationCount),
    comparisonRow("Recognized sensor fields", before.extensions.sportsCount, after.extensions.sportsCount, before.extensions.sportsCount - after.extensions.sportsCount),
    comparisonRow("Waypoints", before.waypointCount, after.waypointCount, before.waypointCount - after.waypointCount),
    comparisonRow("Unknown extension types", before.extensions.unknownCount, after.extensions.unknownCount, before.extensions.unknownCount - after.extensions.unknownCount),
  ].join("")}`;

  if (after.hasCloseStartEnd) {
    elements.resultWarning.hidden = false;
    elements.resultWarning.innerHTML = "<strong>Start/end reminder:</strong> At least one cleaned path still starts and ends within 200 metres. This alone does not identify a home, but review the file carefully before sharing.";
  } else {
    elements.resultWarning.hidden = true;
  }
  elements.resultStage.hidden = false;
  elements.feedbackStage.hidden = false;
  elements.resultStage.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createCleanedCopy() {
  if (!state.document) return;
  try {
    const result = scrubGpx(state.document, selectedOptions());
    if (result.highRisk && !elements.riskConfirm.checked) {
      updatePreflight();
      return;
    }
    resetResult();
    state.result = result;
    state.downloadUrl = URL.createObjectURL(new Blob([result.xml], { type: "application/gpx+xml" }));
    renderResult(result);
    trackSelectedCategories(result.categories);
    trackEvent("scrub_success");
  } catch {
    elements.preflight.innerHTML = "<strong>The cleaned copy could not be created.</strong> Your original file was not changed.";
    trackEvent("scrub_failure");
  }
}

function downloadResult() {
  if (!state.downloadUrl || !state.result) return;
  const anchor = document.createElement("a");
  anchor.href = state.downloadUrl;
  anchor.download = "gpx-privacy-cleaned.gpx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  trackEvent("download_success");
  elements.feedbackStage.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showTextFeedback() {
  elements.feedbackForm.hidden = false;
  elements.feedbackText.focus();
}

function submitTextFeedback(event) {
  event.preventDefault();
  const text = elements.feedbackText.value.trim();
  if (elements.feedbackCompany.value) {
    elements.feedbackText.value = "";
    elements.feedbackStatus.textContent = "Thank you.";
    return;
  }
  const issue = text
    ? `${ISSUE_URL}?title=${encodeURIComponent("GPX privacy feedback")}&body=${encodeURIComponent(text)}`
    : ISSUE_URL;
  window.open(issue, "_blank", "noopener,noreferrer");
  elements.feedbackStatus.textContent = "A GitHub feedback draft was opened. Review it before submitting.";
}

configureAnalytics();
window.addEventListener("load", () => {
  if (analyticsIsConfigured()) {
    trackEvent("page_view");
    window.setTimeout(() => trackSource(), 750);
  }
});

elements.fileInput.addEventListener("change", () => handleFile(elements.fileInput.files[0]));
for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
  });
}
elements.dropZone.addEventListener("drop", (event) => handleFile(event.dataTransfer.files[0]));

document.querySelectorAll('.options-grid input, .options-grid select').forEach((input) => {
  input.addEventListener("change", () => {
    updateCustomDistanceVisibility();
    resetResult();
    updatePreflight();
  });
  input.addEventListener("input", () => {
    resetResult();
    updatePreflight();
  });
});
elements.riskConfirm.addEventListener("change", updatePreflight);
elements.cleanButton.addEventListener("click", createCleanedCopy);
elements.downloadButton.addEventListener("click", downloadResult);
elements.feedbackYes.addEventListener("click", () => {
  trackEvent("feedback_helpful");
  elements.feedbackForm.hidden = true;
  elements.feedbackYes.classList.add("selected");
  elements.feedbackNo.classList.remove("selected");
});
elements.feedbackNo.addEventListener("click", () => {
  trackEvent("feedback_not_helpful");
  elements.feedbackNo.classList.add("selected");
  elements.feedbackYes.classList.remove("selected");
  showTextFeedback();
});
elements.feedbackForm.addEventListener("submit", submitTextFeedback);
