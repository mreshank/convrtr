import type {
	GeoJsonFeature,
	GeoJsonFeatureCollection,
	GeoJsonGeometry,
	GmlConversionOptions,
	GmlConversionResult,
} from "./types";

/**
 * Strips XML namespace prefix (e.g. "gml:Point" -> "Point", "ogr:name" -> "name").
 */
function localName(tag: string): string {
	const colon = tag.indexOf(":");
	return colon >= 0 ? tag.substring(colon + 1) : tag;
}

/**
 * Parses coordinate tuples from GML 2 <coordinates> string.
 * Format: "x1,y1 x2,y2" or "x1,y1,z1 x2,y2,z2" with custom cs/ts delimiters.
 */
function parseGmlCoordinates(text: string, cs = ",", ts = " "): number[][] {
	const clean = text.trim();
	if (!clean) return [];

	// Split tuples by ts (or whitespace if ts is space)
	const tuples = ts === " " ? clean.split(/\s+/) : clean.split(ts);
	const coords: number[][] = [];

	for (const t of tuples) {
		const trimmed = t.trim();
		if (!trimmed) continue;
		const parts = trimmed.split(cs).map((p) => Number(p.trim()));
		if (
			parts.length >= 2 &&
			!Number.isNaN(parts[0]) &&
			!Number.isNaN(parts[1])
		) {
			coords.push(parts as number[]);
		}
	}

	return coords;
}

/**
 * Parses coordinates from GML 3 <pos> or <posList> string.
 * Format: "x1 y1 x2 y2" or "x1 y1 z1 x2 y2 z2"
 */
function parseGmlPosList(text: string, srsDimension = 2): number[][] {
	const clean = text.trim();
	if (!clean) return [];

	const nums = clean
		.split(/\s+/)
		.map((n) => Number(n.trim()))
		.filter((n) => !Number.isNaN(n));

	const dim = srsDimension >= 2 ? srsDimension : 2;
	const coords: number[][] = [];

	for (let i = 0; i + dim <= nums.length; i += dim) {
		const point: number[] = [];
		for (let d = 0; d < dim; d++) {
			point.push(nums[i + d] as number);
		}
		coords.push(point);
	}

	return coords;
}

/**
 * Extracts a geometry object from an XML string snippet.
 */
