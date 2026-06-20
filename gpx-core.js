const GPX_NAMESPACES = new Set([
  "http://www.topografix.com/GPX/1/0",
  "http://www.topografix.com/GPX/1/1",
]);

const SPORTS_EXTENSION_NAMES = new Set([
  "hr",
  "heartrate",
  "cad",
  "cadence",
  "power",
  "watts",
  "atemp",
  "wtemp",
  "temp",
  "temperature",
]);

const DEVICE_EXTENSION_NAMES = new Set([
  "device",
  "deviceinfo",
  "devicename",
  "displayname",
  "model",
  "productid",
  "serialnumber",
]);

const KNOWN_EXTENSION_WRAPPERS = new Set([
  "trackpointextension",
  "routepointextension",
  "waypointextension",
  "gpxtpx",
  "extensions",
]);

export class GpxError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GpxError";
    this.code = code;
  }
}

function localName(node) {
  return (node.localName || node.nodeName || "").split(":").pop().toLowerCase();
}

function elementChildren(node) {
  return Array.from(node.childNodes || []).filter((child) => child.nodeType === 1);
}

function allElements(root) {
  const descendants = Array.from(root.getElementsByTagName("*"));
  if (!root.documentElement || descendants.includes(root.documentElement)) return descendants;
  return [root.documentElement, ...descendants];
}

function elementsNamed(root, name) {
  const wanted = name.toLowerCase();
  return allElements(root).filter((element) => localName(element) === wanted);
}

function descendantsNamed(root, name) {
  const wanted = name.toLowerCase();
  return Array.from(root.getElementsByTagName("*")).filter(
    (element) => localName(element) === wanted,
  );
}

function isInsideExtensions(element) {
  let current = element.parentNode;
  while (current && current.nodeType === 1) {
    if (localName(current) === "extensions") return true;
    current = current.parentNode;
  }
  return false;
}

function parseCoordinate(point, attribute) {
  if (!point) return null;
  const value = Number.parseFloat(point.getAttribute(attribute));
  return Number.isFinite(value) ? value : null;
}

function pointCoordinates(point) {
  const lat = parseCoordinate(point, "lat");
  const lon = parseCoordinate(point, "lon");
  return lat === null || lon === null ? null : { lat, lon };
}

export function haversineMeters(first, second) {
  if (!first || !second) return 0;
  const radius = 6371008.8;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = radians(second.lat - first.lat);
  const deltaLon = radians(second.lon - first.lon);
  const lat1 = radians(first.lat);
  const lat2 = radians(second.lat);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pathDistance(points) {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += haversineMeters(
      pointCoordinates(points[index - 1]),
      pointCoordinates(points[index]),
    );
  }
  return distance;
}

function collectPaths(document) {
  const paths = [];

  for (const track of elementsNamed(document, "trk")) {
    const segments = elementChildren(track).filter((child) => localName(child) === "trkseg");
    const points = segments.flatMap((segment) =>
      elementChildren(segment).filter((child) => localName(child) === "trkpt"),
    );
    paths.push({ type: "track", element: track, points });
  }

  for (const route of elementsNamed(document, "rte")) {
    const points = elementChildren(route).filter((child) => localName(child) === "rtept");
    paths.push({ type: "route", element: route, points });
  }

  return paths;
}

function extensionSummary(document) {
  let sportsCount = 0;
  let deviceCount = 0;
  const unknownNames = new Set();

  for (const container of elementsNamed(document, "extensions")) {
    for (const element of Array.from(container.getElementsByTagName("*"))) {
      const name = localName(element);
      if (SPORTS_EXTENSION_NAMES.has(name)) {
        sportsCount += 1;
        continue;
      }
      if (DEVICE_EXTENSION_NAMES.has(name)) {
        deviceCount += 1;
        continue;
      }
      if (elementChildren(element).length === 0 && !KNOWN_EXTENSION_WRAPPERS.has(name)) {
        unknownNames.add(name || "unnamed");
      }
    }
  }

  return {
    sportsCount,
    deviceCount,
    unknownCount: unknownNames.size,
    unknownNames: Array.from(unknownNames).sort(),
  };
}

