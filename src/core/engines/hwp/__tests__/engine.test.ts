import { deflateSync } from "fflate";
import { describe, expect, it } from "vitest";
import { convertHwpToMarkdown, hwpToMarkdownEngine } from "../index";

/**
 * Helper to construct a synthetic OLE CFB file containing FileHeader and Section0 streams.
 */
function createSyntheticHwp(options: {
	titleText: string;
	paragraphs: string[];
	compressed: boolean;
	versionMajor?: number;
	versionMinor?: number;
}): Uint8Array {
	const sectorSize = 512;

	// 1. Build FileHeader payload (256 bytes)
	const fileHeader = new Uint8Array(256);
	const sig = "HWP Document File";
	for (let i = 0; i < sig.length; i++) {
		fileHeader[i] = sig.charCodeAt(i);
	}
	// Version at offset 32: [rev, build, minor, major]
	fileHeader[32] = 0;
	fileHeader[33] = 0;
	fileHeader[34] = options.versionMinor ?? 0;
	fileHeader[35] = options.versionMajor ?? 5;
	// Flags at offset 36: bit 0 is compressed
	fileHeader[36] = options.compressed ? 1 : 0;

	// 2. Build Section0 records
	// Tag 68 = HWPTAG_PARA_TEXT
	const allParas = [options.titleText, ...options.paragraphs];
	const recordChunks: Uint8Array[] = [];

	for (const para of allParas) {
		const rawChars = new Uint8Array(para.length * 2);
		for (let i = 0; i < para.length; i++) {
			const code = para.charCodeAt(i);
			rawChars[i * 2] = code & 0xff;
			rawChars[i * 2 + 1] = (code >> 8) & 0xff;
		}

		const tagId = 68;
		const level = 0;
		const size = rawChars.length;
		const headUint = tagId | (level << 10) | (size << 20);

		const headBytes = new Uint8Array(4);
		new DataView(headBytes.buffer).setUint32(0, headUint, true);

		const record = new Uint8Array(4 + rawChars.length);
		record.set(headBytes, 0);
		record.set(rawChars, 4);
		recordChunks.push(record);
	}

	const totalSectionLen = recordChunks.reduce((acc, r) => acc + r.length, 0);
	const uncompressedSection = new Uint8Array(totalSectionLen);
	let secOff = 0;
	for (const r of recordChunks) {
		uncompressedSection.set(r, secOff);
		secOff += r.length;
	}

	const sectionPayload = options.compressed
		? deflateSync(uncompressedSection)
		: uncompressedSection;

	// Sizing and layout in sectors:
	// Sector 0: FAT
	// Sector 1: Directory
	// Sector 2: FileHeader (256 bytes -> 1 sector)
	// Sector 3..N: Section0
	const sectionSectors = Math.max(
		1,
		Math.ceil(sectionPayload.length / sectorSize),
	);
	const totalSectors = 3 + sectionSectors;
	const totalBytes = 512 + totalSectors * sectorSize;
	const file = new Uint8Array(totalBytes);
	const view = new DataView(file.buffer);

	// OLE CFB Header (512 bytes)
	const oleSig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
	for (let i = 0; i < 8; i++) {
		file[i] = oleSig[i]!;
	}
	view.setUint16(30, 9, true); // sector shift = 9 (512 bytes)
	view.setUint32(44, 1, true); // 1 FAT sector
	view.setUint32(48, 1, true); // First dir sector = 1
	view.setUint32(76, 0, true); // MSAT[0] = Sector 0 (FAT sector)

	// Sector 0: FAT sector (offset 512)
	const fatOffset = 512;
	view.setUint32(fatOffset + 0 * 4, 0xfffffffd, true); // Sector 0 = FAT
	view.setUint32(fatOffset + 1 * 4, 0xfffffffe, true); // Sector 1 = Dir End
	view.setUint32(fatOffset + 2 * 4, 0xfffffffe, true); // Sector 2 = FileHeader End
	for (let s = 0; s < sectionSectors; s++) {
		const sectorIndex = 3 + s;
		const nextSector = s === sectionSectors - 1 ? 0xfffffffe : 3 + s + 1;
		view.setUint32(fatOffset + sectorIndex * 4, nextSector, true);
	}
	// Rest of FAT initialized to 0xFFFFFFFF
	for (let f = 3 + sectionSectors; f < 128; f++) {
		view.setUint32(fatOffset + f * 4, 0xffffffff, true);
	}

	// Sector 1: Directory Entries (offset 512 + 1 * 512 = 1024)
	const dirOffset = 1024;
	// Entry 0: Root Entry (type 5)
	file[dirOffset + 66] = 5;

	// Entry 1: FileHeader (type 2)
	const fhName = "FileHeader";
	const fhEntryOffset = dirOffset + 128;
	for (let i = 0; i < fhName.length; i++) {
		file[fhEntryOffset + i * 2] = fhName.charCodeAt(i);
		file[fhEntryOffset + i * 2 + 1] = 0;
	}
	view.setUint16(fhEntryOffset + 64, (fhName.length + 1) * 2, true);
	file[fhEntryOffset + 66] = 2; // Stream
	view.setUint32(fhEntryOffset + 116, 2, true); // start sector = 2
	view.setUint32(fhEntryOffset + 120, fileHeader.length, true); // size

	// Entry 2: Section0 (type 2)
	const sName = "Section0";
	const sEntryOffset = dirOffset + 256;
	for (let i = 0; i < sName.length; i++) {
		file[sEntryOffset + i * 2] = sName.charCodeAt(i);
		file[sEntryOffset + i * 2 + 1] = 0;
	}
	view.setUint16(sEntryOffset + 64, (sName.length + 1) * 2, true);
	file[sEntryOffset + 66] = 2; // Stream
	view.setUint32(sEntryOffset + 116, 3, true); // start sector = 3
	view.setUint32(sEntryOffset + 120, sectionPayload.length, true); // size

	// Sector 2: FileHeader payload (offset 512 + 2 * 512 = 1536)
	file.set(fileHeader, 512 + 2 * sectorSize);

	// Sector 3..N: Section0 payload
	file.set(sectionPayload, 512 + 3 * sectorSize);

	return file;
}

