/**
 * Wallpaper Engine package (.pkg) archive parser and asset extractor.
 *
 * Wallpaper Engine packages on Steam store live wallpapers as .pkg files.
 * Header format:
 * - Bytes 0..7 (8 bytes): "PKGV0001" or "PKGV0002"
 * - 4 bytes uint32 LE: entry count
 * - Array of file entries:
 *   - 4 bytes uint32 LE: filename length
 *   - N bytes: filename (UTF-8)
 *   - 4 bytes uint32 LE: offset (or 8 bytes for PKGV0002)
 *   - 4 bytes uint32 LE: length (or 8 bytes for PKGV0002)
 */

const PKGV0001 = "PKGV0001";
const PKGV0002 = "PKGV0002";

export interface PkgFileEntry {
	name: string;
	offset: number;
	size: number;
}

export function parsePkgEntries(input: ArrayBuffer): {
	entries: PkgFileEntry[];
	bytes: Uint8Array;
} {
	const bytes = new Uint8Array(input);
	if (bytes.length < 16) {
		throw new Error(
			"parsePkgEntries: File is truncated or too small to be a valid Wallpaper Engine package",
		);
	}

	const magic = new TextDecoder().decode(bytes.subarray(0, 8));
	if (magic !== PKGV0001 && magic !== PKGV0002) {
		throw new Error(
			`parsePkgEntries: Not a valid Wallpaper Engine package (expected PKGV0001/PKGV0002, got ${magic})`,
		);
	}

	const isV2 = magic === PKGV0002;
	const view = new DataView(input);
	let cursor = 8;

	const entryCount = view.getUint32(cursor, true);
	cursor += 4;

	const entries: PkgFileEntry[] = [];
	for (let i = 0; i < entryCount; i++) {
		if (cursor + 4 > bytes.length) break;

		const nameLen = view.getUint32(cursor, true);
		cursor += 4;

		if (cursor + nameLen > bytes.length) break;
		const name = new TextDecoder().decode(
			bytes.subarray(cursor, cursor + nameLen),
		);
		cursor += nameLen;

		let offset: number;
		let size: number;

		if (isV2) {
			if (cursor + 16 > bytes.length) break;
			offset = Number(view.getBigUint64(cursor, true));
			cursor += 8;
			size = Number(view.getBigUint64(cursor, true));
			cursor += 8;
		} else {
			if (cursor + 8 > bytes.length) break;
			offset = view.getUint32(cursor, true);
			cursor += 4;
			size = view.getUint32(cursor, true);
			cursor += 4;
		}

		entries.push({ name, offset, size });
	}

	return { entries, bytes };
}

/**
 * Extracts the primary MP4 video from a Wallpaper Engine package.
 */
export function extractPkgVideo(input: ArrayBuffer): ArrayBuffer {
	const { entries, bytes } = parsePkgEntries(input);

	// Priority: filename ending in .mp4
	const videoEntry = entries.find((e) => e.name.toLowerCase().endsWith(".mp4"));
	if (!videoEntry) {
		throw new Error(
			"extractPkgVideo: No MP4 video stream found in this Wallpaper Engine package. This wallpaper may be a web scene or 3D asset rather than a video.",
		);
	}

	if (videoEntry.offset + videoEntry.size > bytes.length) {
		throw new Error("extractPkgVideo: Video entry exceeds file boundary");
	}

	const slice = bytes.subarray(
		videoEntry.offset,
		videoEntry.offset + videoEntry.size,
	);
	const copy = new Uint8Array(slice.byteLength);
	copy.set(slice);
	return copy.buffer;
}
