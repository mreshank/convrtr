/**
 * Apple macOS Icon Image (.icns) parser and PNG extractor.
 * Extracts the highest resolution retina PNG icon directly from macOS app bundles without Mac hardware.
 */

export type IcnsChunk = {
	tag: string;
	length: number;
	data: Uint8Array;
	isPng: boolean;
	width?: number;
	height?: number;
};

// Known Apple icon OSType dimensions
const OSTYPE_SIZES: Record<string, number> = {
	ic10: 1024, // 512x512@2x Retina
	ic09: 512, // 512x512
	ic14: 512, // 256x256@2x Retina
	ic08: 256, // 256x256
	ic13: 256, // 128x128@2x Retina
	ic07: 128, // 128x128
	ic12: 64, // 32x32@2x Retina
	icp6: 64, // 64x64
	ic11: 32, // 16x16@2x Retina
	ic05: 32, // 32x32
	icp5: 32, // 32x32
	ic04: 16, // 16x16
	icp4: 16, // 16x16
};

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(data: Uint8Array): boolean {
	if (data.length < 8) return false;
	for (let i = 0; i < 8; i++) {
		if (data[i] !== PNG_MAGIC[i]) return false;
	}
	return true;
}

/**
 * Extracts width and height from PNG IHDR chunk if valid.
 */
function readPngDimensions(
	data: Uint8Array,
): { width: number; height: number } | undefined {
	if (data.length < 24) return undefined;
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const width = view.getUint32(16, false);
	const height = view.getUint32(20, false);
	if (width > 0 && height > 0) {
		return { width, height };
	}
	return undefined;
}

/**
 * Parses all chunks in an Apple .icns file.
 */
export function parseIcnsChunks(bytes: Uint8Array): IcnsChunk[] {
	if (bytes.length < 8) {
		throw new Error(
			"parseIcns: File is too small to be a valid Apple .icns icon archive",
		);
	}

	// Magic: "icns" (0x69 0x63 0x6E 0x73)
	if (
		bytes[0] !== 0x69 ||
		bytes[1] !== 0x63 ||
		bytes[2] !== 0x6e ||
		bytes[3] !== 0x73
	) {
		throw new Error(
			"parseIcns: Invalid ICNS header signature (expected 'icns')",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const totalLength = view.getUint32(4, false);

	const chunks: IcnsChunk[] = [];
	let cursor = 8;
	const limit = Math.min(totalLength, bytes.length);

	while (cursor + 8 <= limit) {
		const tag = String.fromCharCode(
			bytes[cursor] ?? 0,
			bytes[cursor + 1] ?? 0,
			bytes[cursor + 2] ?? 0,
			bytes[cursor + 3] ?? 0,
		);
		const length = view.getUint32(cursor + 4, false);

		if (length < 8 || cursor + length > bytes.length) {
			break;
		}

		const chunkData = bytes.subarray(cursor + 8, cursor + length);
		const hasPng = isPng(chunkData);
		let width = OSTYPE_SIZES[tag];
		let height = width;

		if (hasPng) {
			const dims = readPngDimensions(chunkData);
			if (dims) {
				width = dims.width;
				height = dims.height;
			}
		}

		chunks.push({
			tag,
			length,
			data: chunkData,
			isPng: hasPng,
			width,
			height,
		});

		cursor += length;
	}

	return chunks;
}

/**
 * Extracts the highest-resolution PNG icon from an Apple .icns archive.
 */
export function extractIcnsToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	const bytes = new Uint8Array(input);
	onProgress?.(0.1, "PARSE");

	const chunks = parseIcnsChunks(bytes);
	if (chunks.length === 0) {
		throw new Error("extractIcns: No valid icon chunks found in archive");
	}

	onProgress?.(0.4, "FIND_BEST");

	// Filter chunks with PNG data
	const pngChunks = chunks.filter((c) => c.isPng);

	if (pngChunks.length > 0) {
		// Sort by width descending to get the highest retina asset
		pngChunks.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
		const bestChunk = pngChunks[0];
		if (!bestChunk) {
			throw new Error("extractIcns: Unable to select highest resolution icon");
		}

		onProgress?.(1.0, "DONE");
		// Return slice of the exact PNG stream
		return bestChunk.data.slice().buffer as ArrayBuffer;
	}

	throw new Error(
		"extractIcns: No standard PNG icon streams found in this .icns file. (Legacy pre-OSX 10.7 QuickDraw icons are unsupported)",
	);
}
