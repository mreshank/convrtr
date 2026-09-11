import { decodeIconOrDibToPng } from "../ani/parser";

export interface CurExtractionResult {
	width: number;
	height: number;
	hotspotX: number;
	hotspotY: number;
	pngData: Uint8Array;
}

/**
 * Parses a Windows Static Cursor (.cur) binary file and extracts the highest-resolution
 * cursor image as a transparent PNG with preserved hotspot coordinates.
 */
export function parseCur(fileBytes: Uint8Array): CurExtractionResult {
	if (fileBytes.length < 22) {
		throw new Error(
			"Invalid .cur file: File too small to contain a valid cursor header and directory.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	const idReserved = view.getUint16(0, true);
	const idType = view.getUint16(2, true);
	const idCount = view.getUint16(4, true);

	if (idReserved !== 0) {
		throw new Error("Invalid .cur file: Reserved header field must be 0.");
	}

	if (idType !== 2 && idType !== 1) {
		throw new Error(
			`Invalid .cur file: Resource type ${idType} is not a valid cursor (expected 2) or icon (1).`,
		);
	}

	if (idCount < 1) {
		throw new Error("Invalid .cur file: Image count must be at least 1.");
	}

	// Iterate through directory entries to find the best (largest resolution, highest bit depth)
	let bestIndex = 0;
	let maxScore = -1;
	let bestHotspotX = 0;
	let bestHotspotY = 0;

	for (let i = 0; i < idCount; i++) {
		const entryOffset = 6 + i * 16;
		if (entryOffset + 16 > fileBytes.length) break;

		const rawW = fileBytes[entryOffset] ?? 0;
		const rawH = fileBytes[entryOffset + 1] ?? 0;
		const width = rawW === 0 ? 256 : rawW;
		const height = rawH === 0 ? 256 : rawH;

		const xHotspot = view.getUint16(entryOffset + 4, true);
		const yHotspot = view.getUint16(entryOffset + 6, true);
		const bytesInRes = view.getUint32(entryOffset + 8, true);
		const imageOffset = view.getUint32(entryOffset + 12, true);

		if (imageOffset + bytesInRes > fileBytes.length) continue;

		// Check bit depth from DIB header if present
		let bpp = 8;
		if (
			imageOffset + 16 <= fileBytes.length &&
			fileBytes[imageOffset] !== 0x89 // Not a PNG
		) {
			bpp = view.getUint16(imageOffset + 14, true);
		} else if (fileBytes[imageOffset] === 0x89) {
			bpp = 32; // Embedded PNG
		}

		const score = width * height * 100 + bpp;
		if (score > maxScore) {
			maxScore = score;
			bestIndex = i;
			bestHotspotX = xHotspot;
			bestHotspotY = yHotspot;
		}
	}

	const selectedEntryOffset = 6 + bestIndex * 16;
	const selectedImageOffset = view.getUint32(selectedEntryOffset + 12, true);
	const selectedBytesInRes = view.getUint32(selectedEntryOffset + 8, true);

	if (
		selectedImageOffset + selectedBytesInRes > fileBytes.length ||
		selectedBytesInRes === 0
	) {
		throw new Error(
			"Invalid .cur file: Corrupt image offset or size in directory.",
		);
	}

	const imageSlice = fileBytes.subarray(
		selectedImageOffset,
		selectedImageOffset + selectedBytesInRes,
	);

	// Case A: Image slice is directly an embedded PNG
	if (
		imageSlice.length >= 8 &&
		imageSlice[0] === 0x89 &&
		imageSlice[1] === 0x50 &&
		imageSlice[2] === 0x4e &&
		imageSlice[3] === 0x47
	) {
		let w = 32;
		let h = 32;
		if (imageSlice.length >= 24) {
			const pv = new DataView(
				imageSlice.buffer,
				imageSlice.byteOffset,
				imageSlice.byteLength,
			);
			w = pv.getUint32(16, false);
			h = pv.getUint32(20, false);
		}
		return {
			pngData: imageSlice,
			width: w,
			height: h,
			hotspotX: bestHotspotX,
			hotspotY: bestHotspotY,
		};
	}

	// Case B: DIB image data. Construct a single-image CUR header to pass to decodeIconOrDibToPng
	const singleCur = new Uint8Array(6 + 16 + imageSlice.length);
	const singleView = new DataView(singleCur.buffer);
	singleCur.set(fileBytes.subarray(0, 6), 0); // Header
	singleView.setUint16(4, 1, true); // Count = 1
	singleCur.set(
		fileBytes.subarray(selectedEntryOffset, selectedEntryOffset + 16),
		6,
	); // Selected directory
	singleView.setUint32(18, 22, true); // Image offset = 22
	singleCur.set(imageSlice, 22);

	const decoded = decodeIconOrDibToPng(singleCur);
	return {
		pngData: decoded.pngData,
		width: decoded.width,
		height: decoded.height,
		hotspotX: bestHotspotX,
		hotspotY: bestHotspotY,
	};
}

/**
 * Converts a Windows Static Cursor (.cur) file into a PNG ArrayBuffer.
 */
export function convertCurToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "PARSING_CUR");
	const result = parseCur(new Uint8Array(input));

	onProgress?.(0.8, "EXTRACTING_PNG");
	onProgress?.(1.0, "DONE");
	return result.pngData.buffer.slice(
		result.pngData.byteOffset,
		result.pngData.byteOffset + result.pngData.byteLength,
	) as ArrayBuffer;
}
