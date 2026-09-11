/**
 * GPX (GPS Exchange Format) to GeoJSON (RFC 7946) Parser and Converter.
 *
 * Converts Garmin, Strava, Komoot, and Apple Watch GPX 1.0 & 1.1 XML tracks,
 * routes, and waypoints into clean, standard GeoJSON FeatureCollections in-browser.
 */

export interface GpxMetadata {
	name?: string;
	desc?: string;
	author?: string;
	time?: string;
	link?: string;
}

export interface GeoJsonPointGeometry {
	type: "Point";
	coordinates: [number, number] | [number, number, number];
}

export interface GeoJsonLineStringGeometry {
	type: "LineString";
	coordinates: ([number, number] | [number, number, number])[];
}

export interface GeoJsonMultiLineStringGeometry {
	type: "MultiLineString";
	coordinates: ([number, number] | [number, number, number])[][];
}

export interface GeoJsonFeature {
	type: "Feature";
	geometry:
		| GeoJsonPointGeometry
		| GeoJsonLineStringGeometry
		| GeoJsonMultiLineStringGeometry;
	properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
	type: "FeatureCollection";
	metadata?: GpxMetadata;
	features: GeoJsonFeature[];
}

/**
 * Calculates great-circle distance between two points in meters using the Haversine formula.
 */
function haversineDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371000; // Earth radius in meters
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Extracts inner text of a tag using regex, safely handling CDATA and tags with namespaces.
 */
function extractTagContent(xml: string, tagName: string): string | undefined {
	const pattern = new RegExp(
		`<(?:[\\w-]+:)?${tagName}(?:\\s+[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/(?:[\\w-]+:)?${tagName}>`,
		"i",
	);
	const match = pattern.exec(xml);
	if (!match) return undefined;
	const content = (match[1] ?? match[2] ?? "").trim();
	return content;
}

/**
 * Extracts attributes from an XML element opening tag.
 */
function extractAttribute(
	tagString: string,
	attrName: string,
): string | undefined {
	const pattern = new RegExp(`${attrName}=["']([^"']*)["']`, "i");
	const match = pattern.exec(tagString);
	return match ? match[1] : undefined;
}

interface ParsedGpxPoint {
	lat: number;
	lon: number;
	ele?: number;
	time?: string;
	hr?: number;
	cad?: number;
	name?: string;
	desc?: string;
	sym?: string;
	type?: string;
}

function parsePointTag(
	pointXml: string,
	openTag: string,
): ParsedGpxPoint | null {
	const latStr = extractAttribute(openTag, "lat");
	const lonStr = extractAttribute(openTag, "lon");
	if (!latStr || !lonStr) return null;

	const lat = Number.parseFloat(latStr);
	const lon = Number.parseFloat(lonStr);
	if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

	const eleStr = extractTagContent(pointXml, "ele");
	const ele = eleStr ? Number.parseFloat(eleStr) : undefined;
	const time = extractTagContent(pointXml, "time");
	const name = extractTagContent(pointXml, "name");
	const desc = extractTagContent(pointXml, "desc");
	const sym = extractTagContent(pointXml, "sym");
	const type = extractTagContent(pointXml, "type");

	// Extension metrics (heart rate, cadence)
	const hrStr =
		extractTagContent(pointXml, "hr") ??
		extractTagContent(pointXml, "heartrate");
	const hr = hrStr ? Number.parseInt(hrStr, 10) : undefined;

	const cadStr =
		extractTagContent(pointXml, "cad") ??
		extractTagContent(pointXml, "cadence");
	const cad = cadStr ? Number.parseInt(cadStr, 10) : undefined;

	return {
		lat,
		lon,
		ele: ele !== undefined && !Number.isNaN(ele) ? ele : undefined,
		time,
		hr: hr !== undefined && !Number.isNaN(hr) ? hr : undefined,
		cad: cad !== undefined && !Number.isNaN(cad) ? cad : undefined,
		name,
		desc,
		sym,
		type,
	};
}

/**
 * Parses a GPX XML string into a standard GeoJSON FeatureCollection.
 */
