import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

test("analytics sends only allow-listed fixed event fields", async () => {
  const dom = new JSDOM('<meta name="analytics-endpoint" content="https://stats.example/count">');
  const requests = [];
  class TestImage {
    set src(value) {
      requests.push(value);
    }
  }
  dom.window.Image = TestImage;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  const analytics = await import(
    new URL(`../analytics.js?analytics-test=${Date.now()}`, import.meta.url)
  );
  analytics.trackEvent("parse_success");
  analytics.trackEvent("not_allowed");
  analytics.trackSelectedCategories(["timestamps", "not_allowed"]);
  assert.equal(analytics.sourceEventForSearch("?source=gpxlab"), "source_gpxlab");
  assert.equal(analytics.sourceEventForSearch("?source=reddit"), "source_reddit");
  assert.equal(analytics.sourceEventForSearch("?source=unknown"), null);
  assert.equal(analytics.sourceEventForSearch(""), null);
  analytics.trackSource("?source=gpxlab&private=must-not-be-sent");
  analytics.trackSource("?source=reddit");

  assert.equal(requests.length, 3);
  for (const request of requests) {
    const url = new URL(request);
    assert.deepEqual(Array.from(url.searchParams.keys()).sort(), ["e", "p", "rnd", "t"]);
    assert.equal(url.searchParams.get("e"), "1");
    assert.equal(url.searchParams.get("p"), url.searchParams.get("t"));
  }
  assert.equal(new URL(requests[0]).searchParams.get("p"), "parse_success");
  assert.equal(new URL(requests[1]).searchParams.get("p"), "scrub_option_timestamps");
  assert.equal(new URL(requests[2]).searchParams.get("p"), "source_gpxlab");
  assert.doesNotMatch(requests[2], /private|must-not-be-sent|reddit/);
});
