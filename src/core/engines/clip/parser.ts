/**
 * Clip Studio Paint (.clip) artwork and preview extractor.
 *
 * Clip Studio Paint saves all artwork in an SQLite 3 database format.
 * Inside the database, a full-resolution flattened composite of the canvas
 * is embedded as a standard PNG image blob.
 *
 * This parser verifies the SQLite container signature, searches for embedded
 * PNG streams, and extracts the highest-resolution canvas preview without
 * requiring Clip Studio Paint or external SQLite libraries.
 */

const SQLITE_MAGIC = new Uint8Array([
	0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74,
	0x20, 0x33, 0x00,
]); // "SQLite format 3\0"

const PNG_MAGIC = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]); // "\x89PNG\r\n\x1a\n"

const IEND_TRAILER = new Uint8Array([
	0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]); // "IEND" + CRC

function findSubarray(
	haystack: Uint8Array,
	needle: Uint8Array,
	from = 0,
): number {
	for (let i = from; i <= haystack.length - needle.length; i++) {
		let match = true;
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) {
				match = false;
				break;
			}
		}
		if (match) return i;
	}
	return -1;
}

/**
 * Extracts the full-resolution composite artwork PNG from a .clip file.
 */
export function extractClipPreview(input: ArrayBuffer): ArrayBuffer {
	const bytes = new Uint8Array(input);

	if (bytes.length < 100) {
		throw new Error(
			"extractClipPreview: File is truncated or too small to be a valid .clip file",
		);
	}

	// Verify SQLite format 3 signature
	for (let i = 0; i < SQLITE_MAGIC.length; i++) {
		if (bytes[i] !== SQLITE_MAGIC[i]) {
			throw new Error(
				"extractClipPreview: Not a valid Clip Studio Paint (.clip) file — missing SQLite header",
			);
		}
	}

	// Find all embedded PNG images
	const pngList: { offset: number; length: number }[] = [];
	let searchPos = SQLITE_MAGIC.length;

	while (searchPos < bytes.length) {
		const pngStart = findSubarray(bytes, PNG_MAGIC, searchPos);
		if (pngStart === -1) break;

		const iendPos = findSubarray(
			bytes,
			IEND_TRAILER,
			pngStart + PNG_MAGIC.length,
		);
		if (iendPos !== -1) {
			const totalLength = iendPos + IEND_TRAILER.length - pngStart;
			pngList.push({ offset: pngStart, length: totalLength });
			searchPos = iendPos + IEND_TRAILER.length;
		} else {
			searchPos = pngStart + PNG_MAGIC.length;
		}
	}

	if (pngList.length === 0) {
		throw new Error(
			"extractClipPreview: No rendered artwork preview found in this .clip file",
		);
	}

	// Sort by size descending: the largest PNG is the full canvas preview
	pngList.sort((a, b) => b.length - a.length);
	const best = pngList[0];
	if (!best) {
		throw new Error(
			"extractClipPreview: Failed to resolve largest PNG preview in .clip file",
		);
	}

	const output = bytes.subarray(best.offset, best.offset + best.length);
	const copy = new Uint8Array(output.byteLength);
	copy.set(output);
	return copy.buffer;
}
