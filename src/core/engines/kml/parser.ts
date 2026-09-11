/**
 * KML (Keyhole Markup Language) to GeoJSON (RFC 7946) Parser and Converter.
 *
 * Converts Google Earth and Google Maps KML 2.0, 2.1, and 2.2 XML placemarks,
 * points, line paths, and polygon boundaries into standard RFC 7946 GeoJSON.
 */

export interface GeoJsonPointGeometry {
	type: "Point";
	coordinates: [number, number] | [number, number, number];
}

export interface GeoJsonLineStringGeometry {
	type: "LineString";
	coordinates: ([number, number] | [number, number, number])[];
}

export interface GeoJsonPolygonGeometry {
	type: "Polygon";
	coordinates: ([number, number] | [number, number, number])[][];
}

export interface GeoJsonMultiLineStringGeometry {
	type: "MultiLineString";
	coordinates: ([number, number] | [number, number, number])[][];
}

export interface GeoJsonGeometryCollection {
	type: "GeometryCollection";
	geometries: (
		| GeoJsonPointGeometry
		| GeoJsonLineStringGeometry
		| GeoJsonPolygonGeometry
	)[];
}

export type GeoJsonGeometry =
	| GeoJsonPointGeometry
	| GeoJsonLineStringGeometry
	| GeoJsonPolygonGeometry
	| GeoJsonMultiLineStringGeometry
	| GeoJsonGeometryCollection;

export interface GeoJsonFeature {
	type: "Feature";
	geometry: GeoJsonGeometry;
	properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
	type: "FeatureCollection";
	metadata?: {
		name?: string;
		description?: string;
	};
	features: GeoJsonFeature[];
}

/**
 * Extracts inner text of a tag, handling CDATA and namespaces.
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
 * Parses KML coordinate strings (lon,lat[,alt] separated by whitespace).
 */
function parseCoordinateTuples(
	coordText: string,
): ([number, number] | [number, number, number])[] {
	const items = coordText.trim().split(/\s+/);
	const out: ([number, number] | [number, number, number])[] = [];

	for (const item of items) {
		const parts = item.split(",");
		if (parts.length >= 2) {
			const lon = Number.parseFloat(parts[0] ?? "");
			const lat = Number.parseFloat(parts[1] ?? "");
			if (!Number.isNaN(lon) && !Number.isNaN(lat)) {
				if (parts.length >= 3) {
					const alt = Number.parseFloat(parts[2] ?? "");
					if (!Number.isNaN(alt)) {
						out.push([lon, lat, alt]);
						continue;
					}
				}
				out.push([lon, lat]);
			}
		}
	}

	return out;
}

/**
 * Extracts ExtendedData elements (both <Data name="..."> and <SimpleData name="...">).
 */
function parseExtendedData(xml: string): Record<string, unknown> {
	const properties: Record<string, unknown> = {};

	// Match <Data name="key"><value>val</value></Data>
	const dataRegex =
		/<(?:[\w-]+:)?Data\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:[\w-]+:)?Data>/gi;
	let match: RegExpExecArray | null = null;
	while (true) {
		match = dataRegex.exec(xml);
		if (!match) break;
		const key = match[1] ?? "";
		const body = match[2] ?? "";
		const val = extractTagContent(body, "value") ?? "";
		if (key) properties[key] = val;
	}

	// Match <SimpleData name="key">val</SimpleData>
	const simpleRegex =
		/<(?:[\w-]+:)?SimpleData\s+name=["']([^"']+)["'][^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/(?:[\w-]+:)?SimpleData>/gi;
	while (true) {
		match = simpleRegex.exec(xml);
		if (!match) break;
		const key = match[1] ?? "";
		const val = (match[2] ?? match[3] ?? "").trim();
		if (key) properties[key] = val;
	}

	return properties;
}

/**
 * Parses a KML XML string into a standard RFC 7946 GeoJSON FeatureCollection.
 */