function metadataSummary(document) {
  const metadata = elementsNamed(document, "metadata")[0] || null;
  const hasAuthor = metadata ? descendantsNamed(metadata, "author").length > 0 : false;
  const hasEmail = metadata ? descendantsNamed(metadata, "email").length > 0 : false;
  const hasCopyright = metadata ? descendantsNamed(metadata, "copyright").length > 0 : false;
  const root = document.documentElement;
  const hasCreator = Boolean(root?.getAttribute("creator"));
  return { hasAuthor, hasEmail, hasCopyright, hasCreator };
}

export function parseGpx(xmlText, environment = globalThis) {
  if (typeof xmlText !== "string" || !xmlText.trim()) {
    throw new GpxError("empty_file", "The selected file is empty.");
  }
  if (typeof environment.DOMParser !== "function") {
    throw new GpxError("parser_unavailable", "XML parsing is not available in this browser.");
  }

  const parserMessages = [];
  const parser = new environment.DOMParser({
    errorHandler: {
      warning: (message) => parserMessages.push(message),
      error: (message) => parserMessages.push(message),
      fatalError: (message) => parserMessages.push(message),
    },
  });
  const document = parser.parseFromString(xmlText, "application/xml");
  const parserErrors = elementsNamed(document, "parsererror");

  if (!document?.documentElement || parserErrors.length > 0 || parserMessages.length > 0) {
    throw new GpxError("invalid_xml", "This file contains damaged or incomplete XML.");
  }
  if (localName(document.documentElement) !== "gpx") {
    throw new GpxError("not_gpx", "This XML file is not a GPX document.");
  }

  const version = document.documentElement.getAttribute("version") || "";
  const namespace = document.documentElement.namespaceURI || "";
  if (!GPX_NAMESPACES.has(namespace) && version !== "1.0" && version !== "1.1") {
    throw new GpxError("unsupported_gpx", "Only GPX 1.0 and GPX 1.1 files are supported.");
  }

  return document;
}

export function scanGpx(document) {
  const root = document.documentElement;
  const paths = collectPaths(document);
  const trackPoints = elementsNamed(document, "trkpt");
  const routePoints = elementsNamed(document, "rtept");
  const times = elementsNamed(document, "time");
  const elevations = elementsNamed(document, "ele");
  const waypoints = elementsNamed(document, "wpt");
  const extensions = extensionSummary(document);
  const metadata = metadataSummary(document);

  const pathSummaries = paths.map((path) => {
    const start = pointCoordinates(path.points[0]);
    const end = pointCoordinates(path.points[path.points.length - 1]);
    const startEndDistanceMeters =
      path.points.length > 1 ? haversineMeters(start, end) : null;
    return {
      type: path.type,
      pointCount: path.points.length,
      distanceMeters: pathDistance(path.points),
      startEndDistanceMeters,
      startEndClose:
        startEndDistanceMeters !== null && startEndDistanceMeters <= 200,
    };
  });

  return {
    version: root.getAttribute("version") || "unknown",
    namespace: root.namespaceURI || "",
    trackCount: elementsNamed(document, "trk").length,
    segmentCount: elementsNamed(document, "trkseg").length,
    routeCount: elementsNamed(document, "rte").length,
    waypointCount: waypoints.length,
    trackPointCount: trackPoints.length,
    routePointCount: routePoints.length,
    totalPathPointCount: trackPoints.length + routePoints.length,
    timeCount: times.length,
    elevationCount: elevations.length,
    hasTime: times.length > 0,
    hasElevation: elevations.length > 0,
    extensions,
    metadata: { ...metadata, hasDevice: extensions.deviceCount > 0 },
    hasPersonalMetadata:
      metadata.hasAuthor ||
      metadata.hasEmail ||
      metadata.hasCopyright ||
      metadata.hasCreator ||
      extensions.deviceCount > 0,
    paths: pathSummaries,
    hasCloseStartEnd: pathSummaries.some((path) => path.startEndClose),
  };
}

function removeElements(elements) {
  let removed = 0;
  for (const element of elements) {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
      removed += 1;
    }
  }
  return removed;
}

function removeNamed(document, name) {
  return removeElements(elementsNamed(document, name));
}

