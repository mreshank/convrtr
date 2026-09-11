import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { wadToZipEngine } from "../index";

function buildMockWad(): ArrayBuffer {
	// Create a mock PWAD with 5 lumps:
	// 1. S_START (size 0)
	// 2. TROOA1 (sprite, 4 bytes)
	// 3. S_END (size 0)
	// 4. DSPISTOL (sound, 8 bytes header + 16 bytes audio = 24 bytes)
	// 5. D_E1M1 (music, 4 bytes)

	const lumpsData: { name: string; bytes: Uint8Array }[] = [
		{ name: "S_START", bytes: new Uint8Array(0) },
		{ name: "TROOA1", bytes: new Uint8Array([0x01, 0x02, 0x03, 0x04]) },
		{ name: "S_END", bytes: new Uint8Array(0) },
		{
			name: "DSPISTOL",
			bytes: (() => {
				const b = new Uint8Array(8 + 16);
				const v = new DataView(b.buffer);
				v.setUint16(0, 3, true); // Format 3
				v.setUint16(2, 11025, true); // 11025 Hz
				v.setUint32(4, 16, true); // 16 samples
				b.fill(128, 8); // 8-bit PCM audio silence
				return b;
			})(),
		},
		{ name: "D_E1M1", bytes: new Uint8Array([0x4d, 0x55, 0x53, 0x1a]) }, // DMX MUS
	];

	let totalSize = 12; // 12-byte header
	for (const l of lumpsData) {
		totalSize += l.bytes.length;
	}
	const infotableofs = totalSize;
	totalSize += lumpsData.length * 16; // 16 bytes per directory entry

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// "PWAD"
	bytes[0] = 0x50;
	bytes[1] = 0x57;
	bytes[2] = 0x41;
	bytes[3] = 0x44;
	view.setUint32(4, lumpsData.length, true);
	view.setUint32(8, infotableofs, true);

	let currentPos = 12;
	for (let i = 0; i < lumpsData.length; i++) {
		const l = lumpsData[i];
		if (!l) continue;
		if (l.bytes.length > 0) {
			bytes.set(l.bytes, currentPos);
		}

		// Directory entry
		const entryOffset = infotableofs + i * 16;
		view.setUint32(entryOffset, currentPos, true);
		view.setUint32(entryOffset + 4, l.bytes.length, true);
		for (let c = 0; c < 8; c++) {
			bytes[entryOffset + 8 + c] = c < l.name.length ? l.name.charCodeAt(c) : 0;
		}

		currentPos += l.bytes.length;
	}

	return buffer;
}

describe("wadToZipEngine", () => {
	it("probes successfully", async () => {
		const supported = await wadToZipEngine.probe();
		expect(supported).toBe(true);
	});

	it("extracts WAD lumps and converts sound effects into playable WAVs", async () => {
		const mockWad = buildMockWad();
		const progress: string[] = [];

		const result = await wadToZipEngine.run(mockWad, {}, (_ratio, phase) => {
			progress.push(phase);
		});

		expect(result.byteLength).toBeGreaterThan(0);
		const unzipped = unzipSync(new Uint8Array(result));

		// Check sprite extraction
		expect(unzipped["sprites/TROOA1.lmp"]).toBeDefined();

		// Check sound effect was converted into WAV
		const wavBytes = unzipped["sounds/DSPISTOL.wav"];
		expect(wavBytes).toBeDefined();
		if (wavBytes) {
			// Check WAV RIFF magic (0x52, 0x49, 0x46, 0x46 = "RIFF")
			expect(wavBytes[0]).toBe(0x52);
			expect(wavBytes[1]).toBe(0x49);
			expect(wavBytes[2]).toBe(0x46);
			expect(wavBytes[3]).toBe(0x46);
		}

		// Check music file
		expect(unzipped["music/D_E1M1.mus"]).toBeDefined();

		// Check manifest
		const manifestBytes = unzipped["WAD_MANIFEST.md"];
		expect(manifestBytes).toBeDefined();
		if (manifestBytes) {
			const manifestStr = new TextDecoder().decode(manifestBytes);
			expect(manifestStr).toContain("**Container Type:** PWAD");
			expect(manifestStr).toContain("**Sound Effects Extracted (.wav):** 1");
		}

		expect(progress).toContain("READ_DIRECTORY");
		expect(progress).toContain("CATEGORIZE_LUMPS");
		expect(progress).toContain("COMPRESS_ZIP");
		expect(progress).toContain("DONE");
	});

	it("rejects non-WAD files", async () => {
		const invalid = new TextEncoder().encode("Not a Doom WAD file")
			.buffer as ArrayBuffer;
		await expect(wadToZipEngine.run(invalid, {}, () => {})).rejects.toThrow(
			/invalid magic header/i,
		);
	});
});
