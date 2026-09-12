import { describe, expect, it } from "vitest";
import {
	convertPalmdocToMarkdown,
	decompressPalmDocLz77,
	palmdocToMarkdownEngine,
} from "../index";

function createMockPdb(options: {
	name?: string;
	compressed?: boolean;
	text?: string;
}): Uint8Array {
	const name = options.name ?? "TestDoc";
	const isCompressed = options.compressed ?? false;
	const text =
		options.text ??
		"Chapter 1: The Beginning\n\nThis is a sample vintage PDA document written for PalmPilot handheld devices.";

	const rawTextBytes = new TextEncoder().encode(text);
	let textRecordBytes: Uint8Array;

	if (isCompressed) {
		// Compress using simple PalmDoc LZ77 rules
		// We can construct a known stream or simple literal chunks
		const compBytes: number[] = [];
		for (const b of rawTextBytes) {
			if (b >= 0x09 && b <= 0x7f) {
				compBytes.push(b);
			} else {
				// literal run of 1 byte
				compBytes.push(1);
				compBytes.push(b);
			}
		}
		textRecordBytes = new Uint8Array(compBytes);
	} else {
		textRecordBytes = rawTextBytes;
	}

	const headerSize = 78;
	const numRecords = 2; // Record 0 (Doc header) + Record 1 (Text)
	const recIndexSize = numRecords * 8;
	const rec0Size = 16;

	const rec0Offset = headerSize + recIndexSize;
	const rec1Offset = rec0Offset + rec0Size;
	const totalSize = rec1Offset + textRecordBytes.length;

	const buffer = new Uint8Array(totalSize);
	const view = new DataView(buffer.buffer);

	// DB Name (32 bytes)
	const nameBytes = new TextEncoder().encode(name);
	buffer.set(nameBytes.subarray(0, 31), 0);

	// Creation date
	view.setUint32(36, 2082844800 + 1609459200, false); // ~2021 date

	// Type & Creator ("TEXt" & "REAd")
	buffer.set([0x54, 0x45, 0x58, 0x74], 60); // TEXt
	buffer.set([0x52, 0x45, 0x41, 0x64], 64); // REAd

	// Num records
	view.setUint16(76, numRecords, false);

	// Record list: Record 0
	view.setUint32(78, rec0Offset, false);
	buffer[82] = 0; // attributes
	// Record 1
	view.setUint32(86, rec1Offset, false);
	buffer[90] = 0;

	// Record 0 (PalmDoc header)
	view.setUint16(rec0Offset, isCompressed ? 2 : 1, false); // compression
	view.setUint16(rec0Offset + 2, 0, false);
	view.setUint32(rec0Offset + 4, rawTextBytes.length, false); // textLength
	view.setUint16(rec0Offset + 8, 1, false); // numTextRecords
	view.setUint16(rec0Offset + 10, 4096, false); // recordSize

	// Record 1 (Text data)
	buffer.set(textRecordBytes, rec1Offset);

	return buffer;
}

describe("palmdocToMarkdownEngine", () => {
	it("probes successfully", async () => {
		expect(await palmdocToMarkdownEngine.probe()).toBe(true);
	});

	it("throws on truncated or empty PDB", () => {
		expect(() => convertPalmdocToMarkdown(new Uint8Array([]))).toThrow(
			/smaller than the 78-byte/,
		);
		expect(() =>
			convertPalmdocToMarkdown(new Uint8Array(new Array(78).fill(0))),
		).toThrow(/0 records/);
	});

	it("decompresses LZ77 stream with back-references and space shortcuts", () => {
		// Input stream:
		// 'A', 'B', 'C' (literals)
		// 0xC0 + 'D' (0x44) -> 0x20 (' ') + 'D'
		// Back reference: repeat "ABC " (distance 4, length 4)
		// distance = 4 -> (b0 & 0x3f) = 0, (b1 & 0xe0) = 4 << 5 = 0x80 -> b0 = 0x80, b1 = 0x80 | (4 - 3 = 1) = 0x81
		const compressed = new Uint8Array([
			0x41,
			0x42,
			0x43, // ABC
			0x80 | 0x44, // 0xC4 -> space + 'D'
			0x80,
			0xa2, // distance 5, length 5: repeats "ABC D"
		]);
		const decompressed = decompressPalmDocLz77(compressed);
		const str = new TextDecoder().decode(decompressed);
		expect(str).toBe("ABC DABC D");
	});

	it("converts uncompressed PalmDoc PDB to Markdown", () => {
		const mockBytes = createMockPdb({
			name: "Moby Dick",
			compressed: false,
			text: "CHAPTER 1. Loomings.\n\nCall me Ishmael.",
		});
		const result = convertPalmdocToMarkdown(mockBytes);

		expect(result.metadata.name).toBe("Moby Dick");
		expect(result.metadata.compression).toBe("none");
		expect(result.markdown).toContain("# Moby Dick");
		expect(result.markdown).toContain("## CHAPTER 1. Loomings.");
		expect(result.markdown).toContain("Call me Ishmael.");
	});

	it("converts compressed PalmDoc PDB to Markdown via engine runner", async () => {
		const mockBytes = createMockPdb({
			name: "Palm OS Handbook",
			compressed: true,
			text: "Chapter 2: Graffiti Handwriting System\n\nGraffiti enables single-stroke handwriting on the digitizer.",
		});

		const outBuffer = await palmdocToMarkdownEngine.run(
			mockBytes.buffer as ArrayBuffer,
			{ includeFrontmatter: true },
			() => {},
		);

		const mdStr = new TextDecoder().decode(new Uint8Array(outBuffer));
		expect(mdStr).toContain('title: "Palm OS Handbook"');
		expect(mdStr).toContain('format: "PalmDoc PDB (palmdoc-lz77)"');
		expect(mdStr).toContain("## Chapter 2: Graffiti Handwriting System");
	});
});
