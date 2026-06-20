import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(message);
}

function dropFile(window, target, file) {
  const event = new window.Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files: [file] } });
  target.dispatchEvent(event);
}

test("page flow scans, cleans and protects extremely short tracks", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const dom = new JSDOM(html, {
    url: "http://localhost:4173/",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.open = () => null;
  window.URL.createObjectURL = () => "blob:test-cleaned-gpx";
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = () => {};

  Object.assign(globalThis, {
    window,
    document: window.document,
    DOMParser: window.DOMParser,
    XMLSerializer: window.XMLSerializer,
    Blob: window.Blob,
    URL: window.URL,
  });

  await import(new URL(`../app.js?ui-test=${Date.now()}`, import.meta.url));

  const fullXml = await readFile(
    new URL("fixtures/gpx11-garmin-multi.gpx", import.meta.url),
    "utf8",
  );
  dropFile(window, document.querySelector("#drop-zone"), {
    size: fullXml.length,
    text: async () => fullXml,
  });

  await waitFor(
    () => !document.querySelector("#workspace").hidden,
    "Workspace did not open after a valid GPX file.",
  );
  assert.match(document.querySelector("#file-status").textContent, /parsed successfully/i);
  assert.equal(document.querySelectorAll(".scan-card").length, 8);
  assert.equal(document.querySelector('[name="removeTimes"]').checked, true);
  assert.equal(document.querySelector('[name="removeAllExtensions"]').checked, false);

  document.querySelector("#clean-button").click();
  assert.equal(document.querySelector("#result-stage").hidden, false);
  assert.match(document.querySelector("#comparison").textContent, /Time fields/);
  assert.equal(document.querySelector("#feedback-stage").hidden, false);

  const shortXml = await readFile(
    new URL("fixtures/gpx11-short.gpx", import.meta.url),
    "utf8",
  );
  dropFile(window, document.querySelector("#drop-zone"), {
    size: shortXml.length,
    text: async () => shortXml,
  });
  await waitFor(
    () => document.querySelector("#file-status").textContent.includes("2 path points"),
    "Short GPX file was not scanned.",
  );

  const trimStart = document.querySelector("#trim-start");
  trimStart.value = "200";
  trimStart.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(document.querySelector("#risk-confirm-wrap").hidden, false);
  assert.equal(document.querySelector("#clean-button").disabled, true);
  assert.match(document.querySelector("#preflight").textContent, /no points left/i);

  const riskConfirm = document.querySelector("#risk-confirm");
  riskConfirm.checked = true;
  riskConfirm.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(document.querySelector("#clean-button").disabled, false);
});
