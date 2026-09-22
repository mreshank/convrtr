import type { SqlJsDatabase, SqlJsStatic } from "sql.js";
import { describe, expect, it } from "vitest";
import { convertGpkgToGeoJson } from "../parser";

async function sqlJs(): Promise<SqlJsStatic> {
	const mod = (await import("sql.js")) as unknown as {
		default: () => Promise<SqlJsStatic>;
	};
	return mod.default();
}

async function makeGpkg(): Promise<Uint8Array> {
	const SQL = await sqlJs();
	const db = new SQL.Database();
	db.run(
		"CREATE TABLE gpkg_spatial_ref_sys (srs_id INTEGER PRIMARY KEY, organization TEXT, organization_coordsys_id INTEGER, definition TEXT);",
	);
	db.run(
		"INSERT INTO gpkg_spatial_ref_sys VALUES (4326, 'EPSG', 4326, 'GEOGCS[\"WGS 84\"]');",
	);
	db.run(
		"CREATE TABLE gpkg_geometry_columns (table_name TEXT, column_name TEXT, geometry_type_name TEXT, srs_id INTEGER, z INTEGER, m INTEGER);",
	);
	db.run(
		"INSERT INTO gpkg_geometry_columns VALUES ('places', 'geom', 'POINT', 4326, 0, 0);",
	);
	db.run("CREATE TABLE places (id INTEGER, name TEXT, geom BLOB);");

	const wkbPoint = (x: number, y: number): Uint8Array => {
		const out = new Uint8Array(21);
		const v = new DataView(out.buffer);
		out[0] = 1;
		v.setUint32(1, 1, true);
		v.setFloat64(5, x, true);
		v.setFloat64(13, y, true);
		return out;
	};
	const gpkgGeom = (x: number, y: number): Uint8Array => {
		const wkb = wkbPoint(x, y);
		const out = new Uint8Array(8 + wkb.length);
		out[0] = 0x47;
		out[1] = 0x50;
		out[2] = 0;
		out[3] = 0;
		new DataView(out.buffer).setInt32(4, 4326, true);
		out.set(wkb, 8);
		return out;
	};

	const insert = (
		db2: SqlJsDatabase,
		id: number,
		name: string,
		geom: Uint8Array,
	): void => {
		const stmt = db2.prepare("INSERT INTO places VALUES (?, ?, ?)");
		try {
			stmt.bind([id, name, geom]);
			stmt.step();
		} finally {
			stmt.free();
		}
	};
	insert(db, 1, "Rome", gpkgGeom(12.5, 41.9));
	insert(db, 2, "Oslo", gpkgGeom(10.75, 59.91));
	const bytes = db.export();
	db.close();
	return bytes;
}

describe("GeoPackage (.gpkg) Parser", () => {
	it("decodes srs-checked points with attributes", async () => {
		const file = await makeGpkg();
		const out = await convertGpkgToGeoJson(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const geo = JSON.parse(new TextDecoder().decode(out)) as {
			type: string;
			meta: { srs: string[] };
			features: Array<{
				geometry: { type: string; coordinates: number[] };
				properties: Record<string, unknown>;
			}>;
		};
		expect(geo.type).toBe("FeatureCollection");
		expect(geo.meta.srs).toEqual(["4326"]);
		expect(geo.features).toHaveLength(2);
		expect(geo.features[0]?.geometry).toEqual({
			type: "Point",
			coordinates: [12.5, 41.9],
		});
		expect(geo.features[0]?.properties).toMatchObject({ id: 1, name: "Rome" });
	}, 60000);

	it("rejects non-GeoPackage SQLite files", async () => {
		const SQL = await sqlJs();
		const db = new SQL.Database();
		db.run("CREATE TABLE t(x TEXT);");
		const bytes = db.export();
		db.close();
		await expect(
			convertGpkgToGeoJson(
				bytes.buffer.slice(
					bytes.byteOffset,
					bytes.byteOffset + bytes.byteLength,
				) as ArrayBuffer,
			),
		).rejects.toThrow("gpkg_geometry_columns");
	}, 60000);

	it("rejects non-SQLite input", async () => {
		await expect(
			convertGpkgToGeoJson(
				new TextEncoder().encode("definitely not sqlite......")
					.buffer as ArrayBuffer,
			),
		).rejects.toThrow("SQLite");
	});
});
