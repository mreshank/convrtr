import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unpackSevenZip } from "../../cb7/parser";
import { cbrToPdfEngine } from "../index";

function fixture(name: string): Uint8Array {
	const buf = readFileSync(`src/core/engines/cbr/__tests__/fixtures/${name}`);
	return new Uint8Array(
		buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
	);
}

async function listNames(
	kind: "test-v4.rar" | "test-v5.rar",
): Promise<string[]> {
	const { seven, outDir, cleanup } = await unpackSevenZip(
		fixture(kind),
		500_000_000,
		".cbr",
	);
	try {
		const { listUnpackedFiles } = await import("../../cb7/parser");
		return listUnpackedFiles(seven, outDir)
			.map((p) => p.replace(`${outDir}/`, ""))
			.sort();
	} finally {
		cleanup();
	}
}

describe("Comic RAR (.cbr) Engine", () => {
	it("extracts RAR5 archives through the shared 7-Zip core", async () => {
		const names = await listNames("test-v5.rar");
		expect(names).toContain("addon/addon.py");
		expect(names).toContain("README.md");
	}, 120000);

	it("extracts legacy RAR4 archives too", async () => {
		const names = await listNames("test-v4.rar");
		expect(names.length).toBeGreaterThan(0);
	}, 120000);

	it("rejects non-archives with a clear error", async () => {
		expect(await cbrToPdfEngine.probe()).toBe(true);
		await expect(
			cbrToPdfEngine.run(
				new TextEncoder().encode("this is not a rar file at all.............")
					.buffer as ArrayBuffer,
				{},
				() => {},
			),
		).rejects.toThrow();
	}, 120000);
});