function parseGeometrySnippet(
	xml: string,
	invertAxis = false,
): GeoJsonGeometry | null {
	// Normalize coordinates axis if inverted: [lat, lon] -> [lon, lat]
	const normalizeCoords = (points: number[][]): number[][] => {
		if (!invertAxis) return points;
		return points.map(([x, y, ...rest]) => [y ?? 0, x ?? 0, ...rest]);
	};

	// 1. Polygon / Surface
	if (/<(?:[a-zA-Z0-9_]+:)?(?:Polygon|Surface)\b[^>]*>/i.test(xml)) {
		const rings: number[][][] = [];

		// Exterior ring
		const extMatch =
			/<(?:[a-zA-Z0-9_]+:)?(?:outerBoundaryIs|exterior)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?(?:outerBoundaryIs|exterior)>/i.exec(
				xml,
			);
		if (extMatch?.[1]) {
			const extCoords = parseRingCoordinates(extMatch[1]);
			if (extCoords.length >= 3) {
				rings.push(normalizeCoords(extCoords));
			}
		}

		// Interior rings (holes)
		const intRegex =
			/<(?:[a-zA-Z0-9_]+:)?(?:innerBoundaryIs|interior)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?(?:innerBoundaryIs|interior)>/gi;
		let intMatch: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
		while ((intMatch = intRegex.exec(xml)) !== null) {
			if (intMatch[1]) {
				const holeCoords = parseRingCoordinates(intMatch[1]);
				if (holeCoords.length >= 3) {
					rings.push(normalizeCoords(holeCoords));
				}
			}
		}

		if (rings.length > 0) {
			return {
				type: "Polygon",
				coordinates: rings,
			};
		}
	}

	// 2. LineString / Curve
	if (
		/<(?:[a-zA-Z0-9_]+:)?(?:LineString|Curve|LineStringSegment)\b[^>]*>/i.test(
			xml,
		)
	) {
		const coords = parseLineCoordinates(xml);
		if (coords.length >= 2) {
			return {
				type: "LineString",
				coordinates: normalizeCoords(coords),
			};
		}
	}

	// 3. Point
	if (/<(?:[a-zA-Z0-9_]+:)?Point\b[^>]*>/i.test(xml)) {
		const point = parsePointCoordinates(xml);
		if (point && point.length >= 2) {
			const finalPt = invertAxis
				? [point[1] ?? 0, point[0] ?? 0, ...point.slice(2)]
				: point;
			return {
				type: "Point",
				coordinates: finalPt,
			};
		}
	}

	// 4. MultiPoint
	if (/<(?:[a-zA-Z0-9_]+:)?MultiPoint\b[^>]*>/i.test(xml)) {
		const points: number[][] = [];
		const ptRegex =
			/<(?:[a-zA-Z0-9_]+:)?Point\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?Point>/gi;
		let m: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
		while ((m = ptRegex.exec(xml)) !== null) {
			const pt = parsePointCoordinates(m[0]);
			if (pt && pt.length >= 2) points.push(pt);
		}
		if (points.length > 0) {
			return {
				type: "MultiPoint",
				coordinates: normalizeCoords(points),
			};
		}
	}

	// 5. MultiLineString
	if (/<(?:[a-zA-Z0-9_]+:)?(?:MultiLineString|MultiCurve)\b[^>]*>/i.test(xml)) {
		const lines: number[][][] = [];
		const lineRegex =
			/<(?:[a-zA-Z0-9_]+:)?(?:LineString|Curve|LineStringSegment)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?(?:LineString|Curve|LineStringSegment)>/gi;
		let m: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
		while ((m = lineRegex.exec(xml)) !== null) {
			const line = parseLineCoordinates(m[0]);
			if (line.length >= 2) lines.push(normalizeCoords(line));
		}
		if (lines.length > 0) {
			return {
				type: "MultiLineString",
				coordinates: lines,
			};
		}
	}

	// 6. MultiPolygon / MultiSurface
	if (/<(?:[a-zA-Z0-9_]+:)?(?:MultiPolygon|MultiSurface)\b[^>]*>/i.test(xml)) {
		const polys: number[][][][] = [];
		const polyRegex =
			/<(?:[a-zA-Z0-9_]+:)?(?:Polygon|Surface)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?(?:Polygon|Surface)>/gi;
		let m: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
		while ((m = polyRegex.exec(xml)) !== null) {
			const geom = parseGeometrySnippet(m[0], invertAxis);
			if (geom && geom.type === "Polygon") {
				polys.push(geom.coordinates as number[][][]);
			}
		}
		if (polys.length > 0) {
			return {
				type: "MultiPolygon",
				coordinates: polys,
			};
		}
	}

	return null;
}

