import { describe, expect, it } from "vitest";
import { convertNeoToPng, neoToPngEngine } from "../index";

function createMockNeo(resolution = 0): Uint8Array {
	const buffer = new Uint8Array(128 + 32000);
	const view = new DataView(buffer.buffer);

	// Word 0: 0x0000
	view.setUint16(0, 0, false);
	// Word 1: resolution (0 = Low, 1 = Med, 2 = High)
	view.setUint16(2, resolution, false);

	// Palette (16 colors at bytes 4..35)
	// Color 0: Black (0x000)
	// Color 1: Red (0x700)
	// Color 2: Green (0x070)
	// Color 3: Blue (0x007)
	// Color 4: White (0x777)
	view.setUint16(4, 0x0000, false);
	view.setUint16(6, 0x0700, false);
	view.setUint16(8, 0x0070, false);
	view.setUint16(10, 0x0007, false);
	view.setUint16(12, 0x0777, false);

	// Fill pixel data with patterned planar words
	const dataOffset = 128;
	for (let i = 0; i < 32000; i += 8) {
		buffer[dataOffset + i] = 0xaa; // bp0
		buffer[dataOffset + i + 1] = 0xaa;
		buffer[dataOffset + i + 2] = 0x55; // bp1
		buffer[dataOffset + i + 3] = 0x55;
		buffer[dataOffset + i + 4] = 0x33; // bp2
		buffer[dataOffset + i + 5] = 0x33;
		buffer[dataOffset + i + 6] = 0x0f; // bp3
		buffer[dataOffset + i + 7] = 0x0f;
	}

	return buffer;
}

describe("neoToPngEngine", () => {
	it("probes successfully", async () => {
		expect(await neoToPngEngine.probe()).toBe(true);
	});

	it("throws on truncated or invalid buffer", () => {
		expect(() => convertNeoToPng(new Uint8Array([]))).toThrow(
			/smaller than the 128-byte/,
		);
		const badRes = new Uint8Array(200);
		new DataView(badRes.buffer).setUint16(2, 5, false); // invalid res
		expect(() => convertNeoToPng(badRes)).toThrow(
			/Unsupported resolution mode/,
		);
	});

	it("converts Mode 0 (320x200 16-color Low Res) to PNG", () => {
		const mockBytes = createMockNeo(0);
		const result = convertNeoToPng(mockBytes);

		expect(result.metadata.resolution).toBe("low");
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.palette.length).toBe(16);

		// PNG signature
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50);
		expect(result.pngBytes[2]).toBe(0x4e);
		expect(result.pngBytes[3]).toBe(0x47);
	});

	it("converts Mode 1 (640x200 Med Res) with aspect ratio correction", () => {
		const mockBytes = createMockNeo(1);
		const result = convertNeoToPng(mockBytes, { aspectCorrect: true });

		expect(result.metadata.resolution).toBe("medium");
		expect(result.metadata.width).toBe(640);
		expect(result.metadata.height).toBe(400); // 200 * 2
		expect(result.pngBytes[0]).toBe(0x89);
	});

	it("converts Mode 2 (640x400 High Res Mono)", () => {
		const mockBytes = createMockNeo(2);
		const result = convertNeoToPng(mockBytes);

		expect(result.metadata.resolution).toBe("high");
		expect(result.metadata.width).toBe(640);
		expect(result.metadata.height).toBe(400);
		expect(result.pngBytes[0]).toBe(0x89);
	});

	it("runs through engine runner", async () => {
		const mockBytes = createMockNeo(0);
		const outBuffer = await neoToPngEngine.run(
			mockBytes.buffer as ArrayBuffer,
			{},
			() => {},
		);

		const outBytes = new Uint8Array(outBuffer);
		expect(outBytes[0]).toBe(0x89);
		expect(outBytes[1]).toBe(0x50);
	});
});
