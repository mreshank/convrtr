import { zipSync } from "fflate";

/**
 * id Tech 2 / Quake / GoldSrc (Half-Life, Counter-Strike) .pak archive parser and ZIP extractor.
 * Unpacks models, sounds, textures, maps, and game scripts while preserving folder structure.
 */

export interface PakEntry {
	path: string;
	offset: number;
	length: number;
	data: Uint8Array;
}

/**
 * Parses all directory entries from a Quake/GoldSrc .pak file.
 */
export function parsePakEntries(input: ArrayBuffer): PakEntry[] {
	if (input.byteLength < 12) {
		throw new Error(
			"convertPak: File is too small to be a valid PAK archive (minimum 12 bytes required)",
		);
	}

	const view = new DataView(input);
	const magic = String.fromCharCode(
		view.getUint8(0),
		view.getUint8(1),
		view.getUint8(2),
		view.getUint8(3),
	);

	if (magic !== "PACK") {
		throw new Error(
			`convertPak: Invalid magic header '${magic}' (expected 'PACK' signature)`,
		);
	}

	const dirOffset = view.getUint32(4, true);
	const dirLength = view.getUint32(8, true);

	if (dirLength % 64 !== 0) {
		throw new Error(
			`convertPak: Corrupted directory table size (${dirLength} bytes is not a multiple of 64)`,
		);
	}

	if (dirOffset + dirLength > input.byteLength) {
		throw new Error(
			`convertPak: Directory offset (${dirOffset} + ${dirLength} bytes) exceeds file length (${input.byteLength} bytes)`,
		);
	}

	const numEntries = dirLength / 64;
	if (numEntries > 65536) {
		throw new Error(
			`convertPak: Suspicious entry count (${numEntries} files in archive)`,
		);
	}

	const srcBytes = new Uint8Array(input);
	const entries: PakEntry[] = [];

	for (let i = 0; i < numEntries; i++) {
		const entryStart = dirOffset + i * 64;

		// 56-byte null-terminated ASCII path
		let rawPath = "";
		for (let c = 0; c < 56; c++) {
			const b = srcBytes[entryStart + c] ?? 0;
			if (b === 0) break;
			rawPath += String.fromCharCode(b);
		}

		// Sanitize path (normalize slashes, prevent path traversal)
		const sanitized = rawPath
			.replace(/\\/g, "/")
			.replace(/\.\./g, "")
			.replace(/^\/+/, "")
			.trim();

		const offset = view.getUint32(entryStart + 56, true);
		const length = view.getUint32(entryStart + 60, true);

		if (offset + length > input.byteLength) {
			throw new Error(
				`convertPak: File entry '${sanitized}' exceeds container bounds (${offset} + ${length} > ${input.byteLength})`,
			);
		}

		const data = srcBytes.subarray(offset, offset + length);
		entries.push({
			path: sanitized || `file_${i}.bin`,
			offset,
			length,
			data,
		});
	}

	return entries;
}

/**
 * Converts a Quake / GoldSrc .pak archive into a structured ZIP file.
 */
export function convertPakToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "READ_DIRECTORY");
	const entries = parsePakEntries(input);

	onProgress?.(0.4, "EXTRACT_FILES");
	const zipFiles: Record<string, Uint8Array> = {};

	let totalBytes = 0;
	for (const entry of entries) {
		zipFiles[entry.path] = entry.data;
		totalBytes += entry.length;
	}

	onProgress?.(0.7, "BUILD_MANIFEST");
	const manifestContent = [
		`# Quake / GoldSrc PAK Extraction Report`,
		``,
		`- **Total Files Extracted:** ${entries.length}`,
		`- **Total Uncompressed Size:** ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`,
		``,
		`## Files Inventory`,
		...entries
			.slice(0, 100)
			.map((e) => `- \`${e.path}\` (${(e.length / 1024).toFixed(1)} KB)`),
		entries.length > 100 ? `- ... and ${entries.length - 100} more files.` : ``,
		``,
		`Extracted 100% client-side in browser with convrtr.`,
	].join("\n");

	zipFiles["PAK_MANIFEST.md"] = new TextEncoder().encode(manifestContent);

	onProgress?.(0.85, "COMPRESS_ZIP");
	const zipped = zipSync(zipFiles);

	onProgress?.(1.0, "DONE");
	return zipped.buffer as ArrayBuffer;
}