function removeExtensionNames(document, names) {
  const matches = [];
  for (const container of elementsNamed(document, "extensions")) {
    for (const element of Array.from(container.getElementsByTagName("*"))) {
      if (names.has(localName(element))) matches.push(element);
    }
  }
  const removed = removeElements(matches);
  removeEmptyKnownExtensionWrappers(document);
  return removed;
}

function removeEmptyKnownExtensionWrappers(document) {
  let changed = true;
  while (changed) {
    changed = false;
    const candidates = allElements(document).reverse();
    for (const element of candidates) {
      const name = localName(element);
      if (
        name !== "extensions" &&
        KNOWN_EXTENSION_WRAPPERS.has(name) &&
        elementChildren(element).length === 0 &&
        !(element.textContent || "").trim() &&
        isInsideExtensions(element)
      ) {
        element.parentNode?.removeChild(element);
        changed = true;
      }
    }
  }
}

function removePersonalMetadata(document) {
  let removed = 0;
  for (const metadata of elementsNamed(document, "metadata")) {
    const matches = Array.from(metadata.getElementsByTagName("*")).filter((element) =>
      new Set(["author", "email", "copyright"]).has(localName(element)),
    );
    removed += removeElements(matches);
  }
  if (document.documentElement.hasAttribute("creator")) {
    document.documentElement.removeAttribute("creator");
    removed += 1;
  }
  removed += removeExtensionNames(document, DEVICE_EXTENSION_NAMES);
  return removed;
}

function trimPathPoints(points, startMeters, endMeters) {
  const remove = new Set();

  if (startMeters > 0 && points.length > 0) {
    let cumulative = 0;
    remove.add(points[0]);
    for (let index = 1; index < points.length; index += 1) {
      cumulative += haversineMeters(
        pointCoordinates(points[index - 1]),
        pointCoordinates(points[index]),
      );
      if (cumulative < startMeters) remove.add(points[index]);
      else break;
    }
  }

  if (endMeters > 0 && points.length > 0) {
    let cumulative = 0;
    remove.add(points[points.length - 1]);
    for (let index = points.length - 2; index >= 0; index -= 1) {
      cumulative += haversineMeters(
        pointCoordinates(points[index + 1]),
        pointCoordinates(points[index]),
      );
      if (cumulative < endMeters) remove.add(points[index]);
      else break;
    }
  }

  removeElements(Array.from(remove));
  return remove.size;
}

function trimPaths(document, startMeters, endMeters) {
  const changes = [];
  for (const path of collectPaths(document)) {
    const originalCount = path.points.length;
    const removedCount = trimPathPoints(path.points, startMeters, endMeters);
    const remainingPoints = path.points.filter((point) => point.parentNode);
    changes.push({
      type: path.type,
      originalCount,
      removedCount,
      remainingCount: remainingPoints.length,
      remainingDistanceMeters: pathDistance(remainingPoints),
    });
  }
  return changes;
}

function reduceCoordinatePrecision(document, decimals) {
  if (!Number.isInteger(decimals)) return 0;
  let changed = 0;
  const points = [
    ...elementsNamed(document, "trkpt"),
    ...elementsNamed(document, "rtept"),
    ...elementsNamed(document, "wpt"),
  ];
  for (const point of points) {
    for (const attribute of ["lat", "lon"]) {
      const value = Number.parseFloat(point.getAttribute(attribute));
      if (Number.isFinite(value)) {
        point.setAttribute(attribute, value.toFixed(decimals));
        changed += 1;
      }
    }
  }
  return changed;
}

function cloneDocument(document, environment) {
  const serializer = new environment.XMLSerializer();
  return parseGpx(serializer.serializeToString(document), environment);
}

function normalizedOptions(options = {}) {
  const meters = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const decimals = Number(options.coordinateDecimals);
  return {
    removeTimes: Boolean(options.removeTimes),
    removeElevation: Boolean(options.removeElevation),
    removeSportsExtensions: Boolean(options.removeSportsExtensions),
    removePersonalMetadata: Boolean(options.removePersonalMetadata),
    removeWaypoints: Boolean(options.removeWaypoints),
    removeAllExtensions: Boolean(options.removeAllExtensions),
    trimStartMeters: meters(options.trimStartMeters),
    trimEndMeters: meters(options.trimEndMeters),
    coordinateDecimals: [3, 4, 5].includes(decimals) ? decimals : null,
  };
}

