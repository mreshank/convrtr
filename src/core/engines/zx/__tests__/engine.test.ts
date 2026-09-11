import { describe, expect, it } from "vitest";
import { convertZxToPng, zxToPngEngine } from "../index";

describe("Sinclair ZX Spectrum (.scr) to PNG engine", () => {
	// Synthesizes a valid 6,912-byte ZX Spectrum screen buffer
	function createTestScr(): Uint8Array {
		const buffer = new Uint8Array(6912);

		// Fill bitmap (0..6143) with diagonal stripe pattern
		for (let i = 0; i < 6144; i++) {
			buffer[i] = i % 2 === 0 ? 0xaa : 0x55;
		}

		// Fill attributes (6144..6911)
		// 768 character cells (32 columns x 24 rows)
		for (let c = 0; c < 768; c++) {
			const ink = (c % 7) + 1; // 1..7
			const paper = 0; // Black
			const bright = c % 2 === 0 ? 0x40 : 0x00; // Alternate bright
			buffer[6144 + c] = bright | (paper << 3) | ink;
		}

		return buffer;
	}

	it("decodes valid 6912-byte .scr to 256x192 PNG", () => {
		const scr = createTestScr();
		const result = convertZxToPng(scr, { scale: 1 });

		expect(result.metadata.width).toBe(256);
		expect(result.metadata.height).toBe(192);
		expect(result.metadata.brightUsed).toBe(true);
		expect(result.metadata.inkColorsUsed.length).toBeGreaterThan(0);

		// PNG signature check
		const png = result.pngBytes;
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50); // P
		expect(png[2]).toBe(0x4e); // N
		expect(png[3]).toBe(0x47); // G
	});

	it("supports integer pixel scaling (e.g. 2x -> 512x384)", () => {
		const scr = createTestScr();
		const result2x = convertZxToPng(scr, { scale: 2 });

		expect(result2x.metadata.width).toBe(512);
		expect(result2x.metadata.height).toBe(384);
		expect(result2x.pngBytes.byteLength).toBeGreaterThan(0);
	});

	it("supports color inversion", () => {
		const scr = createTestScr();
		const normal = convertZxToPng(scr, { scale: 1, invertColors: false });
		const inverted = convertZxToPng(scr, { scale: 1, invertColors: true });

		expect(normal.pngBytes.length).toBeGreaterThan(100);
		expect(inverted.pngBytes.length).toBeGreaterThan(100);
	});

	it("handles 128-byte tape emulator header (.sp/.tap dump)", () => {
		const raw = createTestScr();
		const tapeDump = new Uint8Array(128 + 6912);
		tapeDump.set(raw, 128);

		const result = convertZxToPng(tapeDump, { scale: 1 });
		expect(result.metadata.width).toBe(256);
		expect(result.metadata.height).toBe(192);
	});

	it("throws an error when file size is under 6912 bytes", () => {
		expect(() => convertZxToPng(new Uint8Array(2000))).toThrow(
			"Invalid ZX Spectrum screen",
		);
	});

	it("engine probe and run returns ArrayBuffer", async () => {
		expect(await zxToPngEngine.probe()).toBe(true);

		const scr = createTestScr();
		const output = await zxToPngEngine.run(
			scr.buffer as ArrayBuffer,
			{ scale: 1 },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(100);
	});
});