function parseRingCoordinates(xml: string): number[][] {
	// Check posList
	const posListMatch =
		/<(?:[a-zA-Z0-9_]+:)?posList\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?posList>/i.exec(
			xml,
		);
	if (posListMatch?.[2]) {
		const dimMatch = /srsDimension=["'](\d+)["']/i.exec(posListMatch[1] ?? "");
		const dim = dimMatch?.[1] ? Number(dimMatch[1]) : 2;
		return parseGmlPosList(posListMatch[2], dim);
	}

	// Check coordinates
	const coordMatch =
		/<(?:[a-zA-Z0-9_]+:)?coordinates\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?coordinates>/i.exec(
			xml,
		);
	if (coordMatch?.[2]) {
		const attrs = coordMatch[1] ?? "";
		const csMatch = /cs=["']([^"']+)["']/i.exec(attrs);
		const tsMatch = /ts=["']([^"']+)["']/i.exec(attrs);
		const cs = csMatch?.[1] ? csMatch[1] : ",";
		const ts = tsMatch?.[1] ? tsMatch[1] : " ";
		return parseGmlCoordinates(coordMatch[2], cs, ts);
	}

	// Sequence of <pos> elements
	const posRegex =
		/<(?:[a-zA-Z0-9_]+:)?pos\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?pos>/gi;
	const out: number[][] = [];
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
	while ((m = posRegex.exec(xml)) !== null) {
		if (m[1]) {
			const pt = parseGmlPosList(m[1], 2)[0];
			if (pt) out.push(pt);
		}
	}

	return out;
}

function parseLineCoordinates(xml: string): number[][] {
	return parseRingCoordinates(xml);
}

function parsePointCoordinates(xml: string): number[] | null {
	// Check pos
	const posMatch =
		/<(?:[a-zA-Z0-9_]+:)?pos\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?pos>/i.exec(
			xml,
		);
	if (posMatch?.[1]) {
		const pts = parseGmlPosList(posMatch[1], 2);
		return pts[0] ?? null;
	}

	// Check coordinates
	const coordMatch =
		/<(?:[a-zA-Z0-9_]+:)?coordinates\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?coordinates>/i.exec(
			xml,
		);
	if (coordMatch?.[2]) {
		const pts = parseGmlCoordinates(coordMatch[2]);
		return pts[0] ?? null;
	}

	// Check coord / X, Y
	const xMatch = /<(?:[a-zA-Z0-9_]+:)?X\b[^>]*>([^<]+)<\//i.exec(xml);
	const yMatch = /<(?:[a-zA-Z0-9_]+:)?Y\b[^>]*>([^<]+)<\//i.exec(xml);
	if (xMatch && yMatch && xMatch[1] && yMatch[1]) {
		const x = Number(xMatch[1].trim());
		const y = Number(yMatch[1].trim());
		if (!Number.isNaN(x) && !Number.isNaN(y)) {
			return [x, y];
		}
	}

	return null;
}

/**
 * Extracts non-geometry XML properties from a feature XML snippet.
 */
function extractFeatureProperties(
	xml: string,
	stripNamespaces = true,
): Record<string, unknown> {
	const props: Record<string, unknown> = {};
	const leafRegex = /<([a-zA-Z0-9_:]+)\b[^>]*>([^<]+)<\/\1>/g;
	let match: RegExpExecArray | null;

	const nonPropertyTags = new Set([
		"Point",
		"LineString",
		"Curve",
		"LineStringSegment",
		"Polygon",
		"Surface",
		"MultiPoint",
		"MultiLineString",
		"MultiCurve",
		"MultiPolygon",
		"MultiSurface",
		"LinearRing",
		"outerBoundaryIs",
		"innerBoundaryIs",
		"exterior",
		"interior",
		"geometryProperty",
		"the_geom",
		"geom",
		"geometry",
		"boundedBy",
		"location",
		"pos",
		"posList",
		"coordinates",
		"coord",
		"X",
		"Y",
		"Z",
	]);

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
	while ((match = leafRegex.exec(xml)) !== null) {
		const fullTag = match[1] ?? "";
		const rawVal = match[2] ?? "";
		const tag = localName(fullTag);

		if (nonPropertyTags.has(tag)) continue;

		const key = stripNamespaces ? tag : fullTag;
		const cleanVal = rawVal.trim();
		if (!cleanVal) continue;

		// Convert boolean / number if cleanly formatted
		if (cleanVal === "true") {
			props[key] = true;
		} else if (cleanVal === "false") {
			props[key] = false;
		} else if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(cleanVal)) {
			props[key] = Number(cleanVal);
		} else {
			props[key] = cleanVal;
		}
	}

	return props;
}

/**
 * Converts a GML XML string or binary buffer into an RFC 7946 GeoJSON FeatureCollection.
 */
