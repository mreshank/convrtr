import { describe, expect, it } from "vitest";
import { convertHdrToPng, hdrToPngEngine } from "../index";

function createMockHdr(
	width: number,
	height: number,
	options: { rle?: boolean } = { rle: true },
): Uint8Array {
	const headerStr = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nEXPOSURE=1.000000\n\n-Y ${height} +X ${width}\n`;
	const headerBytes = new TextEncoder().encode(headerStr);

	const parts: Uint8Array[] = [headerBytes];

	if (options.rle && width >= 8) {
		// New-style adaptive RLE scanlines
		for (let y = 0; y < height; y++) {
			const scanlineHeader = new Uint8Array([
				0x02,
				0x02,
				(width >> 8) & 0xff,
				width & 0xff,
			]);
			parts.push(scanlineHeader);

			// For each channel (R, G, B, E)
			for (let ch = 0; ch < 4; ch++) {
				// Run of length width with byte value
				const val = ch === 3 ? 128 : 200; // E=128 (exponent 0), R/G/B=200
				if (width <= 127) {
					// Single run
					parts.push(new Uint8Array([128 + width, val]));
				} else {
					let remaining = width;
					while (remaining > 0) {
						const chunk = Math.min(remaining, 127);
						parts.push(new Uint8Array([128 + chunk, val]));
						remaining -= chunk;
					}
				}
			}
		}
	} else {
		// Uncompressed scanlines
		const pixelData = new Uint8Array(width * height * 4);
		for (let i = 0; i < width * height; i++) {
			pixelData[i * 4] = 180; // R
			pixelData[i * 4 + 1] = 120; // G
			pixelData[i * 4 + 2] = 60; // B
			pixelData[i * 4 + 3] = 130; // E
		}
		parts.push(pixelData);
	}

	const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const p of parts) {
		result.set(p, offset);
		offset += p.length;
	}
	return result;
}

describe("hdrToPngEngine", () => {
	it("probes successfully", async () => {
		expect(await hdrToPngEngine.probe()).toBe(true);
	});

	it("throws on empty or non-radiance buffer", () => {
		expect(() => convertHdrToPng(new Uint8Array([]))).toThrow(
			/Buffer size is too small/,
		);
		expect(() =>
			convertHdrToPng(
				new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
			),
		).toThrow(/Missing Radiance identifier/);
	});

	it("decodes new-style RLE compressed Radiance HDR", () => {
		const mockBytes = createMockHdr(16, 8, { rle: true });
		const result = convertHdrToPng(mockBytes);

		expect(result.metadata.width).toBe(16);
		expect(result.metadata.height).toBe(8);
		expect(result.metadata.format).toBe("32-bit_rle_rgbe");
		// Verify PNG signature
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50); // 'P'
		expect(result.pngBytes[2]).toBe(0x4e); // 'N'
		expect(result.pngBytes[3]).toBe(0x47); // 'G'
	});

	it("decodes uncompressed Radiance HDR scanlines", () => {
		const mockBytes = createMockHdr(4, 4, { rle: false });
		const result = convertHdrToPng(mockBytes);

		expect(result.metadata.width).toBe(4);
		expect(result.metadata.height).toBe(4);
		expect(result.pngBytes.length).toBeGreaterThan(50);
	});

	it("runs through engine runner with custom exposure and gamma", async () => {
		const mockBytes = createMockHdr(10, 5, { rle: true });
		const outBuffer = await hdrToPngEngine.run(
			mockBytes.buffer as ArrayBuffer,
			{ exposure: 1.5, gamma: 2.4 },
			() => {},
		);

		const outBytes = new Uint8Array(outBuffer);
		expect(outBytes[0]).toBe(0x89);
		expect(outBytes[1]).toBe(0x50);
	});
});
