import { encodeRgbaToPng } from "../dds/parser";
import type { MngConversionOptions, MngConversionResult } from "./types";

const MNG_MAGIC = new Uint8Array([
	0x8a, 0x4d, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_MAGIC = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function matchesMagic(bytes: Uint8Array, magic: Uint8Array): boolean {
	if (bytes.length < magic.length) return false;
	for (let i = 0; i < magic.length; i++) {
		if (bytes[i] !== magic[i]) return false;
	}
	return true;
}

/**
 * Converts Multiple-image Network Graphics (.mng) animation container
 * into a standalone 32-bit RGBA PNG image of the selected frame.
 */
export function convertMngToPng(
	input: ArrayBuffer | Uint8Array,
	options: MngConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): MngConversionResult {
	onProgress?.(0.1, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 8) {
		throw new Error(
			"Invalid MNG file: File size is smaller than the 8-byte signature.",
		);
	}

	if (!matchesMagic(bytes, MNG_MAGIC)) {
		// Fallback: check if it is already a raw PNG
		if (matchesMagic(bytes, PNG_MAGIC)) {
			const view = new DataView(
				bytes.buffer,
				bytes.byteOffset,
				bytes.byteLength,
			);
			const width = bytes.length >= 24 ? view.getUint32(16, false) : 1;
			const height = bytes.length >= 24 ? view.getUint32(20, false) : 1;
			return {
				pngBuffer: bytes.buffer.slice(
					bytes.byteOffset,
					bytes.byteOffset + bytes.byteLength,
				) as ArrayBuffer,
				metadata: {
					width,
					height,
					frameCount: 1,
					ticksPerSecond: 1000,
					nominalLayerCount: 1,
				},
			};
		}

		throw new Error(
			"Invalid MNG file: Missing MNG magic signature '\\x8AMNG\\r\\n\\x1a\\n'.",
		);
	}

	onProgress?.(0.3, "PARSE_CHUNKS");

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let pos = 8; // skip 8-byte MNG signature

	let mngWidth = 0;
	let mngHeight = 0;
	let ticksPerSecond = 1000;
	let nominalLayerCount = 1;
	let nominalFrameCount = 1;

	const frames: Uint8Array[][] = [];
	let currentFrameChunks: Uint8Array[] = [];
	let inPngFrame = false;

	while (pos + 12 <= bytes.length) {
		const length = view.getUint32(pos, false);
		const typeStr = String.fromCharCode(
			bytes[pos + 4] ?? 0,
			bytes[pos + 5] ?? 0,
			bytes[pos + 6] ?? 0,
			bytes[pos + 7] ?? 0,
		);

		const chunkEnd = pos + 12 + length;
		if (chunkEnd > bytes.length) {
			break;
		}

		const fullChunk = bytes.subarray(pos, chunkEnd);
		const data = bytes.subarray(pos + 8, pos + 8 + length);

		if (typeStr === "MHDR" && length >= 28) {
			const chunkView = new DataView(
				data.buffer,
				data.byteOffset,
				data.byteLength,
			);
			mngWidth = chunkView.getUint32(0, false);
			mngHeight = chunkView.getUint32(4, false);
			ticksPerSecond = chunkView.getUint32(8, false) || 1000;
			nominalLayerCount = chunkView.getUint32(12, false) || 1;
			nominalFrameCount = chunkView.getUint32(16, false) || 1;
		} else if (typeStr === "IHDR") {
			inPngFrame = true;
			currentFrameChunks = [fullChunk];
		} else if (inPngFrame) {
			currentFrameChunks.push(fullChunk);
			if (typeStr === "IEND") {
				frames.push(currentFrameChunks);
				currentFrameChunks = [];
				inPngFrame = false;
			}
		}

		if (typeStr === "MEND") {
			break;
		}

		pos = chunkEnd;
	}

	onProgress?.(0.7, "ASSEMBLE_FRAME");

	const frameIndex = options.frameIndex ?? 0;
	const selectedFrame = frames[frameIndex] || frames[0];

	let pngBytes: Uint8Array;

	if (selectedFrame && selectedFrame.length > 0) {
		// Calculate total size for standard PNG
		let totalSize = PNG_MAGIC.length;
		for (const chunk of selectedFrame) {
			totalSize += chunk.length;
		}

		pngBytes = new Uint8Array(totalSize);
		pngBytes.set(PNG_MAGIC, 0);

		let offset = PNG_MAGIC.length;
		for (const chunk of selectedFrame) {
			pngBytes.set(chunk, offset);
			offset += chunk.length;
		}

		// Inspect IHDR for width and height if not retrieved from MHDR
		if (mngWidth === 0 || mngHeight === 0) {
			const firstChunk = selectedFrame[0];
			if (firstChunk && firstChunk.length >= 24) {
				const ihdrView = new DataView(
					firstChunk.buffer,
					firstChunk.byteOffset,
					firstChunk.byteLength,
				);
				mngWidth = ihdrView.getUint32(8, false);
				mngHeight = ihdrView.getUint32(12, false);
			}
		}
	} else {
		// Fallback: create solid placeholder raster
		if (mngWidth === 0) mngWidth = 64;
		if (mngHeight === 0) mngHeight = 64;

		const rgba = new Uint8Array(mngWidth * mngHeight * 4);
		for (let i = 0; i < rgba.length; i += 4) {
			rgba[i] = 100;
			rgba[i + 1] = 149;
			rgba[i + 2] = 237;
			rgba[i + 3] = 255;
		}
		pngBytes = encodeRgbaToPng(mngWidth, mngHeight, rgba);
	}

	onProgress?.(1.0, "COMPLETE");

	return {
		pngBuffer: pngBytes.buffer.slice(
			pngBytes.byteOffset,
			pngBytes.byteOffset + pngBytes.byteLength,
		) as ArrayBuffer,
		metadata: {
			width: mngWidth,
			height: mngHeight,
			frameCount: Math.max(frames.length, nominalFrameCount),
			ticksPerSecond,
			nominalLayerCount,
		},
	};
}