export function parseKmlToGeoJson(
	kmlContent: string,
): GeoJsonFeatureCollection {
	if (!kmlContent?.includes("<kml")) {
		throw new Error("Invalid KML file: Missing root <kml> element.");
	}

	const docName =
		extractTagContent(kmlContent, "name") ??
		extractTagContent(kmlContent, "Document");
	const docDesc = extractTagContent(kmlContent, "description");

	const features: GeoJsonFeature[] = [];

	// Match each <Placemark> block
	const placemarkRegex =
		/<(?:[\w-]+:)?Placemark(?:\s+[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?Placemark>/gi;
	let match: RegExpExecArray | null = null;

	while (true) {
		match = placemarkRegex.exec(kmlContent);
		if (!match) break;
		const pmXml = match[1] ?? "";

		const name = extractTagContent(pmXml, "name");
		const description = extractTagContent(pmXml, "description");
		const styleUrl = extractTagContent(pmXml, "styleUrl");

		// Extract ExtendedData
		const extendedData = parseExtendedData(pmXml);

		const properties: Record<string, unknown> = {
			...extendedData,
		};
		if (name) properties.name = name;
		if (description) properties.description = description;
		if (styleUrl) properties.styleUrl = styleUrl;

		// 1. Point geometry
		const pointXml = extractTagContent(pmXml, "Point");
		if (pointXml) {
			const coordsStr = extractTagContent(pointXml, "coordinates") ?? "";
			const coords = parseCoordinateTuples(coordsStr);
			if (coords.length > 0 && coords[0]) {
				features.push({
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: coords[0],
					},
					properties,
				});
				continue;
			}
		}

		// 2. LineString geometry
		const lineXml = extractTagContent(pmXml, "LineString");
		if (lineXml) {
			const coordsStr = extractTagContent(lineXml, "coordinates") ?? "";
			const coords = parseCoordinateTuples(coordsStr);
			if (coords.length > 0) {
				features.push({
					type: "Feature",
					geometry: {
						type: "LineString",
						coordinates: coords,
					},
					properties,
				});
				continue;
			}
		}

		// 3. Polygon geometry
		const polyXml = extractTagContent(pmXml, "Polygon");
		if (polyXml) {
			const rings: ([number, number] | [number, number, number])[][] = [];

			// Outer boundary
			const outerBoundary = extractTagContent(polyXml, "outerBoundaryIs");
			if (outerBoundary) {
				const outerCoordsStr =
					extractTagContent(outerBoundary, "coordinates") ?? "";
				const outerRing = parseCoordinateTuples(outerCoordsStr);
				if (outerRing.length > 0) {
					rings.push(outerRing);
				}
			}

			// Inner boundaries (holes)
			const innerRegex =
				/<(?:[\w-]+:)?innerBoundaryIs>([\s\S]*?)<\/(?:[\w-]+:)?innerBoundaryIs>/gi;
			let innerMatch: RegExpExecArray | null = null;
			while (true) {
				innerMatch = innerRegex.exec(polyXml);
				if (!innerMatch) break;
				const innerBody = innerMatch[1] ?? "";
				const innerCoordsStr =
					extractTagContent(innerBody, "coordinates") ?? "";
				const innerRing = parseCoordinateTuples(innerCoordsStr);
				if (innerRing.length > 0) {
					rings.push(innerRing);
				}
			}

			if (rings.length > 0) {
				features.push({
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: rings,
					},
					properties,
				});
				continue;
			}
		}

		// 4. MultiGeometry
		const multiXml = extractTagContent(pmXml, "MultiGeometry");
		if (multiXml) {
			const subGeometries: (
				| GeoJsonPointGeometry
				| GeoJsonLineStringGeometry
				| GeoJsonPolygonGeometry
			)[] = [];

			// Sub-Points
			const subPointRegex =
				/<(?:[\w-]+:)?Point(?:\s+[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?Point>/gi;
			let subMatch: RegExpExecArray | null = null;
			while (true) {
				subMatch = subPointRegex.exec(multiXml);
				if (!subMatch) break;
				const subCoordsStr =
					extractTagContent(subMatch[1] ?? "", "coordinates") ?? "";
				const coords = parseCoordinateTuples(subCoordsStr);
				if (coords.length > 0 && coords[0]) {
					subGeometries.push({
						type: "Point",
						coordinates: coords[0],
					});
				}
			}

			// Sub-LineStrings
			const subLineRegex =
				/<(?:[\w-]+:)?LineString(?:\s+[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?LineString>/gi;
			while (true) {
				subMatch = subLineRegex.exec(multiXml);
				if (!subMatch) break;
				const subCoordsStr =
					extractTagContent(subMatch[1] ?? "", "coordinates") ?? "";
				const coords = parseCoordinateTuples(subCoordsStr);
				if (coords.length > 0) {
					subGeometries.push({
						type: "LineString",
						coordinates: coords,
					});
				}
			}

			if (subGeometries.length > 0) {
				features.push({
					type: "Feature",
					geometry: {
						type: "GeometryCollection",
						geometries: subGeometries,
					},
					properties,
				});
			}
		}
	}

	return {
		type: "FeatureCollection",
		...(docName || docDesc
			? {
					metadata: {
						...(docName ? { name: docName } : {}),
						...(docDesc ? { description: docDesc } : {}),
					},
				}
			: {}),
		features,
	};
}

/**
 * Converts a KML buffer into GeoJSON ArrayBuffer.
 */
export function convertKmlToGeoJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading Google Earth KML XML source");
	const decoder = new TextDecoder("utf-8");
	const text = decoder.decode(input);

	onProgress?.(
		0.5,
		"Parsing geographic placemarks, paths & polygon boundaries",
	);
	const geojson = parseKmlToGeoJson(text);

	onProgress?.(0.9, "Serializing RFC 7946 GeoJSON document");
	const jsonString = JSON.stringify(geojson, null, 2);
	const encoded = new TextEncoder().encode(jsonString);

	return encoded.buffer.slice(
		encoded.byteOffset,
		encoded.byteOffset + encoded.byteLength,
	) as ArrayBuffer;
}
