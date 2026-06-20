import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { GpxError, parseGpx, planScrub, scanGpx, scrubGpx } from "../gpx-core.js";

const environment = { DOMParser, XMLSerializer };

async function fixture(name) {
  return readFile(new URL(`fixtures/${name}`, import.meta.url), "utf8");
}

async function documentFrom(name) {
  return parseGpx(await fixture(name), environment);
}

test("parses GPX 1.1 with multiple track segments without merging them", async () => {
  const document = await documentFrom("gpx11-garmin-multi.gpx");
  const scan = scanGpx(document);
  assert.equal(scan.version, "1.1");
  assert.equal(scan.trackCount, 1);
  assert.equal(scan.segmentCount, 2);
  assert.equal(scan.trackPointCount, 8);
  assert.equal(scan.waypointCount, 1);
});

test("parses a GPX 1.0 route with no track", async () => {
  const scan = scanGpx(await documentFrom("gpx10-route.gpx"));
  assert.equal(scan.version, "1.0");
  assert.equal(scan.trackCount, 0);
  assert.equal(scan.routeCount, 1);
  assert.equal(scan.routePointCount, 5);
});

test("detects timestamps, elevation, personal details, waypoints and Garmin fields", async () => {
  const scan = scanGpx(await documentFrom("gpx11-garmin-multi.gpx"));
  assert.equal(scan.hasTime, true);
  assert.equal(scan.hasElevation, true);
  assert.equal(scan.hasPersonalMetadata, true);
  assert.ok(scan.extensions.sportsCount >= 4);
  assert.equal(scan.extensions.unknownCount, 1);
});

test("detects common Strava and Garmin sport extension fields", async () => {
  const scan = scanGpx(await documentFrom("gpx11-strava-fields.gpx"));
  assert.equal(scan.extensions.sportsCount, 4);
  assert.equal(scan.extensions.unknownCount, 0);
});

test("reports files without timestamps or elevation as clear", async () => {
  const scan = scanGpx(await documentFrom("gpx11-minimal.gpx"));
  assert.equal(scan.hasTime, false);
  assert.equal(scan.hasElevation, false);
});

test("removes selected sensitive categories and preserves unknown extensions", async () => {
  const document = await documentFrom("gpx11-garmin-multi.gpx");
  const result = scrubGpx(
    document,
    {
      removeTimes: true,
      removeElevation: true,
      removeSportsExtensions: true,
      removePersonalMetadata: true,
      removeWaypoints: true,
    },
    environment,
  );
  assert.equal(result.after.timeCount, 0);
  assert.equal(result.after.elevationCount, 0);
  assert.equal(result.after.extensions.sportsCount, 0);
  assert.equal(result.after.hasPersonalMetadata, false);
  assert.equal(result.after.waypointCount, 0);
  assert.equal(result.after.extensions.unknownCount, 1);
  assert.match(result.xml, /privateScore/);
});

test("removes all extensions only when explicitly selected", async () => {
  const document = await documentFrom("gpx11-garmin-multi.gpx");
  const result = scrubGpx(document, { removeAllExtensions: true }, environment);
  assert.equal(result.after.extensions.sportsCount, 0);
  assert.equal(result.after.extensions.unknownCount, 0);
  assert.doesNotMatch(result.xml, /<extensions[ >]/);
});

test("trims by cumulative path distance across multiple segments and keeps segment elements", async () => {
  const document = await documentFrom("gpx11-garmin-multi.gpx");
  const result = scrubGpx(
    document,
    { trimStartMeters: 200, trimEndMeters: 200 },
    environment,
  );
  assert.ok(result.removed.pathPoints >= 4);
  assert.equal(result.after.segmentCount, 2);
  assert.equal(result.after.trackCount, 1);
  assert.ok(result.after.trackPointCount > 0);
});

test("trims route points using route order", async () => {
  const document = await documentFrom("gpx10-route.gpx");
  const result = scrubGpx(document, { trimStartMeters: 150 }, environment);
  assert.equal(result.after.routeCount, 1);
  assert.ok(result.after.routePointCount < 5);
  assert.equal(result.after.trackPointCount, 0);
});

test("warns and requires confirmation when trimming removes an extremely short track", async () => {
  const document = await documentFrom("gpx11-short.gpx");
  const plan = planScrub(
    document,
    { trimStartMeters: 200, trimEndMeters: 200 },
    environment,
  );
  assert.equal(plan.after.trackPointCount, 0);
  assert.equal(plan.highRisk, true);
  assert.ok(plan.warnings.length > 0);
});

test("rounds coordinates while retaining GPX structure", async () => {
  const result = scrubGpx(
    await documentFrom("gpx11-minimal.gpx"),
    { coordinateDecimals: 3 },
    environment,
  );
  assert.match(result.xml, /lat="48\.100"/);
  assert.equal(result.after.segmentCount, 1);
});

test("rejects damaged or incomplete XML", async () => {
  const xml = await fixture("broken.gpx");
  assert.throws(
    () => parseGpx(xml, environment),
    (error) => error instanceof GpxError && error.code === "invalid_xml",
  );
});

test("rejects non-GPX XML", () => {
  assert.throws(
    () => parseGpx("<root><point/></root>", environment),
    (error) => error instanceof GpxError && error.code === "not_gpx",
  );
});

test("does not mutate the original document", async () => {
  const document = await documentFrom("gpx11-garmin-multi.gpx");
  const before = scanGpx(document);
  scrubGpx(document, { removeTimes: true, removeWaypoints: true }, environment);
  const after = scanGpx(document);
  assert.deepEqual(after, before);
});