export function parseGpxToGeoJson(
	gpxContent: string,
): GeoJsonFeatureCollection {
	if (!gpxContent?.includes("<gpx")) {
		throw new Error("Invalid GPX file: Missing root <gpx> element.");
	}

	const features: GeoJsonFeature[] = [];

	// Extract metadata
	const metadataMatch = /<metadata>([\s\S]*?)<\/metadata>/i.exec(gpxContent);
	const metadataXml = metadataMatch ? metadataMatch[1] : "";
	const metadata: GpxMetadata = {};
	if (metadataXml) {
		const metaName = extractTagContent(metadataXml, "name");
		if (metaName) metadata.name = metaName;
		const metaDesc = extractTagContent(metadataXml, "desc");
		if (metaDesc) metadata.desc = metaDesc;
		const metaTime = extractTagContent(metadataXml, "time");
		if (metaTime) metadata.time = metaTime;
		const metaAuthor =
			extractTagContent(metadataXml, "author") ??
			extractTagContent(metadataXml, "creator");
		if (metaAuthor) metadata.author = metaAuthor;
	}

	// 1. Parse Waypoints (<wpt>)
	const wptRegex = /<wpt(\s+[^>]*)>([\s\S]*?)<\/wpt>/gi;
	let match: RegExpExecArray | null = null;
	while (true) {
		match = wptRegex.exec(gpxContent);
		if (!match) break;
		const openTag = match[1] ?? "";
		const body = match[2] ?? "";
		const pt = parsePointTag(body, `<wpt ${openTag}>`);
		if (pt) {
			const coords: [number, number] | [number, number, number] =
				pt.ele !== undefined ? [pt.lon, pt.lat, pt.ele] : [pt.lon, pt.lat];

			const properties: Record<string, unknown> = {
				featureType: "waypoint",
			};
			if (pt.name) properties.name = pt.name;
			if (pt.desc) properties.description = pt.desc;
			if (pt.time) properties.time = pt.time;
			if (pt.ele !== undefined) properties.elevation = pt.ele;
			if (pt.sym) properties.symbol = pt.sym;
			if (pt.type) properties.type = pt.type;

			features.push({
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: coords,
				},
				properties,
			});
		}
	}

	// 2. Parse Routes (<rte>)
	const rteRegex = /<rte(?:\s+[^>]*)?>([\s\S]*?)<\/rte>/gi;
	while (true) {
		match = rteRegex.exec(gpxContent);
		if (!match) break;
		const rteBody = match[1] ?? "";
		const rteName = extractTagContent(rteBody, "name");
		const rteDesc = extractTagContent(rteBody, "desc");
		const rteType = extractTagContent(rteBody, "type");

		const rteptRegex = /<rtept(\s+[^>]*)>([\s\S]*?)<\/rtept>/gi;
		const routeCoords: ([number, number] | [number, number, number])[] = [];
		let ptMatch: RegExpExecArray | null = null;

		while (true) {
			ptMatch = rteptRegex.exec(rteBody);
			if (!ptMatch) break;
			const openTag = ptMatch[1] ?? "";
			const ptBody = ptMatch[2] ?? "";
			const pt = parsePointTag(ptBody, `<rtept ${openTag}>`);
			if (pt) {
				const coords: [number, number] | [number, number, number] =
					pt.ele !== undefined ? [pt.lon, pt.lat, pt.ele] : [pt.lon, pt.lat];
				routeCoords.push(coords);
			}
		}

		if (routeCoords.length > 0) {
			const properties: Record<string, unknown> = {
				featureType: "route",
				pointCount: routeCoords.length,
			};
			if (rteName) properties.name = rteName;
			if (rteDesc) properties.description = rteDesc;
			if (rteType) properties.type = rteType;

			features.push({
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: routeCoords,
				},
				properties,
			});
		}
	}

	// 3. Parse Tracks (<trk>)
	const trkRegex = /<trk(?:\s+[^>]*)?>([\s\S]*?)<\/trk>/gi;
	while (true) {
		match = trkRegex.exec(gpxContent);
		if (!match) break;
		const trkBody = match[1] ?? "";
		const trkName = extractTagContent(trkBody, "name");
		const trkDesc = extractTagContent(trkBody, "desc");
		const trkType = extractTagContent(trkBody, "type");

		// Segments in track
		const segRegex = /<trkseg(?:\s+[^>]*)?>([\s\S]*?)<\/trkseg>/gi;
		const segments: ([number, number] | [number, number, number])[][] = [];

		let totalDistance = 0;
		let totalElevationGain = 0;
		let totalElevationLoss = 0;
		let minEle = Number.POSITIVE_INFINITY;
		let maxEle = Number.NEGATIVE_INFINITY;
		let totalHr = 0;
		let hrCount = 0;
		let startTime: string | undefined;
		let endTime: string | undefined;
		let totalPoints = 0;

		let segMatch: RegExpExecArray | null = null;
		while (true) {
			segMatch = segRegex.exec(trkBody);
			if (!segMatch) break;
			const segBody = segMatch[1] ?? "";

			const trkptRegex = /<trkpt(\s+[^>]*)>([\s\S]*?)<\/trkpt>/gi;
			const segCoords: ([number, number] | [number, number, number])[] = [];
			let lastPoint: ParsedGpxPoint | null = null;
			let ptMatch: RegExpExecArray | null = null;

			while (true) {
				ptMatch = trkptRegex.exec(segBody);
				if (!ptMatch) break;
				const openTag = ptMatch[1] ?? "";
				const ptBody = ptMatch[2] ?? "";
				const pt = parsePointTag(ptBody, `<trkpt ${openTag}>`);
				if (!pt) continue;

				totalPoints++;
				if (!startTime && pt.time) startTime = pt.time;
				if (pt.time) endTime = pt.time;

				if (pt.ele !== undefined) {
					minEle = Math.min(minEle, pt.ele);
					maxEle = Math.max(maxEle, pt.ele);
					if (lastPoint && lastPoint.ele !== undefined) {
						const diff = pt.ele - lastPoint.ele;
						if (diff > 0) totalElevationGain += diff;
						else totalElevationLoss += Math.abs(diff);
					}
				}

				if (pt.hr !== undefined) {
					totalHr += pt.hr;
					hrCount++;
				}

				if (lastPoint) {
					totalDistance += haversineDistance(
						lastPoint.lat,
						lastPoint.lon,
						pt.lat,
						pt.lon,
					);
				}

				lastPoint = pt;
				const coords: [number, number] | [number, number, number] =
					pt.ele !== undefined ? [pt.lon, pt.lat, pt.ele] : [pt.lon, pt.lat];
				segCoords.push(coords);
			}

			if (segCoords.length > 0) {
				segments.push(segCoords);
			}
		}

		if (segments.length > 0) {
			const properties: Record<string, unknown> = {
				featureType: "track",
				pointCount: totalPoints,
				distanceMeters: Math.round(totalDistance * 10) / 10,
			};
			if (trkName) properties.name = trkName;
			if (trkDesc) properties.description = trkDesc;
			if (trkType) properties.type = trkType;
			if (startTime) properties.startTime = startTime;
			if (endTime) properties.endTime = endTime;

			if (Number.isFinite(minEle)) properties.elevationMinMeters = minEle;
			if (Number.isFinite(maxEle)) properties.elevationMaxMeters = maxEle;
			if (totalElevationGain > 0) {
				properties.elevationGainMeters =
					Math.round(totalElevationGain * 10) / 10;
			}
			if (totalElevationLoss > 0) {
				properties.elevationLossMeters =
					Math.round(totalElevationLoss * 10) / 10;
			}
			if (hrCount > 0) {
				properties.avgHeartRateBpm = Math.round(totalHr / hrCount);
			}

			if (startTime && endTime) {
				const startMs = Date.parse(startTime);
				const endMs = Date.parse(endTime);
				if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
					const durationSec = Math.round((endMs - startMs) / 1000);
					properties.durationSeconds = durationSec;
					if (durationSec > 0 && totalDistance > 0) {
						const speedKmh = (totalDistance / durationSec) * 3.6;
						properties.avgSpeedKmh = Math.round(speedKmh * 10) / 10;
					}
				}
			}

			if (segments.length === 1) {
				features.push({
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: segments[0] ?? [],
					},
					properties,
				});
			} else {
				features.push({
					type: "Feature",
					geometry: {
						type: "MultiLineString",
						coordinates: segments,
					},
					properties,
				});
			}
		}
	}

	return {
		type: "FeatureCollection",
		...(Object.keys(metadata).length > 0 ? { metadata } : {}),
		features,
	};
}

/**
 * Converts a GPX buffer into GeoJSON ArrayBuffer.
 */
export function convertGpxToGeoJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading GPX GPS track XML");
	const decoder = new TextDecoder("utf-8");
	const text = decoder.decode(input);

	onProgress?.(0.5, "Parsing waypoints, routes & track telemetry");
	const geojson = parseGpxToGeoJson(text);

	onProgress?.(0.9, "Serializing RFC 7946 GeoJSON");
	const jsonString = JSON.stringify(geojson, null, 2);
	const encoded = new TextEncoder().encode(jsonString);

	return encoded.buffer.slice(
		encoded.byteOffset,
		encoded.byteOffset + encoded.byteLength,
	) as ArrayBuffer;
}
