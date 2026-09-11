import { describe, expect, it } from "vitest";
import { convertFitsToPng, parseFitsHeader } from "../parser";

function padCard(card: string): string {
	return card.padEnd(80, " ");
}

function createFitsBuffer(
	cards: string[],
	dataBytes: Uint8Array = new Uint8Array(0),
): Uint8Array {
	let cardString = "";
	for (const c of cards) {
		cardString += padCard(c);
	}
	cardString += padCard("END");

	// Pad header to multiple of 2880 bytes
	const rem = cardString.length % 2880;
	if (rem !== 0) {
		cardString += "".padEnd(2880 - rem, " ");
	}

	const headerBytes = new TextEncoder().encode(cardString);

	// Pad data to multiple of 2880 bytes
	const dataRem = dataBytes.length % 2880;
	const paddedDataLen =
		dataRem === 0 && dataBytes.length > 0
			? dataBytes.length
			: dataBytes.length + (dataRem === 0 ? 0 : 2880 - dataRem);

	const out = new Uint8Array(headerBytes.length + paddedDataLen);
	out.set(headerBytes, 0);
	out.set(dataBytes, headerBytes.length);
	return out;
}

describe("FITS Engine", () => {
	it("parses 8-bit grayscale FITS and converts to PNG", () => {
		const width = 4;
		const height = 4;
		const rawPixels = new Uint8Array([
			0, 50, 100, 150, 200, 255, 128, 64, 32, 16, 8, 4, 2, 1, 220, 180,
		]);

		const fits = createFitsBuffer(
			[
				"SIMPLE  =                    T / file conforms to FITS standard",
				"BITPIX  =                    8 / 8-bit unsigned integers",
				"NAXIS   =                    2 / 2D image",
				`NAXIS1  =                    ${width} / width`,
				`NAXIS2  =                    ${height} / height`,
				"OBJECT  = 'M31 ANDROMEDA'      / astronomical target",
				"TELESCOP= 'HUBBLE SPACE'       / telescope",
			],
			rawPixels,
		);

		const header = parseFitsHeader(fits);
		expect(header.simple).toBe(true);
		expect(header.bitpix).toBe(8);
		expect(header.naxis1).toBe(width);
		expect(header.naxis2).toBe(height);
		expect(header.objectName).toBe("M31 ANDROMEDA");
		expect(header.telescope).toBe("HUBBLE SPACE");

		const result = convertFitsToPng(fits, { stretch: "linear" });
		expect(result.width).toBe(width);
		expect(result.height).toBe(height);
		expect(result.bitpix).toBe(8);
		expect(result.pngBuffer.length).toBeGreaterThan(0);
		// Check PNG magic: 0x89 0x50 0x4E 0x47
		expect(result.pngBuffer[0]).toBe(0x89);
		expect(result.pngBuffer[1]).toBe(0x50);
		expect(result.pngBuffer[2]).toBe(0x4e);
		expect(result.pngBuffer[3]).toBe(0x47);
	});

	it("parses 16-bit signed FITS with BSCALE and BZERO", () => {
		const width = 2;
		const height = 2;
		const data = new Uint8Array(width * height * 2); // 4 pixels * 2 bytes = 8 bytes
		const view = new DataView(data.buffer);
		// Raw values with BZERO=32768, BSCALE=1 -> physical values 0, 1000, 32768, 65535
		view.setInt16(0, -32768, false); // 0
		view.setInt16(2, -31768, false); // 1000
		view.setInt16(4, 0, false); // 32768
		view.setInt16(6, 32767, false); // 65535

		const fits = createFitsBuffer(
			[
				"SIMPLE  =                    T / standard",
				"BITPIX  =                   16 / 16-bit signed",
				"NAXIS   =                    2 / 2D",
				`NAXIS1  =                    ${width} / width`,
				`NAXIS2  =                    ${height} / height`,
				"BZERO   =              32768.0 / zero offset",
				"BSCALE  =                  1.0 / scale",
				"EXPTIME =                300.0 / exposure seconds",
			],
			data,
		);

		const header = parseFitsHeader(fits);
		expect(header.bitpix).toBe(16);
		expect(header.bzero).toBe(32768);
		expect(header.exposureTime).toBe(300);

		const result = convertFitsToPng(fits, { stretch: "minmax" });
		expect(result.width).toBe(width);
		expect(result.height).toBe(height);
		expect(result.minValue).toBe(0);
		expect(result.maxValue).toBe(65535);
		expect(result.pngBuffer.length).toBeGreaterThan(0);
	});

	it("parses 32-bit floating point (BITPIX = -32) with asinh stretch", () => {
		const width = 2;
		const height = 2;
		const data = new Uint8Array(width * height * 4);
		const view = new DataView(data.buffer);
		view.setFloat32(0, 0.05, false);
		view.setFloat32(4, 1.2, false);
		view.setFloat32(8, 15.8, false);
		view.setFloat32(12, 100.0, false);

		const fits = createFitsBuffer(
			[
				"SIMPLE  =                    T",
				"BITPIX  =                  -32",
				"NAXIS   =                    2",
				`NAXIS1  =                    ${width}`,
				`NAXIS2  =                    ${height}`,
				"INSTRUME= 'NIRCam'            ",
			],
			data,
		);

		const header = parseFitsHeader(fits);
		expect(header.bitpix).toBe(-32);
		expect(header.instrument).toBe("NIRCam");

		const result = convertFitsToPng(fits, { stretch: "asinh" });
		expect(result.width).toBe(width);
		expect(result.height).toBe(height);
		expect(result.minValue).toBeCloseTo(0.05);
		expect(result.maxValue).toBeCloseTo(100.0);
		expect(result.pngBuffer.length).toBeGreaterThan(0);
	});

	it("parses 3D RGB FITS (NAXIS=3, NAXIS3=3)", () => {
		const width = 2;
		const height = 2;
		// 3 planes * 4 pixels = 12 bytes
		const data = new Uint8Array([
			255,
			0,
			255,
			0, // Red plane
			0,
			255,
			0,
			255, // Green plane
			128,
			128,
			128,
			128, // Blue plane
		]);

		const fits = createFitsBuffer(
			[
				"SIMPLE  =                    T",
				"BITPIX  =                    8",
				"NAXIS   =                    3",
				`NAXIS1  =                    ${width}`,
				`NAXIS2  =                    ${height}`,
				"NAXIS3  =                    3",
			],
			data,
		);

		const result = convertFitsToPng(fits);
		expect(result.width).toBe(width);
		expect(result.height).toBe(height);
		expect(result.pngBuffer.length).toBeGreaterThan(0);
	});

	it("throws on invalid header or non-FITS file", () => {
		const corrupted = new Uint8Array([1, 2, 3, 4, 5]);
		expect(() => parseFitsHeader(corrupted)).toThrow(/Invalid FITS file/);

		const missingEnd = new TextEncoder().encode(
			padCard("SIMPLE  =                    T").padEnd(2880, " "),
		);
		expect(() => parseFitsHeader(missingEnd)).toThrow(/missing END card/);
	});
});
