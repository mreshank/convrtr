import { decodeIconOrDibToPng } from "../ani/parser";
import type {
	IcoDirectoryEntry,
	IcoExtractionResult,
	IcoToPngOptions,
} from "./types";

/**
 * Checks if a byte buffer starts with the standard PNG signature.
 */
function isPngSignature(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	);
}

/**
 * Parses a Windows Icon (.ico / favicon.ico) file and extracts the highest-resolution
 * (or user-preferred) icon frame as a clean, transparent PNG.
 */
export function parseIco(
	input: ArrayBuffer | Uint8Array,
	options: IcoToPngOptions = {},
): IcoExtractionResult {
	const fileBytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (fileBytes.length < 22) {
		throw new Error(
			"Invalid .ico file: Buffer too small to contain valid icon directory header.",
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
		throw new Error("Invalid .ico file: Reserved header field must be 0.");
	}

	// 1 = ICO, 2 = CUR (gracefully handle either)
	if (idType !== 1 && idType !== 2) {
		throw new Error(
			`Invalid .ico file: Header resource type ${idType} is not a valid icon.`,
		);
	}

	if (idCount < 1) {
		throw new Error("Invalid .ico file: Icon directory contains 0 images.");
	}

	const entries: IcoDirectoryEntry[] = [];
	let bestEntry: IcoDirectoryEntry | null = null;
	let maxScore = -1;

	for (let i = 0; i < idCount; i++) {
		const entryOffset = 6 + i * 16;
		if (entryOffset + 16 > fileBytes.length) break;

		const rawW = fileBytes[entryOffset] ?? 0;
		const rawH = fileBytes[entryOffset + 1] ?? 0;
		const width = rawW === 0 ? 256 : rawW;
		const height = rawH === 0 ? 256 : rawH;
		const colorCount = fileBytes[entryOffset + 2] ?? 0;
		const planes = view.getUint16(entryOffset + 4, true);
		const bitCount = view.getUint16(entryOffset + 6, true);
		const bytesInRes = view.getUint32(entryOffset + 8, true);
		const imageOffset = view.getUint32(entryOffset + 12, true);

		// Peek at image payload to see if it is PNG compressed
		let isPng = false;
		if (
			imageOffset + 8 <= fileBytes.length &&
			imageOffset + bytesInRes <= fileBytes.length
		) {
			const sub = fileBytes.subarray(imageOffset, imageOffset + 8);
			isPng = isPngSignature(sub);
		}

		const entry: IcoDirectoryEntry = {
			index: i,
			width,
			height,
			colorCount,
			planes,
			bitCount,
			bytesInRes,
			imageOffset,
			isPng,
		};
		entries.push(entry);

		// Scoring algorithm
		let score = width * height;
		if (bitCount > 0) {
			score += bitCount * 100;
		}
		if (isPng) {
			score += 10000; // Prefer modern high-res PNG frames
		}

		// Exact preferred size override
		if (options.preferredSize && width === options.preferredSize) {
			score += 1000000;
		}

		if (score > maxScore) {
			maxScore = score;
			bestEntry = entry;
		}
	}

	if (!bestEntry) {
		throw new Error(
			"Invalid .ico file: Could not find any valid image entries in icon directory.",
		);
	}

	if (
		bestEntry.imageOffset + bestEntry.bytesInRes > fileBytes.length ||
		bestEntry.bytesInRes <= 0
	) {
		throw new Error(
			"Invalid .ico file: Image payload offset or length extends beyond file boundary.",
		);
	}

	const rawImageBytes = fileBytes.subarray(
		bestEntry.imageOffset,
		bestEntry.imageOffset + bestEntry.bytesInRes,
	);

	// If the payload is already a complete PNG stream, extract it directly
	if (isPngSignature(rawImageBytes)) {
		return {
			width: bestEntry.width,
			height: bestEntry.height,
			pngData: rawImageBytes,
			entryCount: entries.length,
			entries,
		};
	}

	// Otherwise decode the DIB bitmap with 1-bit transparency mask
	const decoded = decodeIconOrDibToPng(rawImageBytes);

	return {
		width: decoded.width,
		height: decoded.height,
		pngData: decoded.pngData,
		entryCount: entries.length,
		entries,
	};
}
