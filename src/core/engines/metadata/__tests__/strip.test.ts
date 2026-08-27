import { describe, expect, it } from "vitest";
import { stripJpegMetadata } from "../jpeg";
import { stripPngMetadata } from "../png";

function jpeg(
	segments: Array<{ marker: number; payload: number[] }>,
	scan: number[] = [0x12, 0x34, 0x56],
): ArrayBuffer {
	const bytes: number[] = [0xff, 0xd8];
	for (const segment of segments) {
		const length = segment.payload.length + 2;
		bytes.push(0xff, segment.marker, (length >> 8) & 0xff, length & 0xff);
		bytes.push(...segment.payload);
	}
	bytes.push(0xff, 0xda, 0x00, 0x03, 0x01);
	bytes.push(...scan);
	bytes.push(0xff, 0xd9);
	return new Uint8Array(bytes).buffer;
}

function crc32(bytes: number[]): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let i = 0; i < 8; i++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function png(chunks: Array<{ type: string; data: number[] }>): ArrayBuffer {
	const bytes: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for (const chunk of chunks) {
		const typeBytes = [...chunk.type].map((c) => c.charCodeAt(0));
		const len = chunk.data.length;
		bytes.push(
			(len >>> 24) & 0xff,
			(len >>> 16) & 0xff,
			(len >>> 8) & 0xff,
			len & 0xff,
		);
		bytes.push(...typeBytes, ...chunk.data);
		const crc = crc32([...typeBytes, ...chunk.data]);
		bytes.push(
			(crc >>> 24) & 0xff,
			(crc >>> 16) & 0xff,
			(crc >>> 8) & 0xff,
			crc & 0xff,
		);
	}
	return new Uint8Array(bytes).buffer;
}

function markers(buffer: ArrayBuffer): number[] {
	const b = new Uint8Array(buffer);
	const found: number[] = [];
	let i = 2;
	while (i + 3 < b.length) {
		if (b[i] !== 0xff) break;
		const marker = b[i + 1];
		if (marker === undefined) break;
		found.push(marker);
		if (marker === 0xda) break;
		const high = b[i + 2] ?? 0;
		const low = b[i + 3] ?? 0;
		i += 2 + ((high << 8) | low);
	}
	return found;
}

function chunkTypes(buffer: ArrayBuffer): string[] {
	const b = new Uint8Array(buffer);
	const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
	const types: string[] = [];
	let offset = 8;
	while (offset + 8 <= b.length) {
		const len = view.getUint32(offset);
		const type = String.fromCharCode(...b.subarray(offset + 4, offset + 8));
		types.push(type);
		offset += 12 + len;
		if (type === "IEND") break;
	}
	return types;
}

describe("stripJpegMetadata", () => {
	it("removes EXIF, IPTC and comments", () => {
		const input = jpeg([
			{ marker: 0xe0, payload: [0x4a, 0x46, 0x49, 0x46] },
			{ marker: 0xe1, payload: [0x45, 0x78, 0x69, 0x66] },
			{ marker: 0xed, payload: [0x50, 0x68, 0x6f, 0x74] },
			{ marker: 0xfe, payload: [0x68, 0x69] },
		]);
		const out = markers(stripJpegMetadata(input));
		expect(out).not.toContain(0xe1);
		expect(out).not.toContain(0xed);
		expect(out).not.toContain(0xfe);
	});

	it("keeps the ICC profile — dropping it would visibly shift colour", () => {
		const input = jpeg([
			{ marker: 0xe2, payload: [0x49, 0x43, 0x43, 0x5f] },
			{ marker: 0xe1, payload: [0x45, 0x78, 0x69, 0x66] },
		]);
		const out = markers(stripJpegMetadata(input));
		expect(out).toContain(0xe2);
		expect(out).not.toContain(0xe1);
	});

	it("keeps the JFIF header", () => {
		const input = jpeg([
			{ marker: 0xe0, payload: [0x4a, 0x46, 0x49, 0x46] },
			{ marker: 0xe1, payload: [0x45, 0x78] },
		]);
		expect(markers(stripJpegMetadata(input))).toContain(0xe0);
	});

	it("leaves the compressed scan data bit-identical", () => {
		const scan = [0xaa, 0xbb, 0xcc, 0xdd, 0xee];
		const input = jpeg(
			[{ marker: 0xe1, payload: [0x45, 0x78, 0x69, 0x66] }],
			scan,
		);
		const out = new Uint8Array(stripJpegMetadata(input));
		const tail = Array.from(
			out.subarray(out.length - scan.length - 2, out.length - 2),
		);
		expect(tail).toEqual(scan);
	});

	it("shrinks the file", () => {
		const input = jpeg([{ marker: 0xe1, payload: new Array(200).fill(0x41) }]);
		expect(stripJpegMetadata(input).byteLength).toBeLessThan(input.byteLength);
	});

	it("rejects a non-JPEG rather than emitting garbage", () => {
		expect(() =>
			stripJpegMetadata(new Uint8Array([1, 2, 3, 4]).buffer),
		).toThrow();
	});
});

describe("stripPngMetadata", () => {
	it("removes text and EXIF chunks", () => {
		const input = png([
			{ type: "IHDR", data: new Array(13).fill(0) },
			{ type: "tEXt", data: [0x41] },
			{ type: "eXIf", data: [0x42] },
			{ type: "iTXt", data: [0x43] },
			{ type: "IDAT", data: [0x44] },
			{ type: "IEND", data: [] },
		]);
		const types = chunkTypes(stripPngMetadata(input));
		expect(types).not.toContain("tEXt");
		expect(types).not.toContain("eXIf");
		expect(types).not.toContain("iTXt");
	});

	it("keeps colour-critical chunks and the image data", () => {
		const input = png([
			{ type: "IHDR", data: new Array(13).fill(0) },
			{ type: "iCCP", data: [0x01] },
			{ type: "gAMA", data: [0x02] },
			{ type: "tEXt", data: [0x03] },
			{ type: "IDAT", data: [0x04] },
			{ type: "IEND", data: [] },
		]);
		expect(chunkTypes(stripPngMetadata(input))).toEqual([
			"IHDR",
			"iCCP",
			"gAMA",
			"IDAT",
			"IEND",
		]);
	});

	it("rejects a non-PNG", () => {
		expect(() =>
			stripPngMetadata(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer),
		).toThrow();
	});
});
