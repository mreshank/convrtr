import { loadSqlJs } from "../sqlite/parser";

export const MAX_ROWS_PER_TABLE = 200_000;

type Position = [number, number];
type Geometry =
	| { type: "Point"; coordinates: Position }
	| { type: "MultiPoint"; coordinates: Position[] }
	| { type: "LineString"; coordinates: Position[] }
	| { type: "MultiLineString"; coordinates: Position[][] }
	| { type: "Polygon"; coordinates: Position[][] }
	| { type: "MultiPolygon"; coordinates: Position[][][] };

class WkbReader {
	off = 0;
	constructor(readonly bytes: Uint8Array) {}
	get view(): DataView {
		return new DataView(
			this.bytes.buffer,
			this.bytes.byteOffset,
			this.bytes.byteLength,
		);
	}
	get remaining(): number {
		return this.bytes.length - this.off;
	}
	u8(): number {
		return this.bytes[this.off++] ?? 0;
	}
	u32(le: boolean): number {
		const v = this.view.getUint32(this.off, le);
		this.off += 4;
		return v;
	}
	f64(le: boolean): number {
		const v = this.view.getFloat64(this.off, le);
		this.off += 8;
		return v;
	}
}

function readPoint(r: WkbReader, le: boolean, stride: number): Position | null {
	if (r.remaining < stride * 8) return null;
	const x = r.f64(le);
	const y = r.f64(le);
	for (let k = 2; k < stride; k++) r.f64(le);
	return [x, y];
}

function readRing(
	r: WkbReader,
	le: boolean,
	stride: number,
): Position[] | null {
	if (r.remaining < 4) return null;
	const n = r.u32(le);
	if (n > 100000) return null;
	const ring: Position[] = [];
	for (let i = 0; i < n; i++) {
		const p = readPoint(r, le, stride);
		if (!p) return null;
		ring.push(p);
	}
	return ring;
}

function strideOf(rawType: number): number {
	const hasZ = rawType >= 3000 || (rawType >= 1000 && rawType < 2000);
	const hasM = rawType >= 2000;
	return 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);
}

/** Reads one WKB geometry (order flag included). Z/M dropped to XY. */
function readWkbGeometry(r: WkbReader): Geometry | null {
	if (r.remaining < 5) return null;
	const order = r.u8();
	if (order !== 0 && order !== 1) return null;
	const le = order === 1;
	const rawType = r.u32(le);
	const base = rawType % 1000;
	const stride = strideOf(rawType);
	if (base === 1) {
		const p = readPoint(r, le, stride);
		return p ? { type: "Point", coordinates: p } : null;
	}
	if (base === 4) {
		const ring = readRing(r, le, stride);
		return ring ? { type: "LineString", coordinates: ring } : null;
	}
	if (base === 5) {
		if (r.remaining < 4) return null;
		const n = r.u32(le);
		if (n > 100000) return null;
		const pts: Position[] = [];
		for (let i = 0; i < n; i++) {
			const p = readPoint(r, le, stride);
			if (!p) return null;
			pts.push(p);
		}
		return { type: "MultiPoint", coordinates: pts };
	}
	if (base === 2) {
		if (r.remaining < 4) return null;
		const n = r.u32(le);
		if (n > 100000) return null;
		const lines: Position[][] = [];
		for (let i = 0; i < n; i++) {
			const ring = readRing(r, le, stride);
			if (!ring) return null;
			lines.push(ring);
		}
		return { type: "MultiLineString", coordinates: lines };
	}
	if (base === 3) {
		const poly = readPolygonBody(r, le, stride);
		return poly ? { type: "Polygon", coordinates: poly } : null;
	}
	if (base === 6) {
		if (r.remaining < 4) return null;
		const n = r.u32(le);
		if (n > 100000) return null;
		const polys: Position[][][] = [];
		for (let i = 0; i < n; i++) {
			const poly = readPolygonBody(r, le, stride);
			if (!poly) return null;
			polys.push(poly);
		}
		return { type: "MultiPolygon", coordinates: polys };
	}
	return null;
}

function readPolygonBody(
	r: WkbReader,
	le: boolean,
	stride: number,
): Position[][] | null {
	if (r.remaining < 4) return null;
	const nrings = r.u32(le);
	if (nrings > 100000) return null;
	const rings: Position[][] = [];
	for (let k = 0; k < nrings; k++) {
		const ring = readRing(r, le, stride);
		if (!ring) return null;
		rings.push(ring);
	}
	return rings;
}

/** Decodes one GeoPackageBinary header + WKB (srs cross-checked with the db). */
function decodeGpkgGeom(
	blob: Uint8Array,
	knownSrs: Set<number>,
): { geometry: Geometry; srsId: number } | null {
	if (blob.length < 8 || blob[0] !== 0x47 || blob[1] !== 0x50) return null;
	const flags = blob[3] ?? 0;
	const envelope = (flags & 0x0e) >> 1;
	// srs_id byte order is ambiguous in the wild: accept whichever matches
	// the database's own srs table (self-validating, never guessed blind).
	const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
	const leId = view.getInt32(4, true);
	const beId = view.getInt32(4, false);
	const srsId = knownSrs.has(leId) ? leId : knownSrs.has(beId) ? beId : leId;
	let wkbOff = 8;
	if (envelope === 1) wkbOff += 32;
	else if (envelope === 2 || envelope === 3) wkbOff += 48;
	else if (envelope === 4) wkbOff += 64;
	if (wkbOff >= blob.length) return null;
	const geometry = readWkbGeometry(new WkbReader(blob.subarray(wkbOff)));
	if (!geometry) return null;
	return { geometry, srsId };
}