describe("Hangul Word Processor (.hwp 5.x) document engine", () => {
	it("rejects files that are too small or lack OLE / HWP signatures", () => {
		const tooSmall = new Uint8Array(100);
		expect(() => convertHwpToMarkdown(tooSmall)).toThrow(
			/smaller than the 512-byte OLE CFB header/,
		);

		const invalidHeader = new Uint8Array(512);
		expect(() => convertHwpToMarkdown(invalidHeader)).toThrow(
			/Missing OLE Compound Document signature/,
		);
	});

	it("converts uncompressed HWP 5.0 file to markdown with metadata", () => {
		const hwpBytes = createSyntheticHwp({
			titleText: "Hangul Specification Overview",
			paragraphs: [
				"제 1 장 개요",
				"This is the opening body paragraph in the document.",
				"Second paragraph discussing typography and glyph metrics.",
			],
			compressed: false,
			versionMajor: 5,
			versionMinor: 1,
		});

		const result = convertHwpToMarkdown(hwpBytes);
		expect(result.metadata.title).toBe("Hangul Specification Overview");
		expect(result.metadata.version).toBe("5.1");
		expect(result.metadata.compressed).toBe(false);
		expect(result.metadata.sectionCount).toBe(1);
		expect(result.metadata.paragraphCount).toBe(4);

		expect(result.markdown).toContain(
			'title: "Hangul Specification Overview"',
		);
		expect(result.markdown).toContain(
			'format: "Hangul Word Processor (HWP 5.1)"',
		);
		expect(result.markdown).toContain("# Hangul Specification Overview");
		expect(result.markdown).toContain("## 제 1 장 개요");
		expect(result.markdown).toContain(
			"This is the opening body paragraph in the document.",
		);
	});

	it("decompresses and converts Deflate-compressed HWP sections", () => {
		const hwpCompressed = createSyntheticHwp({
			titleText: "Compressed Report Title",
			paragraphs: [
				"1. Introduction to Korean Hangul Documents",
				"Deflate stream decompression is verified successfully.",
			],
			compressed: true,
			versionMajor: 5,
			versionMinor: 0,
		});

		const result = convertHwpToMarkdown(hwpCompressed);
		expect(result.metadata.compressed).toBe(true);
		expect(result.metadata.title).toBe("Compressed Report Title");
		expect(result.markdown).toContain(
			"## 1. Introduction to Korean Hangul Documents",
		);
		expect(result.markdown).toContain(
			"Deflate stream decompression is verified successfully.",
		);
	});

	it("respects includeFrontmatter option", () => {
		const hwpBytes = createSyntheticHwp({
			titleText: "Simple Document",
			paragraphs: ["Only one body paragraph."],
			compressed: false,
		});

		const result = convertHwpToMarkdown(hwpBytes, {
			includeFrontmatter: false,
		});
		expect(result.markdown).not.toMatch(/^---\n/);
		expect(result.markdown).toContain("# Simple Document");
		expect(result.markdown).toContain("Only one body paragraph.");
	});

	it("executes through the Engine interface", async () => {
		const hwpBytes = createSyntheticHwp({
			titleText: "Engine Test Hangul",
			paragraphs: ["Engine run execution paragraph."],
			compressed: false,
		});

		const output = await hwpToMarkdownEngine.run(
			hwpBytes.buffer as ArrayBuffer,
			{ includeFrontmatter: true },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const md = new TextDecoder().decode(output);
		expect(md).toContain("# Engine Test Hangul");
		expect(md).toContain("Engine run execution paragraph.");
	});
});
