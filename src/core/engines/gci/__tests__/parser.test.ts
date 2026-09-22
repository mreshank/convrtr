import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
	convertGci,
	formatGciSummary,
	parseGameCubeSaves,
	parseSingleGci,
} from "../parser";

function makeSyntheticGci(): Uint8Array {
	const data = new Uint8Array(8192);
	const view = new DataView(data.buffer);

	// Game code: GZLE
	data.set(new TextEncoder().encode("GZLE"), 0);
	// Company code: 01 (Nintendo)
	data.set(new TextEncoder().encode("01"), 4);
	// Filename: zelda_save
	data.set(new TextEncoder().encode("zelda_save"), 8);

	// Mod time: 100,000,000 seconds
	view.setUint32(0x28, 100000000, false);
	// Block count: 1
	view.setUint16(0x32, 1, false);

	// Comment 1: The Legend of Zelda
	data.set(new TextEncoder().encode("The Legend of Zelda"), 0x38);
	// Comment 2: Quest Log 1
	data.set(new TextEncoder().encode("Quest Log 1"), 0x58);

	// 32x32 RGB5A3 icon at 0x80
	for (let i = 0; i < 32 * 32; i++) {
		// RGB555 opaque green: 0x8000 | (0x1F << 5)
		view.setUint16(0x80 + i * 2, 0x8000 | (0x1f << 5), false);
	}

	return data;
}

describe("Nintendo GameCube GCI Parser", () => {
	it("parses single .gci file metadata and comments", () => {
		const gciBytes = makeSyntheticGci();
		const save = parseSingleGci(gciBytes);

		expect(save.gameCode).toBe("GZLE");
		expect(save.companyCode).toBe("01");
		expect(save.filename).toBe("zelda_save");
		expect(save.blockCount).toBe(1);
		expect(save.comment1).toContain("The Legend of Zelda");
		expect(save.comment2).toContain("Quest Log 1");
		expect(save.iconPng).toBeDefined();
		expect(save.iconPng?.length).toBeGreaterThan(50);
	});

	it("formats markdown summary of GameCube saves", () => {
		const gciBytes = makeSyntheticGci();
		const saves = parseGameCubeSaves(gciBytes);
		const md = formatGciSummary(saves);

		expect(md).toContain("Nintendo GameCube Save Summary");
		expect(md).toContain("GZLE");
		expect(md).toContain("Nintendo");
		expect(md).toContain("The Legend of Zelda");
	});

	it("converts through convertGci and exports JSON", () => {
		const gciBytes = makeSyntheticGci();
		const jsonBuf = convertGci(gciBytes.buffer as ArrayBuffer, false);
		const jsonStr = new TextDecoder().decode(jsonBuf);
		const parsed = JSON.parse(jsonStr);

		expect(parsed.saveCount).toBe(1);
		expect(parsed.saves[0].gameCode).toBe("GZLE");
		expect(parsed.saves[0].company).toBe("Nintendo");
	});

	it("packages carved saves and icons into ZIP", () => {
		const gciBytes = makeSyntheticGci();
		const zipBuf = convertGci(gciBytes.buffer as ArrayBuffer, true);
		const unzipped = unzipSync(new Uint8Array(zipBuf));
		const fileNames = Object.keys(unzipped);

		expect(fileNames).toContain("README.md");
		expect(fileNames).toContain("manifest.json");
		expect(fileNames).toContain("saves/GZLE_zelda_save.gci");
		expect(fileNames).toContain("icons/GZLE_zelda_save.png");
	});

	it("carves saves from raw 512KB memory card dumps", () => {
		const rawCard = new Uint8Array(524288);
		const view = new DataView(rawCard.buffer);

		// Directory entry in Block 1 (offset 8192)
		rawCard.set(new TextEncoder().encode("GALE"), 8192); // Smash Melee
		rawCard.set(new TextEncoder().encode("01"), 8192 + 4);
		rawCard.set(new TextEncoder().encode("melee_save"), 8192 + 8);
		view.setUint16(8192 + 0x30, 2, false); // start block = 2
		view.setUint16(8192 + 0x32, 2, false); // block count = 2
		rawCard.set(
			new TextEncoder().encode("Super Smash Bros. Melee"),
			8192 + 0x38,
		);

		const saves = parseGameCubeSaves(rawCard);
		expect(saves).toHaveLength(1);
		expect(saves[0]?.gameCode).toBe("GALE");
		expect(saves[0]?.filename).toBe("melee_save");
		expect(saves[0]?.blockCount).toBe(2);
	});
});
