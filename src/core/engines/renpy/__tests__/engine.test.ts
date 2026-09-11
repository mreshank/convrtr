import { deflateSync, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { rpaToZipEngine } from "../index";

function buildMockRpa(): Uint8Array {
	const payload = new TextEncoder().encode('label start:\n    "Hello RenPy"');
	const fileOffset = 40;
	const fileLen = payload.length;
	const key = 0x42;

	// Build pickle bytecode for:
	// { "script.rpy": [ (fileOffset ^ key, fileLen ^ key, null) ] }
	const nameBytes = new TextEncoder().encode("script.rpy");
	const pickle: number[] = [
		0x7d, // EMPTY_DICT
		0x55,
		nameBytes.length,
		...nameBytes, // SHORT_BINUNICODE "script.rpy"
		0x5d, // EMPTY_LIST
		0x28, // MARK
	];

	// offset ^ key as 4-byte LE
	const encOffset = fileOffset ^ key;
	pickle.push(
		0x4a,
		encOffset & 0xff,
		(encOffset >> 8) & 0xff,
		(encOffset >> 16) & 0xff,
		(encOffset >> 24) & 0xff,
	);

	// length ^ key as 4-byte LE
	const encLen = fileLen ^ key;
	pickle.push(
		0x4a,
		encLen & 0xff,
		(encLen >> 8) & 0xff,
		(encLen >> 16) & 0xff,
		(encLen >> 24) & 0xff,
	);

	pickle.push(0x4e); // NONE (prefix)
	pickle.push(0x74); // TUPLE
	pickle.push(0x61); // APPEND to list
	pickle.push(0x73); // SETITEM in dict
	pickle.push(0x2e); // STOP

	const compressedIndex = deflateSync(new Uint8Array(pickle));

	// Index starts at offset 80 (0x50)
	const indexOffset = 80;
	const totalSize = indexOffset + compressedIndex.length;

	const buffer = new Uint8Array(totalSize);

	// Header line (must end with \n, padded with spaces or zeros to indexOffset)
	const headerText = `RPA-3.0 0000000000000050 00000042\n`;
	const headerBytes = new TextEncoder().encode(headerText);
	buffer.set(headerBytes, 0);

	// Write payload at fileOffset (40)
	buffer.set(payload, fileOffset);

	// Write compressed index at indexOffset (80)
	buffer.set(compressedIndex, indexOffset);

	return buffer;
}

describe("rpaToZipEngine", () => {
	it("probes successfully", async () => {
		expect(await rpaToZipEngine.probe()).toBe(true);
	});

	it("unpacks RPA-3.0 archive into structured ZIP", async () => {
		const mockRpa = buildMockRpa();
		const result = await rpaToZipEngine.run(
			mockRpa.buffer as ArrayBuffer,
			{},
			() => {},
		);
		expect(result.byteLength).toBeGreaterThan(0);

		const unzipped = unzipSync(new Uint8Array(result));
		expect(Object.keys(unzipped)).toContain("script.rpy");

		const text = new TextDecoder().decode(unzipped["script.rpy"]);
		expect(text).toContain("Hello RenPy");
	});

	it("rejects non-RPA files or invalid headers", async () => {
		const tooSmall = new Uint8Array([1, 2, 3]);
		await expect(
			rpaToZipEngine.run(tooSmall.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/too small/i);

		const badHeader = new TextEncoder().encode(
			"NOT_AN_RPA_FILE_AT_ALL_HERE_LONGER_HEADER\n",
		);
		await expect(
			rpaToZipEngine.run(badHeader.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/unrecognized header/i);
	});
});