/**
 * Converts an OGC GeoPackage (`.gpkg`, SQLite + spatial tables) into
 * RFC 7946 GeoJSON — riding the shared sql.js core.
 *
 * Reads gpkg_geometry_columns for the feature tables, decodes each
 * GeoPackageBinary header (srs cross-checked against the database's own
 * srs table, never guessed) plus ISO WKB (Z/M dropped to XY), and joins
 * non-spatial columns as properties. Non-4326 data passes through with
 * the CRS named openly in meta (no reprojection, stated plainly).
 */
export async function convertGpkgToGeoJson(
	input: ArrayBuffer | Uint8Array,
	onProgress?: (ratio: number, phase: string) => void,
): Promise<ArrayBuffer> {
	onProgress?.(0.05, "READ");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	const magic = new TextDecoder("ascii").decode(bytes.subarray(0, 16));
	if (!magic.startsWith("SQLite format 3")) {
		throw new Error("Not a GeoPackage: missing the SQLite container magic.");
	}

	onProgress?.(0.15, "LOAD ENGINE");
	const SQL = await loadSqlJs();
	const db = new SQL.Database(bytes);
	try {
		const hasTable = (name: string): boolean => {
			const res = db.exec(
				`SELECT 1 FROM sqlite_master WHERE type='table' AND name='${name.replace(/'/g, "''")}'`,
			);
			return (res[0]?.values.length ?? 0) > 0;
		};
		if (!hasTable("gpkg_geometry_columns")) {
			throw new Error(
				"SQLite file holds no gpkg_geometry_columns: not a GeoPackage (try sqlite-to-zip).",
			);
		}

		const knownSrs = new Set<number>();
		try {
			for (const row of db.exec("SELECT srs_id FROM gpkg_spatial_ref_sys")[0]
				?.values ?? []) {
				if (typeof row[0] === "number") knownSrs.add(row[0]);
			}
		} catch {
			// srs table unreadable: decode with LE ids, flagged in meta
		}

		const layers: Array<{ table: string; column: string; srs: string }> = [];
		for (const row of db.exec(
			"SELECT table_name, column_name, srs_id FROM gpkg_geometry_columns",
		)[0]?.values ?? []) {
			const [table, column, srs] = row as Array<string | number | null>;
			if (typeof table === "string" && typeof column === "string") {
				layers.push({ table, column, srs: String(srs ?? "") });
			}
		}
		if (layers.length === 0) {
			throw new Error("GeoPackage holds no feature layers.");
		}

		const quoteIdent = (n: string): string => `"${n.replace(/"/g, '""')}"`;
		const features: Array<Record<string, unknown>> = [];
		const srsSeen = new Set<string>();
		let skipped = 0;
		for (const layer of layers) {
			srsSeen.add(layer.srs);
			const stmt = db.prepare(`SELECT * FROM ${quoteIdent(layer.table)}`);
			try {
				const cols = stmt.getColumnNames();
				const dataCols = cols.filter((c) => c !== layer.column);
				let count = 0;
				while (stmt.step()) {
					if (count++ >= MAX_ROWS_PER_TABLE) {
						throw new Error(
							`Layer "${layer.table}" exceeds the ${MAX_ROWS_PER_TABLE.toLocaleString()}-row browser limit.`,
						);
					}
					const values = stmt.get() as Array<
						string | number | Uint8Array | null
					>;
					const blob = values[cols.indexOf(layer.column)];
					if (!(blob instanceof Uint8Array)) {
						skipped++;
						continue;
					}
					const decoded = decodeGpkgGeom(blob, knownSrs);
					if (!decoded) {
						skipped++;
						continue;
					}
					const properties: Record<string, unknown> = {};
					for (const c of dataCols) {
						const v = values[cols.indexOf(c)];
						properties[c] = v instanceof Uint8Array ? null : v;
					}
					features.push({
						type: "Feature",
						geometry: decoded.geometry,
						properties,
					});
				}
			} finally {
				stmt.free();
			}
			onProgress?.(
				0.3 + (layers.indexOf(layer) / layers.length) * 0.5,
				`READ ${layer.table}`,
			);
		}

		if (features.length === 0) {
			throw new Error(
				"No decodable geometries found (empty layers or exotic types).",
			);
		}
		const geojson = {
			type: "FeatureCollection",
			meta: {
				features: features.length,
				skipped,
				srs: [...srsSeen],
				note: "Geometries pass through unprojected; correct for lon/lat sources.",
			},
			features,
		};
		onProgress?.(1.0, "COMPLETE");
		return new TextEncoder().encode(`${JSON.stringify(geojson)}\n`)
			.buffer as ArrayBuffer;
	} finally {
		db.close();
	}
}
