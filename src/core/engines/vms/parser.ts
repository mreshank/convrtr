/**
 * Sega Dreamcast Visual Memory Unit (VMU) Save & Icon/Eyecatch Decoder
 *
 * Parses Dreamcast .vms save files, .dci Nexus containers, and .vmu memory card
 * dumps. Decodes the 128-byte VMS header, 16-color ARGB4444 icon palettes,
 * 32x32 4-bpp animated icon frames to PNG, 72x56 eyecatch bitmaps to PNG,
 * and extracts raw save payloads into ZIP packages.
 *
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

import { zipSync } from "fflate";
import { encodeRgbaToPng } from "../dds/parser";

export interface VmsIconFrame {
	index: number;
	png: Uint8Array;
}

export interface VmsInfo {
	description: string;
	comment: string;
	creatorApp: string;
	numIcons: number;
	animationSpeed: number;
	eyecatchType: number;
	eyecatchDescription: string;
	crc: number;
	payloadSize: number;
	icons: VmsIconFrame[];
	eyecatchPng: Uint8Array | null;
	payloadBytes: Uint8Array;
}

const EYECATCH_TYPES: Record<number, string> = {
	0: "None",
	1: "72x56 16-Color Palette (4-bpp)",
	2: "72x56 256-Color Palette (8-bpp)",
	3: "72x56 16-Bit ARGB4444",
};

function decodeArgb4444(val: number): [number, number, number, number] {
	const a = ((val >> 12) & 0x0f) * 17;
	const r = ((val >> 8) & 0x0f) * 17;
	const g = ((val >> 4) & 0x0f) * 17;
	const b = (val & 0x0f) * 17;
	return [r, g, b, a];
}

export function parseVmsSave(raw: Uint8Array): VmsInfo {
	if (raw.length < 128) {
		throw new Error(
			`Invalid Dreamcast save: file size too small (${raw.length} bytes, minimum 128 bytes).`,
		);
	}

	// Check if this is a .dci file with a 32-byte header prefix
	let vmsOffset = 0;
	if (
		raw.length >= 160 &&
		(raw[0x20 + 0x40] ?? 0) >= 1 &&
		(raw[0x20 + 0x40] ?? 0) <= 8
	) {
		const magicDci = new TextDecoder("ascii")
			.decode(raw.subarray(0, 4))
			.replace(/\0/g, "");
		if (
			magicDci.length > 0 &&
			raw[0x40] !== undefined &&
			(raw[0x40] < 1 || raw[0x40] > 8)
		) {
			vmsOffset = 32;
		}
	}

	const vmsBytes = raw.subarray(vmsOffset);
	if (vmsBytes.length < 128) {
		throw new Error("Invalid VMS header: buffer truncated.");
	}

	const view = new DataView(
		vmsBytes.buffer,
		vmsBytes.byteOffset,
		vmsBytes.byteLength,
	);

	// 1. Header strings
	const description = new TextDecoder("ascii")
		.decode(vmsBytes.subarray(0, 16))
		.replace(/\0/g, "")
		.trim();

	const comment = new TextDecoder("ascii")
		.decode(vmsBytes.subarray(16, 48))
		.replace(/\0/g, "")
		.trim();

	const creatorApp = new TextDecoder("ascii")
		.decode(vmsBytes.subarray(48, 64))
		.replace(/\0/g, "")
		.trim();

	const rawNumIcons = view.getUint16(0x40, true);
	const numIcons = Math.max(1, Math.min(8, rawNumIcons || 1));
	const animationSpeed = view.getUint16(0x42, true);
	const eyecatchType = view.getUint16(0x44, true);
	const crc = view.getUint16(0x46, true);
	const payloadSize = view.getUint32(0x48, true);

	// 2. Decode 16-color ARGB4444 icon palette (32 bytes at offset 0x60)
	const iconPalette: [number, number, number, number][] = [];
	for (let c = 0; c < 16; c++) {
		const colorWord = view.getUint16(0x60 + c * 2, true);
		iconPalette.push(decodeArgb4444(colorWord));
	}

	// 3. Decode 32x32 4-bpp icon frames (512 bytes each, starting at 0x80)
	const icons: VmsIconFrame[] = [];
	let currentOffset = 0x80;

	for (let frame = 0; frame < numIcons; frame++) {
		if (currentOffset + 512 <= vmsBytes.length) {
			const rgba = new Uint8Array(32 * 32 * 4);
			const frameBytes = vmsBytes.subarray(currentOffset, currentOffset + 512);

			for (let y = 0; y < 32; y++) {
				for (let x = 0; x < 16; x++) {
					const byteVal = frameBytes[y * 16 + x] ?? 0;
					const p0 = (byteVal >> 4) & 0x0f;
					const p1 = byteVal & 0x0f;

					const c0 = iconPalette[p0] ?? [0, 0, 0, 0];
					const c1 = iconPalette[p1] ?? [0, 0, 0, 0];

					const px0 = x * 2;
					const px1 = x * 2 + 1;

					const idx0 = (y * 32 + px0) * 4;
					rgba[idx0] = c0[0];
					rgba[idx0 + 1] = c0[1];
					rgba[idx0 + 2] = c0[2];
					rgba[idx0 + 3] = c0[3];

					const idx1 = (y * 32 + px1) * 4;
					rgba[idx1] = c1[0];
					rgba[idx1 + 1] = c1[1];
					rgba[idx1 + 2] = c1[2];
					rgba[idx1 + 3] = c1[3];
				}
			}

			try {
				const png = encodeRgbaToPng(32, 32, rgba);
				icons.push({ index: frame, png });
			} catch {
				// Continue parsing remaining frames
			}
		}
		currentOffset += 512;
	}

	// 4. Decode 72x56 eyecatch image (if present)
	let eyecatchPng: Uint8Array | null = null;
	if (eyecatchType === 1 && currentOffset + 32 + 2016 <= vmsBytes.length) {
		// 16-color palette (32 bytes) + 72x56 4-bpp (2016 bytes)
		const ecPalette: [number, number, number, number][] = [];
		for (let c = 0; c < 16; c++) {
			const cw = view.getUint16(currentOffset + c * 2, true);
			ecPalette.push(decodeArgb4444(cw));
		}
		currentOffset += 32;

		const rgba = new Uint8Array(72 * 56 * 4);
		const ecBytes = vmsBytes.subarray(currentOffset, currentOffset + 2016);
		for (let y = 0; y < 56; y++) {
			for (let x = 0; x < 36; x++) {
				const b = ecBytes[y * 36 + x] ?? 0;
				const p0 = (b >> 4) & 0x0f;
				const p1 = b & 0x0f;
				const c0 = ecPalette[p0] ?? [0, 0, 0, 0];
				const c1 = ecPalette[p1] ?? [0, 0, 0, 0];

				const idx0 = (y * 72 + x * 2) * 4;
				rgba[idx0] = c0[0];
				rgba[idx0 + 1] = c0[1];
				rgba[idx0 + 2] = c0[2];
				rgba[idx0 + 3] = c0[3];

				const idx1 = (y * 72 + x * 2 + 1) * 4;
				rgba[idx1] = c1[0];
				rgba[idx1 + 1] = c1[1];
				rgba[idx1 + 2] = c1[2];
				rgba[idx1 + 3] = c1[3];
			}
		}
		currentOffset += 2016;
		try {
			eyecatchPng = encodeRgbaToPng(72, 56, rgba);
		} catch {
			eyecatchPng = null;
		}
	} else if (
		eyecatchType === 2 &&
		currentOffset + 512 + 4032 <= vmsBytes.length
	) {
		// 256-color palette (512 bytes) + 72x56 8-bpp (4032 bytes)
		const ecPalette: [number, number, number, number][] = [];
		for (let c = 0; c < 256; c++) {
			const cw = view.getUint16(currentOffset + c * 2, true);
			ecPalette.push(decodeArgb4444(cw));
		}
		currentOffset += 512;

		const rgba = new Uint8Array(72 * 56 * 4);
		const ecBytes = vmsBytes.subarray(currentOffset, currentOffset + 4032);
		for (let i = 0; i < 72 * 56; i++) {
			const colorIdx = ecBytes[i] ?? 0;
			const c = ecPalette[colorIdx] ?? [0, 0, 0, 0];
			const idx = i * 4;
			rgba[idx] = c[0];
			rgba[idx + 1] = c[1];
			rgba[idx + 2] = c[2];
			rgba[idx + 3] = c[3];
		}
		currentOffset += 4032;
		try {
			eyecatchPng = encodeRgbaToPng(72, 56, rgba);
		} catch {
			eyecatchPng = null;
		}
	} else if (eyecatchType === 3 && currentOffset + 8064 <= vmsBytes.length) {
		// 72x56 16-bit ARGB4444 raw (8064 bytes)
		const rgba = new Uint8Array(72 * 56 * 4);
		for (let i = 0; i < 72 * 56; i++) {
			const cw = view.getUint16(currentOffset + i * 2, true);
			const c = decodeArgb4444(cw);
			const idx = i * 4;
			rgba[idx] = c[0];
			rgba[idx + 1] = c[1];
			rgba[idx + 2] = c[2];
			rgba[idx + 3] = c[3];
		}
		currentOffset += 8064;
		try {
			eyecatchPng = encodeRgbaToPng(72, 56, rgba);
		} catch {
			eyecatchPng = null;
		}
	}

	// 5. Payload bytes
	const payloadBytes =
		payloadSize > 0 && currentOffset + payloadSize <= vmsBytes.length
			? vmsBytes.subarray(currentOffset, currentOffset + payloadSize)
			: vmsBytes.subarray(currentOffset);

	return {
		description,
		comment,
		creatorApp,
		numIcons,
		animationSpeed,
		eyecatchType,
		eyecatchDescription: EYECATCH_TYPES[eyecatchType] ?? "Unknown",
		crc,
		payloadSize: payloadBytes.length,
		icons,
		eyecatchPng,
		payloadBytes,
	};
}

export function formatVmsManifest(info: VmsInfo): string {
	return JSON.stringify(
		{
			description: info.description,
			comment: info.comment,
			creatorApp: info.creatorApp,
			numIcons: info.numIcons,
			animationSpeed: info.animationSpeed,
			eyecatchType: info.eyecatchType,
			eyecatchDescription: info.eyecatchDescription,
			crcHex: `0x${info.crc.toString(16).padStart(4, "0").toUpperCase()}`,
			payloadSizeBytes: info.payloadSize,
			extractedIconFrames: info.icons.length,
			hasEyecatch: info.eyecatchPng !== null,
		},
		null,
		2,
	);
}

export function convertVms(
	raw: Uint8Array,
	options?: {
		json?: boolean;
		zip?: boolean;
		onProgress?: (ratio: number, message: string) => void;
	},
): Uint8Array {
	const info = parseVmsSave(raw);

	if (options?.json) {
		const jsonText = formatVmsManifest(info);
		return new TextEncoder().encode(jsonText);
	}

	if (options?.zip) {
		const zipFiles: Record<string, Uint8Array> = {};

		// 1. Icon frames
		for (const icon of info.icons) {
			const idxStr = String(icon.index).padStart(2, "0");
			zipFiles[`icons/icon_${idxStr}.png`] = icon.png;
		}

		// 2. Eyecatch image
		if (info.eyecatchPng) {
			zipFiles["eyecatch.png"] = info.eyecatchPng;
		}

		// 3. Raw payload
		const safeName =
			info.description.replace(/[^A-Za-z0-9_-]/g, "_") || "vmu_save";
		zipFiles[`raw/${safeName}.bin`] = info.payloadBytes;

		// 4. Manifests
		zipFiles["manifest.json"] = new TextEncoder().encode(
			formatVmsManifest(info),
		);

		let md = "# Sega Dreamcast VMU Save Manifest\n\n";
		md += `* **Title / Description:** ${info.description || "—"}\n`;
		md += `* **Comment:** ${info.comment || "—"}\n`;
		md += `* **Creator App:** ${info.creatorApp || "—"}\n`;
		md += `* **Icon Frames:** ${info.icons.length} (Speed: ${info.animationSpeed})\n`;
		md += `* **Eyecatch Graphic:** ${info.eyecatchDescription}\n`;
		md += `* **Save Payload Size:** ${info.payloadSize} bytes\n`;
		zipFiles["README.md"] = new TextEncoder().encode(md);

		options.onProgress?.(1.0, "Complete");
		return zipSync(zipFiles);
	}

	// Default: return primary icon PNG (or eyecatch if icons are absent)
	const primaryIcon = info.icons[0];
	if (primaryIcon) {
		return primaryIcon.png;
	}
	if (info.eyecatchPng) {
		return info.eyecatchPng;
	}

	throw new Error(
		`Dreamcast VMU save (${info.description || "Unknown"}) contains no valid icons or graphics.`,
	);
}
