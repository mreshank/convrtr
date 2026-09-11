import { describe, expect, it } from "vitest";
import { icnsToPngEngine } from "../index";

function buildMockPng(width: number, height: number): Uint8Array {
	const data = new Uint8Array(33);
	// PNG magic: \x89PNG\r\n\x1a\n
	data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
	// IHDR chunk: length 13, type "IHDR"
	const view = new DataView(data.buffer);
	view.setUint32(8, 13, false);
	data.set([0x49, 0x48, 0x44, 0x52], 12);
	view.setUint32(16, width, false);
	view.setUint32(20, height, false);
	data[24] = 8; // bit depth
	data[25] = 6; // RGBA
	return data;
}

function buildMockIcns(): Uint8Array {
	const png128 = buildMockPng(128, 128);
	const png1024 = buildMockPng(1024, 1024);

	const chunk1Len = 8 + png128.length;
	const chunk2Len = 8 + png1024.length;
	const totalLen = 8 + chunk1Len + chunk2Len;

	const buffer = new ArrayBuffer(totalLen);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	// Magic: "icns"
	bytes.set([0x69, 0x63, 0x6e, 0x73], 0);
	// Total length
	view.setUint32(4, totalLen, false);

	// Chunk 1: "ic07" (128x128)
	let offset = 8;
	bytes.set([0x69, 0x63, 0x30, 0x37], offset);
	view.setUint32(offset + 4, chunk1Len, false);
	bytes.set(png128, offset + 8);

	// Chunk 2: "ic10" (1024x1024)
	offset += chunk1Len;
	bytes.set([0x69, 0x63, 0x31, 0x30], offset);
	view.setUint32(offset + 4, chunk2Len, false);
	bytes.set(png1024, offset + 8);

	return bytes;
}

describe("icnsToPngEngine", () => {
	it("probes successfully", async () => {
		const supported = await icnsToPngEngine.probe();
		expect(supported).toBe(true);
	});

	it("extracts the highest resolution PNG icon from an Apple .icns file", async () => {
		const mockIcns = buildMockIcns();
		const progress: string[] = [];

		const result = await icnsToPngEngine.run(
			mockIcns.buffer as ArrayBuffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const bytes = new Uint8Array(result);
		// Check PNG magic
		expect(bytes[0]).toBe(0x89);
		expect(bytes[1]).toBe(0x50);
		expect(bytes[2]).toBe(0x4e);
		expect(bytes[3]).toBe(0x47);

		// Dimensions should be 1024x1024 (from ic10)
		const view = new DataView(result);
		expect(view.getUint32(16, false)).toBe(1024);
		expect(view.getUint32(20, false)).toBe(1024);

		expect(progress).toContain("PARSE");
		expect(progress).toContain("FIND_BEST");
		expect(progress).toContain("DONE");
	});

	it("rejects non-ICNS or corrupt files", async () => {
		const tooSmall = new Uint8Array([1, 2, 3]);
		await expect(
			icnsToPngEngine.run(tooSmall.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/too small/i);

		const badMagic = new Uint8Array(32);
		badMagic.set([1, 2, 3, 4], 0);
		await expect(
			icnsToPngEngine.run(badMagic.buffer as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/invalid icns header/i);
	});
});
