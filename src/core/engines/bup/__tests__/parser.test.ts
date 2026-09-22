import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertBupToZip, parseSaturnBackup } from "../parser";

function makeSyntheticSaturnDump(): Uint8Array {
	const totalBlocks = 10;
	const raw = new Uint8Array(totalBlocks * 64);
	const view = new DataView(raw.buffer);

	// Block 0: "BackUpRam Format" repeated 4 times
	const sig = "BackUpRam Format";
	const textEncoder = new TextEncoder();
	for (let i = 0; i < 4; i++) {
		raw.set(textEncoder.encode(sig), i * 16);
	}

	// Block 1: zeroes (separator)

	// Block 2: Save 1 header (64 bytes)
	const b2 = 2 * 64;
	view.setUint32(b2, 0x80000000, false); // Block header: active save
	raw.set(textEncoder.encode("SONIC_R\0\0\0\0"), b2 + 4); // 11 bytes
	raw[b2 + 15] = 1; // English
	raw.set(textEncoder.encode("STAGE_1\0\0\0"), b2 + 16); // 10 bytes
	view.setUint32(b2 + 26, 9500000, false); // ~18 years after 1980 -> ~1998
	view.setUint32(b2 + 30, 128, false); // 128 bytes payload (2 blocks)

	// Block table at b2 + 34: blocks 3 and 4
	view.setUint16(b2 + 34, 3, false);
	view.setUint16(b2 + 36, 4, false);

	// Block 3 & 4 data
	raw.set(textEncoder.encode("SONIC_SAVE_DATA_BLOCK_A_12345678"), 3 * 64);
	raw.set(textEncoder.encode("SONIC_SAVE_DATA_BLOCK_B_87654321"), 4 * 64);

	return raw;
}

function makeSyntheticStandaloneBup(): Uint8Array {
	const raw = new Uint8Array(64 + 64);
	const view = new DataView(raw.buffer);
	const textEncoder = new TextEncoder();

	view.setUint32(0, 0x80000000, false);
	raw.set(textEncoder.encode("NIGHTS\0\0\0\0\0"), 4);
	raw[15] = 0; // Japanese
	raw.set(textEncoder.encode("DREAM_01\0\0"), 16);
	view.setUint32(26, 8500000, false);
	view.setUint32(30, 32, false); // 32 bytes payload

	raw.set(textEncoder.encode("NIGHTS_INTO_DREAMS_SCORE_RECORD_"), 64);
	return raw;
}

describe("Sega Saturn Backup Memory Save Carver", () => {
	it("parses full BackUpRam Format memory dump", () => {
		const dump = makeSyntheticSaturnDump();
		const parsed = parseSaturnBackup(dump);

		expect(parsed.isFullDump).toBe(true);
		expect(parsed.saves).toHaveLength(1);

		const save = parsed.saves[0];
		expect(save).toBeDefined();
		if (!save) return;
		expect(save.name).toBe("SONIC_R");
		expect(save.language).toBe("English");
		expect(save.comment).toBe("STAGE_1");
		expect(save.dataSize).toBe(128);
		expect(save.payloadBytes.length).toBe(128);
		expect(save.dateIso).toContain("1998");
	});

	it("parses standalone .bup file", () => {
		const bup = makeSyntheticStandaloneBup();
		const parsed = parseSaturnBackup(bup);

		expect(parsed.isFullDump).toBe(false);
		expect(parsed.saves).toHaveLength(1);

		const save = parsed.saves[0];
		expect(save).toBeDefined();
		if (!save) return;
		expect(save.name).toBe("NIGHTS");
		expect(save.language).toBe("Japanese");
		expect(save.comment).toBe("DREAM_01");
		expect(save.dataSize).toBe(32);
		expect(save.payloadBytes.length).toBe(32);
	});

	it("carves saves into ZIP archive containing .bup, raw .bin and manifest", () => {
		const dump = makeSyntheticSaturnDump();
		const zipBuffer = convertBupToZip(dump);
		expect(zipBuffer.length).toBeGreaterThan(0);

		const unzipped = unzipSync(zipBuffer);
		expect(unzipped["bup/SONIC_R.bup"]).toBeDefined();
		expect(unzipped["raw/SONIC_R.bin"]).toBeDefined();
		expect(unzipped["manifest.json"]).toBeDefined();
		expect(unzipped["README.md"]).toBeDefined();

		const rawContent = new TextDecoder().decode(unzipped["raw/SONIC_R.bin"]);
		expect(rawContent).toContain("SONIC_SAVE_DATA_BLOCK_A");
	});

	it("exports JSON summary correctly", () => {
		const bup = makeSyntheticStandaloneBup();
		const jsonBytes = convertBupToZip(bup, { json: true });
		const json = JSON.parse(new TextDecoder().decode(jsonBytes));

		expect(json.isFullDump).toBe(false);
		expect(json.saveCount).toBe(1);
		expect(json.saves[0].name).toBe("NIGHTS");
	});

	it("throws error on undersized files", () => {
		expect(() => parseSaturnBackup(new Uint8Array(10))).toThrow("too small");
	});
});
