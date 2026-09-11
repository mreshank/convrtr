import { zipSync } from "fflate";

/**
 * Parses Godot Engine asset packages (.pck) and unpacks all scenes, scripts,
 * textures, audio, and materials into a standard ZIP archive.
 *
 * Supports Godot 3 (format version 1) and Godot 4 (format version 2) packages.
 */
export function extractPckToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	const bytes = new Uint8Array(input);
	if (bytes.length < 100) {
		throw new Error(
			"extractPckToZip: File is too small to be a valid Godot .pck archive",
		);
	}

	const view = new DataView(input);
	const magic = new TextDecoder().decode(bytes.subarray(0, 4));

	if (magic !== "GDPC") {
		throw new Error(
			`extractPckToZip: Invalid magic signature "${magic}" (expected "GDPC")`,
		);
	}

	const formatVersion = view.getUint32(4, true);
	let cursor = 8;

	// Read engine version (major, minor, patch)
	const _verMajor = view.getUint32(cursor, true);
	const _verMinor = view.getUint32(cursor + 4, true);
	const _verPatch = view.getUint32(cursor + 8, true);
	cursor += 12;

	let fileBase = BigInt(0);

	if (formatVersion >= 2) {
		// Godot 4 format: flags (4 bytes) + file_base (8 bytes) + 16 reserved uint32s (64 bytes)
		cursor += 4; // flags
		fileBase = view.getBigUint64(cursor, true);
		cursor += 8;
		cursor += 64; // reserved
	} else {
		// Godot 3 format: 16 reserved uint32s (64 bytes)
		cursor += 64;
	}

	if (cursor + 4 > bytes.length) {
		throw new Error("extractPckToZip: Corrupted header or truncated file");
	}

	const fileCount = view.getUint32(cursor, true);
	cursor += 4;

	if (fileCount === 0 || fileCount > 500000) {
		throw new Error(
			`extractPckToZip: Invalid or zero file count in .pck header (${fileCount})`,
		);
	}

	onProgress?.(0.2, "INDEX");

	const zipFiles: Record<string, Uint8Array> = {};

	for (let i = 0; i < fileCount; i++) {
		if (cursor + 4 > bytes.length) break;
		const pathLen = view.getUint32(cursor, true);
		cursor += 4;

		if (cursor + pathLen > bytes.length) break;
		let path = new TextDecoder().decode(
			bytes.subarray(cursor, cursor + pathLen),
		);
		// Remove null terminators if present
		const nullIdx = path.indexOf("\0");
		if (nullIdx !== -1) path = path.slice(0, nullIdx);
		cursor += pathLen;

		// Word align in Godot 3/4 index if padded
		const pad = (4 - (pathLen % 4)) % 4;
		cursor += pad;

		if (cursor + 16 > bytes.length) break;
		const offset = view.getBigUint64(cursor, true);
		const size = view.getBigUint64(cursor + 8, true);
		cursor += 16;

		// MD5 hash (16 bytes)
		cursor += 16;

		if (formatVersion >= 2) {
			cursor += 4; // entry flags
		}

		// Normalize file path (strip res://)
		let cleanPath = path.replace(/^res:\/\//i, "").trim();
		if (!cleanPath) cleanPath = `asset_${i}.bin`;
		// Sanitize forward slashes and prevent directory traversal
		cleanPath = cleanPath
			.replace(/\.\.\//g, "")
			.replace(/^\/+/, "")
			.replace(/\\/g, "/");

		const startByte = Number(fileBase + offset);
		const endByte = startByte + Number(size);

		if (startByte >= 0 && endByte <= bytes.length && endByte >= startByte) {
			zipFiles[cleanPath] = bytes.subarray(startByte, endByte);
		}

		if (i % 20 === 0) {
			onProgress?.(0.2 + (i / fileCount) * 0.6, "UNPACK");
		}
	}

	if (Object.keys(zipFiles).length === 0) {
		throw new Error(
			"extractPckToZip: No valid files could be parsed from this Godot .pck file",
		);
	}

	onProgress?.(0.85, "ZIP");
	const zipped = zipSync(zipFiles);
	onProgress?.(1.0, "COMPLETE");

	const copy = new Uint8Array(zipped.byteLength);
	copy.set(zipped);
	return copy.buffer;
}
