import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
	convertMcrToZip,
	formatPsxSummary,
	parsePsxMemoryCard,
} from "../parser";

function makeSyntheticMemoryCard(): Uint8Array {
	const card = new Uint8Array(131072); // 128 KB
	const view = new DataView(card.buffer);

	// Block 0 Frame 0: 'MC' header
	card[0] = 0x4d; // 'M'
	card[1] = 0x43; // 'C'

	// Block 0 Frame 1 (Offset 128): Directory entry for Block 1
	card[128] = 0x51; // Allocated initial block
	view.setUint32(128 + 0x04, 8192, true); // 8192 bytes
	view.setUint16(128 + 0x08, 0xffff, true); // End of chain
	const code = new TextEncoder().encode("BASLUS-00892-FF8");
	card.set(code, 128 + 0x0a);

	// Block 1 (Offset 8192): Save data
	card[8192] = 0x53; // 'S'
	card[8193] = 0x43; // 'C'
	card[8194] = 0x11; // 1 icon frame
	card[8195] = 1; // 1 block

	// Title at 8192 + 4
	const title = new TextEncoder().encode("Final Fantasy VIII");
	card.set(title, 8192 + 0x04);

	// Palette at 8192 + 0x60: 16 colors (BGR 1555)
	for (let c = 0; c < 16; c++) {
		// Gray/white gradient
		view.setUint16(8192 + 0x60 + c * 2, c | (c << 5) | (c << 10), true);
	}

	// 16x16 4-bpp icon at 8192 + 0x80 (128 bytes)
	for (let i = 0; i < 128; i++) {
		card[8192 + 0x80 + i] = 0x12; // color 2 and color 1
	}

	return card;
}

describe("PS1 Memory Card Parser & Save Carver", () => {
	it("parses 128KB memory card frames and extracts save metadata", () => {
		const raw = makeSyntheticMemoryCard();
		const card = parsePsxMemoryCard(raw);

		expect(card.headerValid).toBe(true);
		expect(card.totalBlocks).toBe(15);
		expect(card.usedBlocks).toBe(1);
		expect(card.freeBlocks).toBe(14);
		expect(card.saves).toHaveLength(1);

		const save = card.saves[0];
		expect(save).toBeDefined();
		expect(save?.productCode).toBe("BASLUS-00892-FF8");
		expect(save?.title).toContain("Final Fantasy VIII");
		expect(save?.fileSize).toBe(8192);
		expect(save?.iconPng).toBeDefined();
		expect(save?.iconPng?.length).toBeGreaterThan(50);
	});

	it("formats markdown summary of memory card contents", () => {
		const raw = makeSyntheticMemoryCard();
		const card = parsePsxMemoryCard(raw);
		const md = formatPsxSummary(card);

		expect(md).toContain("PlayStation 1 Memory Card Contents");
		expect(md).toContain("BASLUS-00892-FF8");
		expect(md).toContain("Final Fantasy VIII");
	});

	it("carves saves and icons into structured ZIP archive", () => {
		const raw = makeSyntheticMemoryCard();
		const zipBuf = convertMcrToZip(raw.buffer as ArrayBuffer, false);

		const unzipped = unzipSync(new Uint8Array(zipBuf));
		const fileNames = Object.keys(unzipped);

		expect(fileNames).toContain("README.md");
		expect(fileNames).toContain("manifest.json");
		expect(fileNames).toContain("saves/BASLUS-00892-FF8.mcs");
		expect(fileNames).toContain("saves/BASLUS-00892-FF8.raw");
		expect(fileNames).toContain("icons/BASLUS-00892-FF8.png");

		// .mcs size is 128-byte directory frame + 8192 bytes = 8320 bytes
		expect(unzipped["saves/BASLUS-00892-FF8.mcs"]?.length).toBe(8320);
		// .raw size is 8192 bytes
		expect(unzipped["saves/BASLUS-00892-FF8.raw"]?.length).toBe(8192);
	});

	it("exports JSON manifest when requested", () => {
		const raw = makeSyntheticMemoryCard();
		const jsonBuf = convertMcrToZip(raw.buffer as ArrayBuffer, true);
		const jsonStr = new TextDecoder().decode(jsonBuf);
		const parsed = JSON.parse(jsonStr);

		expect(parsed.totalBlocks).toBe(15);
		expect(parsed.saves[0].productCode).toBe("BASLUS-00892-FF8");
	});

	it("rejects corrupted or truncated memory cards", () => {
		expect(() => parsePsxMemoryCard(new Uint8Array(100))).toThrow(
			"expected 131,072 bytes",
		);
		const badMagic = new Uint8Array(131072);
		expect(() => parsePsxMemoryCard(badMagic)).toThrow("missing 'MC' header");
	});
});
