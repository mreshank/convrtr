import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { pakToZipEngine } from "../index";

function buildMockPak(): ArrayBuffer {
	const files = [
		{
			path: "sound/weapons/cbar_hit1.wav",
			data: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
		},
		{
			path: "maps/crossfire.bsp",
			data: new Uint8Array([0x30, 0x00, 0x00, 0x00, 0xaa, 0xbb]),
		},
	];

	let dataSize = 0;
	for (const f of files) {
		dataSize += f.data.length;
	}

	const dirOffset = 12 + dataSize;
	const dirLength = files.length * 64;
	const totalSize = dirOffset + dirLength;

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// "PACK"
	bytes[0] = 0x50;
	bytes[1] = 0x41;
	bytes[2] = 0x43;
	bytes[3] = 0x4b;
	view.setUint32(4, dirOffset, true);
	view.setUint32(8, dirLength, true);

	let currentPos = 12;
	for (let i = 0; i < files.length; i++) {
		const f = files[i];
		if (!f) continue;
		bytes.set(f.data, currentPos);

		const entryStart = dirOffset + i * 64;
		// Write 56 bytes filename
		for (let c = 0; c < 56; c++) {
			bytes[entryStart + c] = c < f.path.length ? f.path.charCodeAt(c) : 0;
		}
		view.setUint32(entryStart + 56, currentPos, true);
		view.setUint32(entryStart + 60, f.data.length, true);

		currentPos += f.data.length;
	}

	return buffer;
}

describe("pakToZipEngine", () => {
	it("probes successfully", async () => {
		const supported = await pakToZipEngine.probe();
		expect(supported).toBe(true);
	});

	it("extracts files and preserves internal folder paths in ZIP", async () => {
		const mockPak = buildMockPak();
		const progress: string[] = [];

		const result = await pakToZipEngine.run(mockPak, {}, (_ratio, phase) => {
			progress.push(phase);
		});

		expect(result.byteLength).toBeGreaterThan(0);
		const unzipped = unzipSync(new Uint8Array(result));

		expect(unzipped["sound/weapons/cbar_hit1.wav"]).toBeDefined();
		expect(unzipped["sound/weapons/cbar_hit1.wav"]?.length).toBe(4);

		expect(unzipped["maps/crossfire.bsp"]).toBeDefined();
		expect(unzipped["maps/crossfire.bsp"]?.length).toBe(6);

		const manifestBytes = unzipped["PAK_MANIFEST.md"];
		expect(manifestBytes).toBeDefined();
		if (manifestBytes) {
			const manifestStr = new TextDecoder().decode(manifestBytes);
			expect(manifestStr).toContain("**Total Files Extracted:** 2");
		}

		expect(progress).toContain("READ_DIRECTORY");
		expect(progress).toContain("EXTRACT_FILES");
		expect(progress).toContain("COMPRESS_ZIP");
		expect(progress).toContain("DONE");
	});

	it("rejects non-PAK files", async () => {
		const invalid = new TextEncoder().encode("Not a PAK file at all")
			.buffer as ArrayBuffer;
		await expect(pakToZipEngine.run(invalid, {}, () => {})).rejects.toThrow(
			/invalid magic header/i,
		);
	});
});
