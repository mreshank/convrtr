/**
 * Nintendo DS ROM Banner & 32x32 Icon Decoder
 *
 * Reads standard 512-byte NDS cartridge headers and seeks to the NDS banner
 * to decode the 32x32 4-bpp BGR555 tiled game icon to PNG and extract
 * 6-language UTF-16LE title banners.
 *
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

import { encodeRgbaToPng } from "../dds/parser";

export interface NdsTitles {
	japanese: string;
	english: string;
	french: string;
	german: string;
	italian: string;
	spanish: string;
}

export interface NdsRomInfo {
	gameTitle: string;
	gameCode: string;
	makerCode: string;
	unitCode: number;
	unitCodeDescription: string;
	deviceCapacityBytes: number;
	bannerVersion: number;
	titles: NdsTitles;
	iconPng: Uint8Array | null;
}

export function parseNdsRom(raw: Uint8Array): NdsRomInfo {
	if (raw.length < 512) {
		throw new Error(
			`Invalid NDS ROM: file size too small (${raw.length} bytes, expected at least 512 bytes for header).`,
		);
	}

	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

	// 1. Header fields
	const gameTitle = new TextDecoder("ascii")
		.decode(raw.subarray(0, 12))
		.replace(/\0/g, "")
		.trim();

	const gameCode = new TextDecoder("ascii")
		.decode(raw.subarray(12, 16))
		.replace(/\0/g, "")
		.trim();

	const makerCode = new TextDecoder("ascii")
		.decode(raw.subarray(16, 18))
		.replace(/\0/g, "")
		.trim();

	const unitCode = raw[18] ?? 0;
	let unitCodeDescription = "Nintendo DS";
	if (unitCode === 2) unitCodeDescription = "Nintendo DS + Nintendo DSi";
	else if (unitCode === 3) unitCodeDescription = "Nintendo DSi Exclusive";

	const capacityExp = raw[20] ?? 0;
	const deviceCapacityBytes =
		capacityExp > 0 && capacityExp < 32 ? 1 << capacityExp : 0;

	const bannerOffset = view.getUint32(0x68, true);

	const emptyTitles: NdsTitles = {
		japanese: "",
		english: "",
		french: "",
		german: "",
		italian: "",
		spanish: "",
	};

	if (bannerOffset === 0 || bannerOffset + 0x240 > raw.length) {
		return {
			gameTitle,
			gameCode,
			makerCode,
			unitCode,
			unitCodeDescription,
			deviceCapacityBytes,
			bannerVersion: 0,
			titles: emptyTitles,
			iconPng: null,
		};
	}

	const bannerVersion = view.getUint16(bannerOffset, true);

	// 2. Decode 16-color BGR555 palette (32 bytes at bannerOffset + 0x220)
	const paletteOffset = bannerOffset + 0x220;
	const palette: [number, number, number, number][] = [];

	for (let c = 0; c < 16; c++) {
		if (paletteOffset + c * 2 + 1 < raw.length) {
			const colorVal = view.getUint16(paletteOffset + c * 2, true);
			const r = Math.round(((colorVal & 0x1f) * 255) / 31);
			const g = Math.round((((colorVal >> 5) & 0x1f) * 255) / 31);
			const b = Math.round((((colorVal >> 10) & 0x1f) * 255) / 31);
			// Index 0 is transparent
			const a = c === 0 ? 0 : 255;
			palette.push([r, g, b, a]);
		} else {
			palette.push([0, 0, 0, 0]);
		}
	}

	// 3. Decode 32x32 4-bpp tiled icon bitmap (512 bytes at bannerOffset + 0x020)
	// 4x4 tiles of 8x8 pixels each
	const iconTileOffset = bannerOffset + 0x020;
	const rgba = new Uint8Array(32 * 32 * 4);

	for (let tileIdx = 0; tileIdx < 16; tileIdx++) {
		const tileX = (tileIdx % 4) * 8;
		const tileY = Math.floor(tileIdx / 4) * 8;
		const tileDataOffset = iconTileOffset + tileIdx * 32;

		if (tileDataOffset + 32 <= raw.length) {
			for (let py = 0; py < 8; py++) {
				for (let b = 0; b < 4; b++) {
					const byteVal = raw[tileDataOffset + py * 4 + b] ?? 0;
					const p0 = byteVal & 0x0f;
					const p1 = (byteVal >> 4) & 0x0f;

					const color0 = palette[p0] ?? [0, 0, 0, 0];
					const color1 = palette[p1] ?? [0, 0, 0, 0];

					const px0 = tileX + b * 2;
					const px1 = tileX + b * 2 + 1;
					const pyFinal = tileY + py;

					const idx0 = (pyFinal * 32 + px0) * 4;
					rgba[idx0] = color0[0];
					rgba[idx0 + 1] = color0[1];
					rgba[idx0 + 2] = color0[2];
					rgba[idx0 + 3] = color0[3];

					const idx1 = (pyFinal * 32 + px1) * 4;
					rgba[idx1] = color1[0];
					rgba[idx1 + 1] = color1[1];
					rgba[idx1 + 2] = color1[2];
					rgba[idx1 + 3] = color1[3];
				}
			}
		}
	}

	let iconPng: Uint8Array | null = null;
	try {
		iconPng = encodeRgbaToPng(32, 32, rgba);
	} catch {
		iconPng = null;
	}

	// 4. Decode Titles in 6 languages (each 256 bytes UTF-16LE, starting at bannerOffset + 0x240)
	const titlesOffset = bannerOffset + 0x240;
	const langKeys: (keyof NdsTitles)[] = [
		"japanese",
		"english",
		"french",
		"german",
		"italian",
		"spanish",
	];

	const titles: NdsTitles = { ...emptyTitles };

	for (let lang = 0; lang < 6; lang++) {
		const key = langKeys[lang];
		if (!key) continue;
		const curOffset = titlesOffset + lang * 256;
		if (curOffset + 256 <= raw.length) {
			const titleBytes = raw.subarray(curOffset, curOffset + 256);
			try {
				const decoded = new TextDecoder("utf-16le").decode(titleBytes);
				const nullIdx = decoded.indexOf("\0");
				titles[key] = (
					nullIdx !== -1 ? decoded.slice(0, nullIdx) : decoded
				).trim();
			} catch {
				titles[key] = "";
			}
		}
	}

	return {
		gameTitle,
		gameCode,
		makerCode,
		unitCode,
		unitCodeDescription,
		deviceCapacityBytes,
		bannerVersion,
		titles,
		iconPng,
	};
}

export function formatNdsManifest(info: NdsRomInfo): string {
	return JSON.stringify(
		{
			gameTitle: info.gameTitle,
			gameCode: info.gameCode,
			makerCode: info.makerCode,
			unitCode: info.unitCode,
			unitCodeDescription: info.unitCodeDescription,
			deviceCapacityBytes: info.deviceCapacityBytes,
			deviceCapacityMegabytes: info.deviceCapacityBytes / (1024 * 1024),
			bannerVersion: info.bannerVersion,
			titles: info.titles,
			hasIcon: info.iconPng !== null,
		},
		null,
		2,
	);
}

export function convertNds(
	raw: Uint8Array,
	options?: { json?: boolean },
): Uint8Array {
	const info = parseNdsRom(raw);

	if (options?.json) {
		const jsonText = formatNdsManifest(info);
		return new TextEncoder().encode(jsonText);
	}

	if (!info.iconPng) {
		throw new Error(
			`NDS ROM (${info.gameCode || info.gameTitle || "Unknown"}) contains no valid banner icon.`,
		);
	}

	return info.iconPng;
}