function applyScrub(document, options) {
  const removed = {
    times: options.removeTimes ? removeNamed(document, "time") : 0,
    elevations: options.removeElevation ? removeNamed(document, "ele") : 0,
    sportsExtensions:
      options.removeSportsExtensions && !options.removeAllExtensions
        ? removeExtensionNames(document, SPORTS_EXTENSION_NAMES)
        : 0,
    personalMetadata: options.removePersonalMetadata
      ? removePersonalMetadata(document)
      : 0,
    waypoints: options.removeWaypoints ? removeNamed(document, "wpt") : 0,
    extensionContainers: options.removeAllExtensions
      ? removeNamed(document, "extensions")
      : 0,
    coordinateValues: reduceCoordinatePrecision(document, options.coordinateDecimals),
  };
  const pathChanges = trimPaths(
    document,
    options.trimStartMeters,
    options.trimEndMeters,
  );
  removed.pathPoints = pathChanges.reduce((sum, path) => sum + path.removedCount, 0);
  return { removed, pathChanges };
}

function riskAssessment(pathChanges, options) {
  if (options.trimStartMeters === 0 && options.trimEndMeters === 0) {
    return { highRisk: false, warnings: [] };
  }
  const warnings = [];
  let highRisk = false;
  for (const path of pathChanges) {
    if (path.originalCount === 0) continue;
    const removedRatio = path.removedCount / path.originalCount;
    if (path.remainingCount === 0) {
      warnings.push(`A ${path.type} would have no points left after trimming.`);
      highRisk = true;
    } else if (path.remainingCount < 2 || removedRatio >= 0.75) {
      warnings.push(`A ${path.type} would lose most of its usable track points.`);
      highRisk = true;
    } else if (removedRatio >= 0.5) {
      warnings.push(`A ${path.type} would lose at least half of its track points.`);
    }
  }
  return { highRisk, warnings: Array.from(new Set(warnings)) };
}

function selectedCategories(options) {
  const categories = [];
  if (options.removeTimes) categories.push("timestamps");
  if (options.removeElevation) categories.push("elevation");
  if (options.removeSportsExtensions) categories.push("activity_extensions");
  if (options.removePersonalMetadata) categories.push("personal_metadata");
  if (options.removeWaypoints) categories.push("waypoints");
  if (options.removeAllExtensions) categories.push("all_extensions");
  if (options.trimStartMeters > 0) categories.push("start_trim");
  if (options.trimEndMeters > 0) categories.push("end_trim");
  if (options.coordinateDecimals !== null) categories.push("coordinate_precision");
  return categories;
}

export function planScrub(document, rawOptions, environment = globalThis) {
  const options = normalizedOptions(rawOptions);
  const clone = cloneDocument(document, environment);
  const before = scanGpx(clone);
  const changes = applyScrub(clone, options);
  const after = scanGpx(clone);
  const risk = riskAssessment(changes.pathChanges, options);
  return {
    options,
    categories: selectedCategories(options),
    before,
    after,
    ...changes,
    ...risk,
  };
}

export function scrubGpx(document, rawOptions, environment = globalThis) {
  const options = normalizedOptions(rawOptions);
  const clone = cloneDocument(document, environment);
  const before = scanGpx(clone);
  const changes = applyScrub(clone, options);
  const after = scanGpx(clone);
  const risk = riskAssessment(changes.pathChanges, options);
  const serializer = new environment.XMLSerializer();
  const body = serializer.serializeToString(clone);
  const xml = body.startsWith("<?xml")
    ? body
    : `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
  return {
    xml,
    options,
    categories: selectedCategories(options),
    before,
    after,
    ...changes,
    ...risk,
  };
}

export const extensionNames = Object.freeze({
  sports: Array.from(SPORTS_EXTENSION_NAMES),
  device: Array.from(DEVICE_EXTENSION_NAMES),
});
