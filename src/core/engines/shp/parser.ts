import * as fflate from "fflate";

type Position = [number, number];
type Geometry =
	| { type: "Point"; coordinates: Position }
	| { type: "MultiPoint"; coordinates: Position[] }
	| { type: "LineString"; coordinates: Position[] }
	| { type: "MultiLineString"; coordinates: Position[][] }
	| { type: "Polygon"; coordinates: Position[][] }
	| { type: "MultiPolygon"; coordinates: Position[][][] };

export interface DbfTable {
	fields: string[];
	rows: Array<Record<string, string | number | boolean | null>>;
}

function dv(bytes: Uint8Array): DataView {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readShp(bytes: Uint8Array): Geometry[] {
	const v = dv(bytes);
	if (bytes.length < 100)
		throw new Error("Truncated .shp header (need 100 bytes).");
	if (v.getInt32(0, false) !== 9994) {
		throw new Error("Not a Shapefile: missing the 9994 file code.");
	}
	const geometries: Geometry[] = [];
	let off = 100;
	while (off + 8 <= bytes.length) {
		const contentLen = v.getInt32(off + 4, false) * 2;
		if (contentLen < 4 || off + 8 + contentLen > bytes.length) break;
		const base = off + 8;
		const shapeType = v.getInt32(base, true);
		const getPt = (at: number): Position => [
			v.getFloat64(at, true),
			v.getFloat64(at + 8, true),
		];
		if (shapeType === 1 || shapeType === 11 || shapeType === 21) {
			geometries.push({ type: "Point", coordinates: getPt(base + 4) });
		} else if (shapeType === 8 || shapeType === 18 || shapeType === 28) {
			const n = v.getInt32(base + 36, true);
			const pts: Position[] = [];
			for (let i = 0; i < n && base + 40 + i * 16 + 16 <= bytes.length; i++) {
				pts.push(getPt(base + 40 + i * 16));
			}
			geometries.push({ type: "MultiPoint", coordinates: pts });
		} else if (
			shapeType === 3 ||
			shapeType === 5 ||
			shapeType === 13 ||
			shapeType === 15 ||
			shapeType === 23 ||
			shapeType === 25
		) {
			const numParts = v.getInt32(base + 36, true);
			const numPoints = v.getInt32(base + 40, true);
			const parts: number[] = [];
			for (let i = 0; i < numParts; i++)
				parts.push(v.getInt32(base + 44 + i * 4, true));
			const pts: Position[] = [];
			const ptsBase = base + 44 + numParts * 4;
			for (
				let i = 0;
				i < numPoints && ptsBase + i * 16 + 16 <= bytes.length;
				i++
			) {
				pts.push(getPt(ptsBase + i * 16));
			}
			const rings: Position[][] = parts.map((start, i) => {
				const end =
					i + 1 < parts.length ? (parts[i + 1] ?? numPoints) : numPoints;
				return pts.slice(start, end);
			});
			if (shapeType === 3 || shapeType === 13 || shapeType === 23) {
				geometries.push(
					rings.length === 1 && rings[0]
						? { type: "LineString", coordinates: rings[0] }
						: { type: "MultiLineString", coordinates: rings },
				);
			} else {
				geometries.push({ type: "Polygon", coordinates: rings });
			}
		}
		// Null (0) and exotic types (31 MultiPatch…) carry no convertible geometry: skip.
		off += 8 + contentLen;
	}
	return geometries;
}

export function readDbf(bytes: Uint8Array): DbfTable {
	const v = dv(bytes);
	if (bytes.length < 33) throw new Error("Truncated .dbf header.");
	const numRecords = v.getUint32(4, true);
	const headerLen = v.getUint16(8, true);
	const recordLen = v.getUint16(10, true);
	if (headerLen < 33 || recordLen < 1)
		throw new Error("Corrupt .dbf header lengths.");

	const fields: Array<{
		name: string;
		type: string;
		len: number;
		dec: number;
	}> = [];
	let off = 32;
	while (off + 32 <= bytes.length && off < headerLen - 1) {
		if (bytes[off] === 0x0d) break;
		const rawName = new TextDecoder("ascii").decode(
			bytes.subarray(off, off + 11),
		);
		const name = rawName.split("\0")[0]?.trim() || `FIELD${fields.length + 1}`;
		fields.push({
			name,
			type: String.fromCharCode(bytes[off + 11] ?? 67),
			len: bytes[off + 16] ?? 0,
			dec: bytes[off + 17] ?? 0,
		});
		off += 32;
	}

	const rows: DbfTable["rows"] = [];
	let at = headerLen;
	for (
		let r = 0;
		r < numRecords && at + recordLen <= bytes.length;
		r++, at += recordLen
	) {
		if (bytes[at] === 0x2a) continue; // deleted flag '*'
		const row: Record<string, string | number | boolean | null> = {};
		let fOff = at + 1;
		for (const f of fields) {
			const raw = new TextDecoder("windows-1252").decode(
				bytes.subarray(fOff, fOff + f.len),
			);
			fOff += f.len;
			const t = raw.trim();
			if (t === "") {
				row[f.name] = null;
			} else if (f.type === "N" || f.type === "F") {
				const n = Number(t);
				row[f.name] = Number.isFinite(n) ? n : t;
			} else if (f.type === "D" && /^\d{8}$/.test(t)) {
				row[f.name] = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
			} else if (f.type === "L") {
				row[f.name] = /^[YTyt1]/.test(t);
			} else {
				row[f.name] = t;
			}
		}
		rows.push(row);
	}
	return { fields: fields.map((f) => f.name), rows };
}

/**
 * Converts a zipped Shapefile set (`.shp` + `.dbf`) into RFC 7946 GeoJSON.
 *
 * ESRI Shapefiles are never one file: geometry lives in `.shp`, attributes
 * in dBase-III `.dbf`, joined by record order. The tool takes the set as a
 * ZIP (the way every GIS hands them around), parses both sides with no
 * native deps, and emits a FeatureCollection. Coordinates pass through
 * untouched — `.prj` reprojection is out of scope, so output is correct
 * when the source is already lon/lat (the overwhelmingly common case for
 * shared extracts), stated plainly on the tool page.
 */
export function convertShpZipToGeoJson(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "UNPACK");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	let unzipped: Record<string, Uint8Array>;
	try {
		unzipped = fflate.unzipSync(bytes);
	} catch {
		throw new Error(
			"Invalid archive: expected a ZIP holding a .shp + .dbf set.",
		);
	}
	const names = Object.keys(unzipped);
	const pick = (ext: string): Uint8Array => {
		const key =
			names.find(
				(n) => n.toLowerCase().endsWith(ext) && !n.includes("__MACOSX"),
			) ?? "";
		const data = key ? unzipped[key] : undefined;
		if (!data) throw new Error(`Archive holds no ${ext} file.`);
		return data;
	};

	onProgress?.(0.3, "READ GEOMETRY");
	const geometries = readShp(pick(".shp"));
	if (geometries.length === 0) {
		throw new Error(
			"No convertible geometry decoded (null or unsupported shape types).",
		);
	}

	onProgress?.(0.55, "READ ATTRIBUTES");
	let properties: Array<Record<string, string | number | boolean | null>> = [];
	try {
		properties = readDbf(pick(".dbf")).rows;
	} catch {
		properties = [];
	}

	onProgress?.(0.75, "JOIN");
	const count = Math.min(
		geometries.length,
		properties.length || geometries.length,
	);
	const features = geometries.slice(0, count).map((geometry, i) => ({
		type: "Feature",
		geometry,
		properties: properties[i] ?? {},
	}));

	const geojson = {
		type: "FeatureCollection",
		meta: {
			features: features.length,
			withAttributes: properties.length > 0,
			note: "Coordinates pass through unprojected (.prj not applied); correct for lon/lat sources.",
		},
		features,
	};
	onProgress?.(1.0, "COMPLETE");
	return new TextEncoder().encode(`${JSON.stringify(geojson)}\n`)
		.buffer as ArrayBuffer;
}
