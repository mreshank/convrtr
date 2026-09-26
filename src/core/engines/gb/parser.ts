/**
 * Nintendo Game Boy & Game Boy Color Cartridge Header & Boot Logo Decoder
 *
 * Reads standard Game Boy (DMG) and Game Boy Color (CGB) cartridge headers
 * (offset 0x0100 to 0x014F). Decodes the 48-byte Nintendo scrolling boot logo
 * bitmap into a 48x8 (and scaled 192x32) retro monochrome PNG image.
 * Evaluates MBC memory bank controller type, ROM size, RAM size, Super Game Boy
 * support, Color Game Boy mode, and header checksum verification.
 *
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

import { encodeRgbaToPng } from "../dds/parser";

export interface GbRomInfo {
	title: string;
	cgbFlag: number;
	cgbMode: string;
	sgbFlag: number;
	sgbSupported: boolean;
	cartridgeType: number;
	cartridgeDescription: string;
	romSizeBytes: number;
	romSizeLabel: string;
	ramSizeBytes: number;
	ramSizeLabel: string;
	destinationCode: number;
	destinationLabel: string;
	licenseeCode: string;
	version: number;
	headerChecksum: number;
	headerChecksumCalculated: number;
	checksumValid: boolean;
	globalChecksum: number;
	logoValid: boolean;
	logoPng: Uint8Array;
}

const CARTRIDGE_TYPES: Record<number, string> = {
	0: "ROM ONLY",
	1: "MBC1",
	2: "MBC1+RAM",
	3: "MBC1+RAM+BATTERY",
	5: "MBC2",
	6: "MBC2+BATTERY",
	8: "ROM+RAM",
	9: "ROM+RAM+BATTERY",
	11: "MMM01",
	12: "MMM01+RAM",
	13: "MMM01+RAM+BATTERY",
	15: "MBC3+TIMER+BATTERY",
	16: "MBC3+TIMER+RAM+BATTERY",
	17: "MBC3",
	18: "MBC3+RAM",
	19: "MBC3+RAM+BATTERY",
	25: "MBC5",
	26: "MBC5+RAM",
	27: "MBC5+RAM+BATTERY",
	28: "MBC5+RUMBLE",
	29: "MBC5+RUMBLE+RAM",
	30: "MBC5+RUMBLE+RAM+BATTERY",
	32: "MBC6",
	34: "MBC7+SENSOR+RUMBLE+RAM+BATTERY",
	252: "POCKET CAMERA",
	253: "BANDAI TAMA5",
	254: "HuC3",
	255: "HuC1+RAM+BATTERY",
};

const ROM_SIZES: Record<number, { bytes: number; label: string }> = {
	0: { bytes: 32 * 1024, label: "32 KB (2 banks)" },
	1: { bytes: 64 * 1024, label: "64 KB (4 banks)" },
	2: { bytes: 128 * 1024, label: "128 KB (8 banks)" },
	3: { bytes: 256 * 1024, label: "256 KB (16 banks)" },
	4: { bytes: 512 * 1024, label: "512 KB (32 banks)" },
	5: { bytes: 1024 * 1024, label: "1 MB (64 banks)" },
	6: { bytes: 2 * 1024 * 1024, label: "2 MB (128 banks)" },
	7: { bytes: 4 * 1024 * 1024, label: "4 MB (256 banks)" },
	8: { bytes: 8 * 1024 * 1024, label: "8 MB (512 banks)" },
};

const RAM_SIZES: Record<number, { bytes: number; label: string }> = {
	0: { bytes: 0, label: "None" },
	1: { bytes: 2 * 1024, label: "2 KB" },
	2: { bytes: 8 * 1024, label: "8 KB (1 bank)" },
	3: { bytes: 32 * 1024, label: "32 KB (4 banks of 8KB)" },
	4: { bytes: 128 * 1024, label: "128 KB (16 banks of 8KB)" },
	5: { bytes: 64 * 1024, label: "64 KB (8 banks of 8KB)" },
};

// Official Nintendo Logo 48-byte reference hash
const NINTENDO_LOGO_REF = [
	0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00, 0x83, 0x00,
	0x0c, 0x00, 0x0d, 0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e, 0xdc, 0xcc,
	0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99, 0xbb, 0xbb, 0x67, 0x63, 0x6e, 0x0e, 0xec,
	0xcc, 0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
];

// Classic Game Boy DMG monochrome palette colors (RGB)
const GB_BG_COLOR = [155, 188, 15, 255]; // Light green-yellow
const GB_INK_COLOR = [15, 56, 15, 255]; // Dark green

export function parseGbRom(raw: Uint8Array): GbRomInfo {
	if (raw.length < 0x0150) {
		throw new Error(
			`Invalid Game Boy ROM: file size too small (${raw.length} bytes, minimum 336 bytes for header).`,
		);
	}

	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

	// 1. Nintendo Logo verification and decoding (0x0104 - 0x0133, 48 bytes)
	const logoBytes = raw.subarray(0x0104, 0x0134);
	let logoMatch = true;
	for (let i = 0; i < 48; i++) {
		if (logoBytes[i] !== NINTENDO_LOGO_REF[i]) {
			logoMatch = false;
			break;
		}
	}

	// Decode 48-byte logo bitmap into 48x8 grid (and scale 4x to 192x32)
	const grid: boolean[][] = [];
	for (let y = 0; y < 8; y++) {
		grid.push(new Array(48).fill(false));
	}

	// 12 blocks of 4 bytes each = 48 bytes
	for (let block = 0; block < 12; block++) {
		const blockX = block * 4;
		const blockOffset = block * 4;

		for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
			const b = logoBytes[blockOffset + byteIdx] ?? 0;
			const row0 = byteIdx * 2;
			const row1 = byteIdx * 2 + 1;

			// Row 0: high nibble (bits 3, 2, 1, 0)
			const hi = (b >> 4) & 0x0f;
			const r0 = grid[row0];
			if (r0) {
				r0[blockX + 0] = Boolean((hi >> 3) & 1);
				r0[blockX + 1] = Boolean((hi >> 2) & 1);
				r0[blockX + 2] = Boolean((hi >> 1) & 1);
				r0[blockX + 3] = Boolean(hi & 1);
			}

			// Row 1: low nibble (bits 3, 2, 1, 0)
			const lo = b & 0x0f;
			const r1 = grid[row1];
			if (r1) {
				r1[blockX + 0] = Boolean((lo >> 3) & 1);
				r1[blockX + 1] = Boolean((lo >> 2) & 1);
				r1[blockX + 2] = Boolean((lo >> 1) & 1);
				r1[blockX + 3] = Boolean(lo & 1);
			}
		}
	}

	// Render scaled 192x32 RGBA image (4x scale for crisp pixel art)
	const scale = 4;
	const outW = 48 * scale;
	const outH = 8 * scale;
	const rgba = new Uint8Array(outW * outH * 4);

	for (let y = 0; y < 8; y++) {
		for (let x = 0; x < 48; x++) {
			const isInk = grid[y]?.[x] ?? false;
			const color = isInk ? GB_INK_COLOR : GB_BG_COLOR;

			for (let dy = 0; dy < scale; dy++) {
				for (let dx = 0; dx < scale; dx++) {
					const px = x * scale + dx;
					const py = y * scale + dy;
					const idx = (py * outW + px) * 4;
					rgba[idx] = color[0] ?? 0;
					rgba[idx + 1] = color[1] ?? 0;
					rgba[idx + 2] = color[2] ?? 0;
					rgba[idx + 3] = color[3] ?? 255;
				}
			}
		}
	}

	const logoPng = encodeRgbaToPng(outW, outH, rgba);

	// 2. Title & CGB flag (0x0134 - 0x0143)
	const rawTitle = raw.subarray(0x0134, 0x0143);
	let title = "";
	for (let i = 0; i < rawTitle.length; i++) {
		const ch = rawTitle[i] ?? 0;
		if (ch === 0) break;
		if (ch >= 32 && ch <= 126) title += String.fromCharCode(ch);
	}
	title = title.trim();

	const cgbFlag = raw[0x0143] ?? 0;
	let cgbMode = "Game Boy (DMG Monochrome)";
	if (cgbFlag === 0x80) {
		cgbMode = "Color Game Boy Enhanced (Supports DMG + CGB)";
	} else if (cgbFlag === 0xc0) {
		cgbMode = "Color Game Boy Only (CGB Exclusive)";
	}

	// 3. Licensee, SGB, Cartridge type
	const licenseeCode = new TextDecoder("ascii")
		.decode(raw.subarray(0x0144, 0x0146))
		.replace(/\0/g, "")
		.trim();

	const sgbFlag = raw[0x0146] ?? 0;
	const sgbSupported = sgbFlag === 0x03;

	const cartridgeType = raw[0x0147] ?? 0;
	const cartridgeDescription =
		CARTRIDGE_TYPES[cartridgeType] ??
		`Unknown Cartridge (0x${cartridgeType.toString(16).toUpperCase()})`;

	// 4. ROM & RAM sizes
	const romSizeCode = raw[0x0148] ?? 0;
	const romInfo = ROM_SIZES[romSizeCode] ?? {
		bytes: 32 * 1024,
		label: "32 KB",
	};

	const ramSizeCode = raw[0x0149] ?? 0;
	const ramInfo = RAM_SIZES[ramSizeCode] ?? { bytes: 0, label: "None" };

	// 5. Destination & Version
	const destinationCode = raw[0x014a] ?? 0;
	const destinationLabel =
		destinationCode === 0x00 ? "Japanese" : "Non-Japanese";
	const version = raw[0x014c] ?? 0;

	// 6. Header checksum calculation (0x0134 to 0x014C)
	let checksumCalc = 0;
	for (let addr = 0x0134; addr <= 0x014c; addr++) {
		checksumCalc = (checksumCalc - (raw[addr] ?? 0) - 1) & 0xff;
	}
	const headerChecksum = raw[0x014d] ?? 0;
	const checksumValid = checksumCalc === headerChecksum;

	const globalChecksum = view.getUint16(0x014e, false);

	return {
		title: title || "UNTITLED",
		cgbFlag,
		cgbMode,
		sgbFlag,
		sgbSupported,
		cartridgeType,
		cartridgeDescription,
		romSizeBytes: romInfo.bytes,
		romSizeLabel: romInfo.label,
		ramSizeBytes: ramInfo.bytes,
		ramSizeLabel: ramInfo.label,
		destinationCode,
		destinationLabel,
		licenseeCode,
		version,
		headerChecksum,
		headerChecksumCalculated: checksumCalc,
		checksumValid,
		globalChecksum,
		logoValid: logoMatch,
		logoPng,
	};
}

export function formatGbManifest(info: GbRomInfo): string {
	return JSON.stringify(
		{
			title: info.title,
			colorMode: info.cgbMode,
			superGameBoySupported: info.sgbSupported,
			cartridgeType: info.cartridgeDescription,
			romSize: info.romSizeLabel,
			romSizeBytes: info.romSizeBytes,
			ramSize: info.ramSizeLabel,
			ramSizeBytes: info.ramSizeBytes,
			destination: info.destinationLabel,
			licenseeCode: info.licenseeCode,
			version: info.version,
			headerChecksumValid: info.checksumValid,
			headerChecksum: `0x${info.headerChecksum.toString(16).padStart(2, "0").toUpperCase()}`,
			globalChecksum: `0x${info.globalChecksum.toString(16).padStart(4, "0").toUpperCase()}`,
			nintendoLogoValid: info.logoValid,
		},
		null,
		2,
	);
}

export function convertGb(
	raw: Uint8Array,
	options?: { json?: boolean },
): Uint8Array {
	const info = parseGbRom(raw);

	if (options?.json) {
		const jsonText = formatGbManifest(info);
		return new TextEncoder().encode(jsonText);
	}

	return info.logoPng;
}
