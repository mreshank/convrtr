import { describe, expect, it } from "vitest";
import { convertPcdToPng, pcdToPngEngine } from "../index";

function createMockPcdBase16(): Uint8Array {
	// Offset 0x02000 (8192) + 36864 bytes for Base/16 (192 x 128)
	const totalSize = 0x02000 + 36864;
	const buffer = new Uint8Array(totalSize);

	// Sector 1 Header (offset 2048): "PCD_IPI"
	const headerText = "PCD_IPI";
	for (let i = 0; i < headerText.length; i++) {
		buffer[2048 + i] = headerText.charCodeAt(i);
	}

	// Orientation byte at 0x0E02 (3586): 0 (normal landscape)
	buffer[3586] = 0;

	// Fill Base/16 plane:
	// Y plane: 24576 bytes
	const yStart = 0x02000;
	for (let i = 0; i < 24576; i++) {
		buffer[yStart + i] = 160; // Light gray luma
	}
	// C1 plane: 6144 bytes
	const c1Start = yStart + 24576;
	for (let i = 0; i < 6144; i++) {
		buffer[c1Start + i] = 156; // Neutral chroma C1
	}
	// C2 plane: 6144 bytes
	const c2Start = c1Start + 6144;
	for (let i = 0; i < 6144; i++) {
		buffer[c2Start + i] = 137; // Neutral chroma C2
	}

	return buffer;
}

describe("Kodak Photo CD Parser Engine", () => {
	it("converts Base/16 Kodak Photo CD into 32-bit RGBA PNG", () => {
		const pcdBytes = createMockPcdBase16();
		const result = convertPcdToPng(pcdBytes, { resolution: "base16" });

		expect(result.pngBuffer.byteLength).toBeGreaterThan(64);
		expect(result.metadata.width).toBe(192);
		expect(result.metadata.height).toBe(128);
		expect(result.metadata.resolution).toBe("base16");
		expect(result.metadata.colorSpace).toBe("PhotoYCC");

		// Validate PNG 8-byte signature: 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'
		const pngHeader = new Uint8Array(result.pngBuffer.slice(0, 8));
		expect(pngHeader[0]).toBe(0x89);
		expect(pngHeader[1]).toBe(0x50); // P
		expect(pngHeader[2]).toBe(0x4e); // N
		expect(pngHeader[3]).toBe(0x47); // G
	});

	it("converts small mock PCD buffer gracefully", () => {
		const smallMock = new Uint8Array(128);
		smallMock.set([0x50, 0x43, 0x44, 0x5f], 0); // "PCD_"

		const result = convertPcdToPng(smallMock);
		expect(result.pngBuffer.byteLength).toBeGreaterThan(32);
		expect(result.metadata.width).toBe(16);
		expect(result.metadata.height).toBe(16);
	});

	it("throws error on truncated input smaller than 16 bytes", () => {
		expect(() => convertPcdToPng(new Uint8Array([1, 2, 3]))).toThrow(
			"Invalid PCD file: File size is smaller than the minimum header size.",
		);
	});

	it("runs through the engine interface", async () => {
		const pcdBytes = createMockPcdBase16();
		const output = await pcdToPngEngine.run(
			pcdBytes.buffer.slice(0) as ArrayBuffer,
			{ resolution: "base16" },
			() => {},
		);
		expect(output.byteLength).toBeGreaterThan(64);
	});
});
