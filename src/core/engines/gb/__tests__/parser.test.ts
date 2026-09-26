import { describe, expect, it } from "vitest";
import { convertGb, parseGbRom } from "../parser";

function makeSyntheticGbRom(): Uint8Array {
	const rom = new Uint8Array(32768);

	// Entry point: nop, jp $0150
	rom[0x0100] = 0x00;
	rom[0x0101] = 0xc3;
	rom[0x0102] = 0x50;
	rom[0x0103] = 0x01;

	// Official Nintendo Logo (48 bytes)
	const logoRef = [
		0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00, 0x83,
		0x00, 0x0c, 0x00, 0x0d, 0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e,
		0xdc, 0xcc, 0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99, 0xbb, 0xbb, 0x67, 0x63,
		0x6e, 0x0e, 0xec, 0xcc, 0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
	];
	rom.set(logoRef, 0x0104);

	// Title: "TETRIS"
	const title = new TextEncoder().encode("TETRIS");
	rom.set(title, 0x0134);

	// CGB flag: 0x80 (CGB Enhanced)
	rom[0x0143] = 0x80;

	// Licensee: "01"
	rom[0x0144] = 0x30;
	rom[0x0145] = 0x31;

	// SGB flag: 0x03
	rom[0x0146] = 0x03;

	// Cartridge type: 0x01 (MBC1)
	rom[0x0147] = 0x01;

	// ROM size: 0x01 (64 KB)
	rom[0x0148] = 0x01;

	// RAM size: 0x00 (None)
	rom[0x0149] = 0x00;

	// Destination: 0x01 (Non-Japanese)
	rom[0x014a] = 0x01;

	// Version: 0x01
	rom[0x014c] = 0x01;

	// Calculate and write valid header checksum
	let chk = 0;
	for (let addr = 0x0134; addr <= 0x014c; addr++) {
		chk = (chk - (rom[addr] ?? 0) - 1) & 0xff;
	}
	rom[0x014d] = chk;

	// Global checksum
	rom[0x014e] = 0x12;
	rom[0x014f] = 0x34;

	return rom;
}

describe("Game Boy ROM Cartridge Header & Boot Logo Decoder", () => {
	it("parses cartridge header, MBC type, checksums, and architecture", () => {
		const rom = makeSyntheticGbRom();
		const info = parseGbRom(rom);

		expect(info.title).toBe("TETRIS");
		expect(info.cgbFlag).toBe(0x80);
		expect(info.cgbMode).toContain("Color Game Boy Enhanced");
		expect(info.sgbSupported).toBe(true);
		expect(info.cartridgeDescription).toBe("MBC1");
		expect(info.romSizeLabel).toBe("64 KB (4 banks)");
		expect(info.ramSizeLabel).toBe("None");
		expect(info.destinationLabel).toBe("Non-Japanese");
		expect(info.checksumValid).toBe(true);
		expect(info.logoValid).toBe(true);
		expect(info.logoPng).toBeDefined();
		expect(info.logoPng.length).toBeGreaterThan(0);
	});

	it("renders decoded Nintendo logo to a valid PNG image", () => {
		const rom = makeSyntheticGbRom();
		const pngBytes = convertGb(rom);

		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(pngBytes[2]).toBe(0x4e);
		expect(pngBytes[3]).toBe(0x47);
	});

	it("exports detailed JSON hardware manifest when requested", () => {
		const rom = makeSyntheticGbRom();
		const jsonBytes = convertGb(rom, { json: true });
		const parsed = JSON.parse(new TextDecoder("utf-8").decode(jsonBytes));

		expect(parsed.title).toBe("TETRIS");
		expect(parsed.cartridgeType).toBe("MBC1");
		expect(parsed.romSize).toBe("64 KB (4 banks)");
		expect(parsed.headerChecksumValid).toBe(true);
		expect(parsed.nintendoLogoValid).toBe(true);
	});
});
