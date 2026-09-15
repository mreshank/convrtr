import { describe, expect, it } from "vitest";
import { convertSdwToMarkdown, sdwToMarkdownEngine } from "../index";

function createMockSdwStream(): Uint8Array {
	const text =
		"SYSTEM ARCHITECTURE\0\0This document specifies the internal pipeline design.\0\0- High availability\0- Low latency\0\0All rights reserved.\0";
	const buffer = new Uint8Array(256);
	for (let i = 0; i < text.length; i++) {
		buffer[i] = text.charCodeAt(i);
	}
	return buffer;
}

function createMockOleSdw(): Uint8Array {
	// 512-byte header + sector 0 (FAT) + sector 1 (Dir) + sector 2 (Summary) + sector 3 (Document)
	const totalSize = 512 + 512 * 4;
	const buffer = new Uint8Array(totalSize);
	const view = new DataView(buffer.buffer);

	// OLE signature
	const oleSig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
	for (let i = 0; i < 8; i++) buffer[i] = oleSig[i] ?? 0;

	// Sector shift = 9 (512 bytes)
	view.setUint16(30, 9, true);
	// Mini sector shift = 6
	view.setUint16(32, 6, true);
	// Number of FAT sectors = 1
	view.setUint32(44, 1, true);
	// First directory sector = 1
	view.setUint32(48, 1, true);
	// First FAT sector in MSAT array (offset 76) = 0
	view.setUint32(76, 0, true);

	// Sector 0 (FAT table at offset 512)
	const fatOffset = 512;
	view.setUint32(fatOffset + 0 * 4, 0xfffffffd, true); // sector 0 is FAT
	view.setUint32(fatOffset + 1 * 4, 0xfffffffe, true); // sector 1 (Dir) end
	view.setUint32(fatOffset + 2 * 4, 0xfffffffe, true); // sector 2 (Summary) end
	view.setUint32(fatOffset + 3 * 4, 0xfffffffe, true); // sector 3 (Doc) end

	// Sector 1 (Directory entries at offset 512 + 512 = 1024)
	const dirOffset = 1024;
	// Entry 0: Root Entry (type 5)
	const rootName = "Root Entry";
	for (let i = 0; i < rootName.length; i++) {
		view.setUint16(dirOffset + i * 2, rootName.charCodeAt(i), true);
	}
	view.setUint16(dirOffset + 64, (rootName.length + 1) * 2, true);
	buffer[dirOffset + 66] = 5; // Root storage

	// Entry 1: SummaryInformation (type 2 stream)
	const e1Offset = dirOffset + 128;
	const sumName = "\x05SummaryInformation";
	for (let i = 0; i < sumName.length; i++) {
		view.setUint16(e1Offset + i * 2, sumName.charCodeAt(i), true);
	}
	view.setUint16(e1Offset + 64, (sumName.length + 1) * 2, true);
	buffer[e1Offset + 66] = 2; // Stream
	view.setUint32(e1Offset + 116, 2, true); // Start sector 2
	view.setUint32(e1Offset + 120, 128, true); // Size 128 bytes

	// Entry 2: StarWriterDocument (type 2 stream)
	const e2Offset = dirOffset + 256;
	const docName = "StarWriterDocument";
	for (let i = 0; i < docName.length; i++) {
		view.setUint16(e2Offset + i * 2, docName.charCodeAt(i), true);
	}
	view.setUint16(e2Offset + 64, (docName.length + 1) * 2, true);
	buffer[e2Offset + 66] = 2; // Stream
	view.setUint32(e2Offset + 116, 3, true); // Start sector 3
	view.setUint32(e2Offset + 120, 256, true); // Size 256 bytes

	// Sector 2: SummaryInformation payload at 512 + 2 * 512 = 1536
	const sumOffset = 1536;
	view.setUint32(sumOffset + 44, 48, true); // Section offset = 48
	// Section header: size = 80, numProperties = 2
	view.setUint32(sumOffset + 48, 80, true);
	view.setUint32(sumOffset + 52, 2, true);
	// Prop 0: ID 2 (Title), offset 24
	view.setUint32(sumOffset + 56, 2, true);
	view.setUint32(sumOffset + 60, 24, true);
	// Prop 1: ID 4 (Author), offset 48
	view.setUint32(sumOffset + 64, 4, true);
	view.setUint32(sumOffset + 68, 48, true);

	// Title value at 48 + 24 = 72: type 30 (VT_LPSTR), length 12
	const titleVal = "StarOffice\0";
	view.setUint32(sumOffset + 72, 30, true);
	view.setUint32(sumOffset + 76, titleVal.length, true);
	for (let i = 0; i < titleVal.length; i++) {
		buffer[sumOffset + 80 + i] = titleVal.charCodeAt(i);
	}

	// Author value at 48 + 48 = 96: type 30 (VT_LPSTR), length 8
	const authorVal = "SunUser\0";
	view.setUint32(sumOffset + 96, 30, true);
	view.setUint32(sumOffset + 100, authorVal.length, true);
	for (let i = 0; i < authorVal.length; i++) {
		buffer[sumOffset + 104 + i] = authorVal.charCodeAt(i);
	}

	// Sector 3: StarWriterDocument payload at 512 + 3 * 512 = 2048
	const docOffset = 2048;
	const docText =
		"QUARTERLY REPORT\0\0Total revenue exceeded expectations by twelve percent.\0\0- North America\0- EMEA\0\0End of report.\0";
	for (let i = 0; i < docText.length; i++) {
		buffer[docOffset + i] = docText.charCodeAt(i);
	}

	return buffer;
}

describe("StarWriter (.sdw) to Markdown Engine", () => {
	it("rejects undersized buffer", () => {
		const small = new Uint8Array(16);
		expect(() => convertSdwToMarkdown(small)).toThrow(/Buffer too small/);
	});

	it("parses raw StarWriter text stream into markdown with semantic headings and lists", () => {
		const raw = createMockSdwStream();
		const result = convertSdwToMarkdown(raw);

		expect(result.markdown).toContain("## SYSTEM ARCHITECTURE");
		expect(result.markdown).toContain(
			"This document specifies the internal pipeline design.",
		);
		expect(result.markdown).toContain("- High availability");
		expect(result.markdown).toContain("- Low latency");
		expect(result.metadata.wordCount).toBeGreaterThan(5);
	});

	it("parses OLE CFB compound document and extracts summary metadata with frontmatter", () => {
		const ole = createMockOleSdw();
		const result = convertSdwToMarkdown(ole, { includeFrontmatter: true });

		expect(result.metadata.title).toBe("StarOffice");
		expect(result.metadata.author).toBe("SunUser");
		expect(result.markdown).toContain('title: "StarOffice"');
		expect(result.markdown).toContain('author: "SunUser"');
		expect(result.markdown).toContain("QUARTERLY REPORT");
		expect(result.markdown).toContain("Total revenue exceeded expectations");
		expect(result.markdown).toContain("- North America");
	});

	it("runs via engine interface with options and progress callback", async () => {
		const ole = createMockOleSdw();
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await sdwToMarkdownEngine.run(
			ole.buffer as ArrayBuffer,
			{ includeFrontmatter: false },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const md = new TextDecoder().decode(output);
		expect(md).not.toContain("---");
		expect(md).toContain("QUARTERLY REPORT");
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
