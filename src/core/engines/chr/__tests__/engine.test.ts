import { describe, expect, it } from "vitest";
import { convertChrToPng } from "../parser";

describe("chr engine", () => {
	it("rejects files smaller than 16 bytes", () => {
		const tooSmall = new Uint8Array(10);
		expect(() => convertChrToPng(tooSmall)).toThrow(
			/must be at least 16 bytes for a single 8x8 tile/,
		);
	});

	it("decodes a single 8x8 tile (16 bytes)", () => {
		// Tile 1: 16 bytes. Row 0 has plane0=0x80 (bit 7=1), plane1=0x80 (bit 7=1) -> color index 3 (black)
		const tile = new Uint8Array(16);
		tile[0] = 0x80; // plane 0 row 0
		tile[8] = 0x80; // plane 1 row 0

		const result = convertChrToPng(tile);
		expect(result.metadata.tileCount).toBe(1);
		expect(result.metadata.width).toBe(128); // 16 tiles wide grid minimum
		expect(result.metadata.height).toBe(8);
		expect(result.pngBytes.length).toBeGreaterThan(50);
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50); // 'P'
		expect(result.pngBytes[2]).toBe(0x4e); // 'N'
		expect(result.pngBytes[3]).toBe(0x47); // 'G'
	});

	it("decodes a standard 8KB CHR bank (512 tiles, 128x256 pixels)", () => {
		const chrBank = new Uint8Array(8192);
		// Fill with dummy tile patterns
		for (let i = 0; i < chrBank.length; i += 16) {
			chrBank[i] = 0xff; // plane 0
			chrBank[i + 8] = 0xaa; // plane 1
		}

		const result = convertChrToPng(chrBank);
		expect(result.metadata.tileCount).toBe(512);
		expect(result.metadata.width).toBe(128);
		expect(result.metadata.height).toBe(256);
		expect(result.metadata.paletteName).toBe("grayscale");
	});

	it("supports 2x integer scaling and retro gameboy palette", () => {
		const chrData = new Uint8Array(256); // 16 tiles
		const result = convertChrToPng(chrData, { scale: 2, palette: "gameboy" });

		expect(result.metadata.width).toBe(256);
		expect(result.metadata.height).toBe(16);
		expect(result.metadata.paletteName).toBe("gameboy");
	});
});
