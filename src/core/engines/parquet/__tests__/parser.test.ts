import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parquetToCsvEngine } from "../index";
import { dumpParquetToCsv } from "../parser";

function fixture(): Uint8Array {
	// Repo-root-relative, matching how `pnpm vitest run` is invoked.
	const buf = readFileSync(
		"src/core/engines/parquet/__tests__/fixtures/datapage_v2.snappy.parquet",
	);
	return new Uint8Array(
		buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
	);
}

describe("Parquet dump Engine", () => {
	it("reads snappy rows into exact CSV", async () => {
		const { columns, rowCount, csv } = await dumpParquetToCsv(
			fixture(),
			() => {},
		);
		expect(columns).toEqual(["a", "b", "c", "d", "e"]);
		expect(rowCount).toBe(5);
		expect(csv.charCodeAt(0)).toBe(0xfeff);
		expect(csv).toContain("a,b,c,d,e");
		expect(csv).toContain("abc,1,2,true");
		expect(csv).toContain("[1,2,3]"); // nested list becomes compact JSON
	}, 60000);

	it("exposes the same path through the engine", async () => {
		expect(await parquetToCsvEngine.probe()).toBe(true);
		const file = fixture();
		const out = await parquetToCsvEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		expect(new TextDecoder().decode(out)).toContain("a,b,c,d,e");
	}, 60000);

	it("rejects non-parquet input", async () => {
		await expect(
			dumpParquetToCsv(
				new TextEncoder().encode("definitely not parquet!!")
					.buffer as ArrayBuffer,
			),
		).rejects.toThrow("PAR1");
		await expect(
			dumpParquetToCsv(new Uint8Array(4).buffer as ArrayBuffer),
		).rejects.toThrow("Too small");
	});
});
