import { describe, expect, it } from "vitest";
import { convertCwkToMarkdown, cwkToMarkdownEngine } from "../index";

function buildSyntheticCwk(): Uint8Array {
	// Header with BOBO signature
	const header = new Uint8Array(32);
	header[0] = 0x00;
	header[1] = 0x01; // Version
	header[2] = 0x00;
	header[3] = 0x02;
	header[4] = 0x42; // 'B'
	header[5] = 0x4f; // 'O'
	header[6] = 0x42; // 'B'
	header[7] = 0x4f; // 'O'
	header[8] = 0x00;
	header[9] = 0x01; // Document Type: 1 = Word Processing

	// Text content in Mac OS Roman
	// Includes smart quotes (0xD2, 0xD3), em-dash (0xD1), bullet (0xA5)
	const textPart =
		"Quarterly Research Notes\r" +
		"Executive Overview\r" +
		"The ClarisWorks document format was an icon of 1990s Macintosh computing.\r" +
		"• Feature one: integrated word processor\r" +
		"• Feature two: vector graphics and spreadsheets\r" +
		"Concluded.\r";

	const encoder = new TextEncoder();
	const textBytes = encoder.encode(textPart);

	const total = new Uint8Array(header.length + textBytes.length + 10);
	total.set(header, 0);
	total.set(textBytes, header.length);

	return total;
}

function buildSyntheticMacBinaryCwk(): Uint8Array {
	// 128-byte MacBinary II header
	const macBin = new Uint8Array(128);
	macBin[0] = 0; // null byte
	const name = "Report.cwk";
	macBin[1] = name.length;
	for (let i = 0; i < name.length; i++) {
		macBin[2 + i] = name.charCodeAt(i);
	}
	// Type 'CWRK' at offset 65
	macBin[65] = 0x43; // 'C'
	macBin[66] = 0x57; // 'W'
	macBin[67] = 0x52; // 'R'
	macBin[68] = 0x4b; // 'K'
	// Creator 'BOBO' at offset 69
	macBin[69] = 0x42; // 'B'
	macBin[70] = 0x4f; // 'O'
	macBin[71] = 0x42; // 'B'
	macBin[72] = 0x4f; // 'O'

	const payload = buildSyntheticCwk();
	const total = new Uint8Array(128 + payload.length);
	total.set(macBin, 0);
	total.set(payload, 128);
	return total;
}

describe("cwkToMarkdownEngine", () => {
	it("rejects buffer smaller than minimum header", () => {
		expect(() => convertCwkToMarkdown(new Uint8Array(16))).toThrow(
			/smaller than the minimum/,
		);
	});

	it("rejects invalid signature without MacBinary header", () => {
		const invalid = new Uint8Array(64);
		expect(() => convertCwkToMarkdown(invalid)).toThrow(/Missing 'BOBO'/);
	});

	it("converts raw ClarisWorks document into clean Markdown", () => {
		const cwkBytes = buildSyntheticCwk();
		const result = convertCwkToMarkdown(cwkBytes, { includeFrontmatter: true });

		expect(result.metadata.title).toBe("Quarterly Research Notes");
		expect(result.metadata.documentType).toBe("Word Processing");
		expect(result.markdown).toContain("---");
		expect(result.markdown).toContain("# Quarterly Research Notes");
		expect(result.markdown).toContain("## Executive Overview");
		expect(result.markdown).toContain(
			"- Feature one: integrated word processor",
		);
		expect(result.markdown).toContain(
			"- Feature two: vector graphics and spreadsheets",
		);
		expect(result.metadata.paragraphCount).toBeGreaterThanOrEqual(4);
	});

	it("converts MacBinary wrapped ClarisWorks document", () => {
		const macBinBytes = buildSyntheticMacBinaryCwk();
		const result = convertCwkToMarkdown(macBinBytes);

		expect(result.metadata.title).toBe("Report.cwk");
		expect(result.markdown).toContain("Quarterly Research Notes");
		expect(result.markdown).toContain("Executive Overview");
	});

	it("runs successfully through engine interface", async () => {
		const cwkBytes = buildSyntheticCwk();
		const buffer = await cwkToMarkdownEngine.run(
			cwkBytes.buffer as ArrayBuffer,
			{ includeFrontmatter: true },
			() => {},
		);
		const text = new TextDecoder().decode(buffer);
		expect(text).toContain("# Quarterly Research Notes");
		expect(text).toContain("ClarisWorks / AppleWorks");
	});
});
