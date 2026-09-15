import { encodeRgbaToPng } from "../dds/parser";
import type {
	XcurConversionResult,
	XcurCursorFrame,
	XcurMetadata,
	XcurToPngOptions,
} from "./types";

const XCUR_MAGIC = 0x72756358; // "Xcur" in little-endian
const XCUR_IMAGE_TYPE = 0xfffd0002;

interface TocEntry {
	type: number;
	subtype: number;
	position: number;
}

export function parseXcur(
	input: Uint8Array | ArrayBuffer,
	options: XcurToPngOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): XcurConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 16) {
		throw new Error(
			"Invalid X11 cursor file: File size is smaller than 16-byte header.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const magic = view.getUint32(0, true);
	if (magic !== XCUR_MAGIC) {
		throw new Error("Invalid X11 cursor file: Missing 'Xcur' magic bytes.");
	}

	const ntoc = view.getUint32(12, true);
	if (ntoc === 0 || 16 + ntoc * 12 > bytes.length) {
		throw new Error("Invalid X11 cursor file: Corrupt table of contents.");
	}

	const tocEntries: TocEntry[] = [];
	for (let i = 0; i < ntoc; i++) {
		const offset = 16 + i * 12;
		const type = view.getUint32(offset, true);
		const subtype = view.getUint32(offset + 4, true);
		const position = view.getUint32(offset + 8, true);
		tocEntries.push({ type, subtype, position });
	}

	onProgress?.(0.3, "PARSE_IMAGES");

	// Filter image chunks
	const imageEntries = tocEntries.filter((e) => e.type === XCUR_IMAGE_TYPE);
	if (imageEntries.length === 0) {
		throw new Error(
			"Invalid X11 cursor file: No cursor image chunks found in file.",
		);
	}

	const frames: Array<{
		info: XcurCursorFrame;
		pixelOffset: number;
	}> = [];

	for (const entry of imageEntries) {
		const pos = entry.position;
		if (pos + 36 > bytes.length) continue;

		const chunkHeaderSize = view.getUint32(pos, true);
		const chunkType = view.getUint32(pos + 4, true);
		const nominalSize = view.getUint32(pos + 8, true);
		const width = view.getUint32(pos + 16, true);
		const height = view.getUint32(pos + 20, true);
		const xhot = view.getUint32(pos + 24, true);
		const yhot = view.getUint32(pos + 28, true);
		const delay = view.getUint32(pos + 32, true);

		if (
			chunkType === XCUR_IMAGE_TYPE &&
			width > 0 &&
			height > 0 &&
			width <= 2048 &&
			height <= 2048
		) {
			const pixelOffset = pos + (chunkHeaderSize >= 36 ? chunkHeaderSize : 36);
			if (pixelOffset + width * height * 4 <= bytes.length) {
				frames.push({
					info: {
						width,
						height,
						xhot,
						yhot,
						delay,
						nominalSize,
					},
					pixelOffset,
				});
			}
		}
	}

	if (frames.length === 0) {
		throw new Error(
			"Invalid X11 cursor file: Could not parse any valid cursor image frames.",
		);
	}

	onProgress?.(0.6, "DECODE_PIXELS");

	// Select preferred frame: exact nominal size, or largest width*height
	let chosen = frames[0];
	if (!chosen) {
		throw new Error("No image frames found in Xcursor TOC");
	}
	if (options.size && options.size > 0) {
		const exact = frames.find(
			(f) =>
				f.info.nominalSize === options.size || f.info.width === options.size,
		);
		if (exact) chosen = exact;
	}

	if (!chosen) {
		chosen = frames.reduce((best, cur) =>
			cur.info.width * cur.info.height > best.info.width * best.info.height
				? cur
				: best,
		);
	}

	const { width, height, xhot, yhot } = chosen.info;
	const pixelOffset = chosen.pixelOffset;
	const rgba = new Uint8Array(width * height * 4);

	// X11 Xcursor stores pixels as 32-bit premultiplied ARGB in little-endian:
	// Byte 0: Blue, Byte 1: Green, Byte 2: Red, Byte 3: Alpha
	for (let i = 0; i < width * height; i++) {
		const srcOff = pixelOffset + i * 4;
		const b = bytes[srcOff] ?? 0;
		const g = bytes[srcOff + 1] ?? 0;
		const r = bytes[srcOff + 2] ?? 0;
		const a = bytes[srcOff + 3] ?? 0;

		const destOff = i * 4;
		if (a === 0) {
			rgba[destOff] = 0;
			rgba[destOff + 1] = 0;
			rgba[destOff + 2] = 0;
			rgba[destOff + 3] = 0;
		} else if (a === 255) {
			rgba[destOff] = r;
			rgba[destOff + 1] = g;
			rgba[destOff + 2] = b;
			rgba[destOff + 3] = 255;
		} else {
			// Un-premultiply alpha
			rgba[destOff] = Math.min(255, Math.round((r * 255) / a));
			rgba[destOff + 1] = Math.min(255, Math.round((g * 255) / a));
			rgba[destOff + 2] = Math.min(255, Math.round((b * 255) / a));
			rgba[destOff + 3] = a;
		}
	}

	onProgress?.(0.85, "ENCODE_PNG");

	const pngBytes = encodeRgbaToPng(width, height, rgba);
	const pngBuffer = pngBytes.buffer.slice(
		pngBytes.byteOffset,
		pngBytes.byteOffset + pngBytes.byteLength,
	) as ArrayBuffer;

	onProgress?.(1.0, "COMPLETE");

	const availableSizes = Array.from(
		new Set(frames.map((f) => f.info.nominalSize || f.info.width)),
	).sort((a, b) => a - b);

	const metadata: XcurMetadata = {
		width,
		height,
		xhot,
		yhot,
		availableSizes,
		frameCount: frames.length,
	};

	return {
		pngBuffer,
		metadata,
	};
}
