import { describe, expect, it } from "vitest";
import { convertNds, formatNdsManifest, parseNdsRom } from "../parser";

function makeSyntheticNdsRom(): Uint8Array {
	const BANNER_OFFSET = 512;
	const BANNER_SIZE = 0x840;
	const rom = new Uint8Array(BANNER_OFFSET + BANNER_SIZE);
	const view = new DataView(rom.buffer);

	// 1. Header (512 bytes)
	const encoder = new TextEncoder();
	rom.set(encoder.encode("MARIO_KART_D"), 0); // 12 bytes
	rom.set(encoder.encode("AMCE"), 12); // Game Code
	rom.set(encoder.encode("01"), 16); // Maker Code: Nintendo
	rom[18] = 0x02; // Unit code: NDS + DSi
	rom[20] = 26; // 64 MB (1 << 26)

	// Banner offset at 0x68
	view.setUint32(0x68, BANNER_OFFSET, true);

	// 2. Banner Data
	// Version 0x0001
	view.setUint16(BANNER_OFFSET, 0x0001, true);

	// Palette at BANNER_OFFSET + 0x220 (16 BGR555 words)
	const palOffset = BANNER_OFFSET + 0x220;
	view.setUint16(palOffset + 0 * 2, 0x0000, true); // Transparent
	view.setUint16(palOffset + 1 * 2, 0x001f, true); // Red (r=31)
	view.setUint16(palOffset + 2 * 2, 0x03e0, true); // Green (g=31)
	view.setUint16(palOffset + 3 * 2, 0x7c00, true); // Blue (b=31)

	// Icon bitmap at BANNER_OFFSET + 0x020 (512 bytes)
	// Fill tile 0 with alternating pixel indices 1 and 2 (byte = 0x21)
	const iconOffset = BANNER_OFFSET + 0x020;
	for (let i = 0; i < 512; i++) {
		rom[iconOffset + i] = 0x21; // low=1, high=2
	}

	// Titles at BANNER_OFFSET + 0x240 (6 * 256 bytes UTF-16LE)
	// Japanese (lang 0)
	const jpBytes = new Uint8Array(
		new Uint16Array([0x30de, 0x30ea, 0x30aa]).buffer,
	); // "マリオ"
	rom.set(jpBytes, BANNER_OFFSET + 0x240);

	// English (lang 1) at BANNER_OFFSET + 0x340
	const enStr = "Mario Kart DS\nNintendo";
	const enChars = new Uint16Array(enStr.length);
	for (let i = 0; i < enStr.length; i++) {
		enChars[i] = enStr.charCodeAt(i);
	}
	rom.set(new Uint8Array(enChars.buffer), BANNER_OFFSET + 0x340);

	return rom;
}

describe("Nintendo DS ROM Banner & Icon Decoder", () => {
	it("parses cartridge header, capacity, and unit code", () => {
		const rom = makeSyntheticNdsRom();
		const info = parseNdsRom(rom);

		expect(info.gameTitle).toBe("MARIO_KART_D");
		expect(info.gameCode).toBe("AMCE");
		expect(info.makerCode).toBe("01");
		expect(info.unitCode).toBe(2);
		expect(info.unitCodeDescription).toBe("Nintendo DS + Nintendo DSi");
		expect(info.deviceCapacityBytes).toBe(67108864); // 64MB
		expect(info.bannerVersion).toBe(1);
	});

	it("extracts 6-language title banners", () => {
		const rom = makeSyntheticNdsRom();
		const info = parseNdsRom(rom);

		expect(info.titles.english).toBe("Mario Kart DS\nNintendo");
		expect(info.titles.japanese).toBe("マリオ");
		expect(info.titles.french).toBe("");
	});

	it("decodes 32x32 4-bpp tiled icon to valid PNG", () => {
		const rom = makeSyntheticNdsRom();
		const info = parseNdsRom(rom);

		expect(info.iconPng).not.toBeNull();
		const png = info.iconPng ?? new Uint8Array(0);
		// Check PNG signature: 0x89 'P' 'N' 'G' 0x0D 0x0A 0x1A 0x0A
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
		expect(png[2]).toBe(0x4e);
		expect(png[3]).toBe(0x47);
	});

	it("formats JSON metadata manifest", () => {
		const rom = makeSyntheticNdsRom();
		const info = parseNdsRom(rom);
		const manifestJson = formatNdsManifest(info);
		const parsed = JSON.parse(manifestJson);

		expect(parsed.gameCode).toBe("AMCE");
		expect(parsed.titles.english).toContain("Mario Kart DS");
		expect(parsed.hasIcon).toBe(true);
	});

	it("converts to PNG buffer directly", () => {
		const rom = makeSyntheticNdsRom();
		const png = convertNds(rom, { json: false });
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50);
	});
});
