import * as fflate from "fflate";
import { describe, expect, it } from "vitest";
import { sqliteToZipEngine } from "../index";
import { dumpSqliteToZip } from "../parser";

async function makeDb(): Promise<Uint8Array> {
	const mod = (await import("sql.js")) as unknown as {
		default: () => Promise<{
			Database: new () => {
				run(sql: string): void;
				export(): Uint8Array;
				close(): void;
			};
		}>;
	};
	const SQL = await mod.default();
	const db = new SQL.Database();
	db.run(
		"CREATE TABLE customers(id INTEGER, name TEXT, note TEXT, data BLOB);",
	);
	db.run("INSERT INTO customers VALUES (1, 'Ana, \"A\"', NULL, x'00ff');");
	db.run("INSERT INTO customers VALUES (2, 'Ben', 'hi', NULL);");
	db.run("CREATE TABLE empty_t(x TEXT);");
	const bytes = db.export();
	db.close();
	return bytes;
}

describe("SQLite dump Engine", () => {
	it("dumps every table to BOM-headed CSVs in a ZIP", async () => {
		const file = await makeDb();
		const { tableCount, rowCount, zipBytes } = await dumpSqliteToZip(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		expect(tableCount).toBe(2);
		expect(rowCount).toBe(2);

		const entries = fflate.unzipSync(zipBytes);
		expect(Object.keys(entries).sort()).toEqual([
			"customers.csv",
			"empty_t.csv",
		]);

		const raw = entries["customers.csv"];
		if (!raw) throw new Error("missing customers.csv");
		expect([raw[0], raw[1], raw[2]]).toEqual([0xef, 0xbb, 0xbf]);
		const csv = new TextDecoder().decode(raw);
		expect(csv).toContain("id,name,note,data");
		expect(csv).toContain('"Ana, ""A"""');
		expect(csv).toContain("AP8="); // x'00ff' base64
		const empty = new TextDecoder().decode(
			entries["empty_t.csv"] ?? new Uint8Array(0),
		);
		expect(empty).toContain("x");
	}, 60000);

	it("exposes the same path through the engine", async () => {
		expect(await sqliteToZipEngine.probe()).toBe(true);
		const file = await makeDb();
		const out = await sqliteToZipEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		expect(new Uint8Array(out)[0]).toBe(0x50);
	}, 60000);

	it("rejects non-SQLite input", async () => {
		await expect(
			dumpSqliteToZip(
				new TextEncoder().encode("hello world, this is a test file....")
					.buffer as ArrayBuffer,
			),
		).rejects.toThrow("Not a SQLite database");
	});
});