export function convertGmlToGeoJson(
	input: string | Uint8Array | ArrayBuffer,
	options: GmlConversionOptions = {},
): GmlConversionResult {
	const xml =
		typeof input === "string"
			? input
			: new TextDecoder("utf-8").decode(
					input instanceof Uint8Array ? input : new Uint8Array(input),
				);

	if (!xml.includes("<") || !xml.includes(">")) {
		throw new Error("Invalid GML: content does not appear to be valid XML.");
	}

	// Detect SRS name
	const srsMatch = /srsName=["']([^"']+)["']/i.exec(xml);
	const srsName = srsMatch ? srsMatch[1] : undefined;

	let invertAxis = options.invertAxisOrder ?? false;

	// Check if EPSG:4326 axis order auto-detection should apply
	if (options.autoDetectAxis !== false && srsName && !options.invertAxisOrder) {
		const isEpsg4326 =
			/EPSG[::]+4326/i.test(srsName) ||
			srsName.includes("urn:ogc:def:crs:EPSG::4326") ||
			srsName.includes("urn:x-ogc:def:crs:EPSG:4326");
		if (isEpsg4326) {
			// In EPSG 4326 URN, official axis order is Lat, Lon.
			// Let's sample the first coordinate to check if first number is Lat (-90..90) and second is Lon (> 90)
			const samplePos =
				/<(?:[a-zA-Z0-9_]+:)?(?:pos|coordinates)\b[^>]*>([\s\S]*?)<\//i.exec(
					xml,
				);
			if (samplePos?.[1]) {
				const parts = samplePos[1]
					.trim()
					.split(/[\s,]+/)
					.map(Number);
				if (parts.length >= 2) {
					const first = parts[0] ?? 0;
					const second = parts[1] ?? 0;
					// If second number is greater than 90, second MUST be longitude, so first is latitude -> invert to [lon, lat]
					if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
						invertAxis = true;
					}
				}
			}
		}
	}

	const stripNamespaces = options.stripNamespaces ?? true;
	const features: GeoJsonFeature[] = [];
	const geometryTypes: Record<string, number> = {};

	// Match feature containers: <gml:featureMember>, <gml:featureMembers>, or <wfs:member>
	const memberRegex =
		/<(?:[a-zA-Z0-9_]+:)?(?:featureMember|featureMembers|member)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?(?:featureMember|featureMembers|member)>/gi;
	let memberMatch: RegExpExecArray | null;
	const featureSnippets: string[] = [];

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
	while ((memberMatch = memberRegex.exec(xml)) !== null) {
		if (memberMatch[1]) {
			featureSnippets.push(memberMatch[1]);
		}
	}

	// Fallback: If no <featureMember> tags found, look for direct geometry tags (standalone GML snippet)
	if (featureSnippets.length === 0) {
		const directGeom = parseGeometrySnippet(xml, invertAxis);
		if (directGeom) {
			const feat: GeoJsonFeature = {
				type: "Feature",
				geometry: directGeom,
				properties: extractFeatureProperties(xml, stripNamespaces),
			};
			features.push(feat);
			geometryTypes[directGeom.type] =
				(geometryTypes[directGeom.type] ?? 0) + 1;
		}
	} else {
		for (const snippet of featureSnippets) {
			// Check feature ID attribute: fid="..." or gml:id="..."
			const idMatch = /\b(?:gml:)?(?:id|fid)=["']([^"']+)["']/i.exec(snippet);
			const fid = idMatch ? idMatch[1] : undefined;

			const geometry = parseGeometrySnippet(snippet, invertAxis);
			const properties = extractFeatureProperties(snippet, stripNamespaces);

			if (geometry) {
				geometryTypes[geometry.type] = (geometryTypes[geometry.type] ?? 0) + 1;
			}

			features.push({
				type: "Feature",
				...(fid ? { id: fid } : {}),
				geometry,
				properties,
			});
		}
	}

	const geoJson: GeoJsonFeatureCollection = {
		type: "FeatureCollection",
		features,
		metadata: {
			srsName,
			featureCount: features.length,
			generator: "convrtr GML Engine",
		},
	};

	return {
		geoJson,
		featureCount: features.length,
		geometryTypes,
		srsName,
	};
}
