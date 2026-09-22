import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { extractXp3ToZip, parseXp3Archive } from "../parser";

const XP3_MAGIC = [
	0x58, 0x50, 0x33, 0x0d, 0x0a, 0x20, 0x0a, 0x1a, 0x8b, 0x67, 0x01,
];

function makeSyntheticXp3(): Uint8Array {
	const textEncoder = new TextEncoder();
	const file1Data = textEncoder.encode(
		"*start\n[playbgm file=theme.ogg]\nHello world!",
	);
	const file2Data = textEncoder.encode("FAKE_PNG_HEADER_DATA_12345");

	const file1Offset = 19;
	const file2Offset = file1Offset + file1Data.length;
	const indexOffset = file2Offset + file2Data.length;

	// Build index buffer
	// Helper to build UTF-16LE string bytes
	function encodeUtf16(str: string): Uint8Array {
		const arr = new Uint16Array(str.length);
		for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
		return new Uint8Array(arr.buffer);
	}

	function buildFileChunk(
		name: string,
		fileOffset: number,
		fileLen: number,
	): Uint8Array {
		const nameBytes = encodeUtf16(name);
		const nameChars = name.length;

		// info chunk: 4 bytes flags + 8 bytes orig + 8 bytes arch + 2 bytes chars + nameBytes
		const infoDataSize = 4 + 8 + 8 + 2 + nameBytes.length;
		const infoChunk = new Uint8Array(12 + infoDataSize);
		const infoView = new DataView(infoChunk.buffer);
		infoChunk.set(textEncoder.encode("info"), 0);
		infoView.setBigUint64(4, BigInt(infoDataSize), true);
		infoView.setUint32(12, 0, true); // flags
		infoView.setBigUint64(16, BigInt(fileLen), true); // orig
		infoView.setBigUint64(24, BigInt(fileLen), true); // arch
		infoView.setUint16(32, nameChars, true); // name chars
		infoChunk.set(nameBytes, 34);

		// segs chunk: 1 segment (28 bytes)
		const segsDataSize = 28;
		const segsChunk = new Uint8Array(12 + segsDataSize);
		const segsView = new DataView(segsChunk.buffer);
		segsChunk.set(textEncoder.encode("segs"), 0);
		segsView.setBigUint64(4, BigInt(segsDataSize), true);
		segsView.setUint32(12, 0, true); // flags: uncompressed
		segsView.setBigUint64(16, BigInt(fileOffset), true); // offset
		segsView.setBigUint64(24, BigInt(fileLen), true); // orig
		segsView.setBigUint64(32, BigInt(fileLen), true); // arch

		// File chunk
		const totalSubSize = infoChunk.length + segsChunk.length;
		const fileChunk = new Uint8Array(12 + totalSubSize);
		const fileView = new DataView(fileChunk.buffer);
		fileChunk.set(textEncoder.encode("File"), 0);
		fileView.setBigUint64(4, BigInt(totalSubSize), true);
		fileChunk.set(infoChunk, 12);
		fileChunk.set(segsChunk, 12 + infoChunk.length);

		return fileChunk;
	}

	const chunk1 = buildFileChunk(
		"scenario/main.ks",
		file1Offset,
		file1Data.length,
	);
	const chunk2 = buildFileChunk("data/bg.png", file2Offset, file2Data.length);

	const rawIndex = new Uint8Array(chunk1.length + chunk2.length);
	rawIndex.set(chunk1, 0);
	rawIndex.set(chunk2, chunk1.length);

	// Index wrapper: 0x00 flag (uncompressed) + 8 bytes uncompSize + rawIndex
	const indexWrapper = new Uint8Array(1 + 8 + rawIndex.length);
	const indexView = new DataView(indexWrapper.buffer);
	indexWrapper[0] = 0x00;
	indexView.setBigUint64(1, BigInt(rawIndex.length), true);
	indexWrapper.set(rawIndex, 9);

	// Assemble final archive
	const totalSize = indexOffset + indexWrapper.length;
	const archive = new Uint8Array(totalSize);
	const archView = new DataView(archive.buffer);

	// Magic
	archive.set(new Uint8Array(XP3_MAGIC), 0);
	// Index offset at byte 11
	archView.setBigUint64(11, BigInt(indexOffset), true);

	// File data
	archive.set(file1Data, file1Offset);
	archive.set(file2Data, file2Offset);

	// Index
	archive.set(indexWrapper, indexOffset);

	return archive;
}

describe("KiriKiri XP3 Archive Parser & Extractor", () => {
	it("parses synthetic XP3 file index and file entries", () => {
		const raw = makeSyntheticXp3();
		const parsed = parseXp3Archive(raw);

		expect(parsed.magic).toBe("XP3");
		expect(parsed.files).toHaveLength(2);
		expect(parsed.files[0]?.name).toBe("scenario/main.ks");
		expect(parsed.files[1]?.name).toBe("data/bg.png");
		expect(parsed.files[0]?.originalSize).toBeGreaterThan(10);
	});

	it("extracts all files into a valid ZIP archive", () => {
		const raw = makeSyntheticXp3();
		const zipBuffer = extractXp3ToZip(raw);

		expect(zipBuffer.length).toBeGreaterThan(0);
		const unzipped = unzipSync(zipBuffer);

		expect(unzipped["scenario/main.ks"]).toBeDefined();
		expect(unzipped["data/bg.png"]).toBeDefined();
		expect(unzipped["manifest.json"]).toBeDefined();

		const content = new TextDecoder().decode(unzipped["scenario/main.ks"]);
		expect(content).toContain("playbgm");
	});

	it("exports JSON summary when option is set", () => {
		const raw = makeSyntheticXp3();
		const jsonBytes = extractXp3ToZip(raw, { json: true });
		const json = JSON.parse(new TextDecoder().decode(jsonBytes));

		expect(json.format).toBe("KiriKiri XP3 Archive");
		expect(json.fileCount).toBe(2);
		expect(json.files[0].name).toBe("scenario/main.ks");
	});

	it("rejects truncated or corrupted files", () => {
		expect(() => parseXp3Archive(new Uint8Array(10))).toThrow("file too small");
		const badMagic = new Uint8Array(30);
		expect(() => parseXp3Archive(badMagic)).toThrow("missing 'XP3' header");
	});
});
