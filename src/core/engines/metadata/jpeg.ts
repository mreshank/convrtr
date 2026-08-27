/**
 * Strips metadata from a JPEG without re-encoding it.
 *
 * The naive approach — decode to pixels, encode again — removes metadata but
 * re-compresses the photo, so a user loses image quality in exchange for
 * removing a GPS tag. That trade is unnecessary: JPEG metadata lives in
 * discrete APPn marker segments ahead of the compressed scan data, so it can
 * be excised by rewriting the segment list and copying the entropy-coded
 * bytes verbatim. The pixels come out bit-identical.
 *
 * What is deliberately KEPT:
 *   - APP0 (JFIF) — density/units; some older decoders expect it present.
 *   - APP2 (ICC profile) — colour-critical. Dropping an ICC profile visibly
 *     shifts colour on wide-gamut images, which would be a silent
 *     degradation dressed up as a privacy feature.
 *
 * What is removed:
 *   - APP1  — EXIF and XMP. This is where GPS coordinates, camera serial
 *             numbers, timestamps and software fingerprints live.
 *   - APP13 — IPTC / Photoshop resource blocks (captions, credits, and on
 *             some pipelines a second copy of location data).
 *   - COM   — free-text comments, which frequently leak tool and path names.
 */

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;

/** Markers that stand alone with no length field following them. */
function isStandalone(marker: number): boolean {
	return (
		marker === SOI ||
		marker === EOI ||
		marker === 0x01 ||
		(marker >= 0xd0 && marker <= 0xd7)
	);
}

const STRIPPED_MARKERS = new Set([
	0xe1, // APP1  — EXIF / XMP (GPS lives here)
	0xed, // APP13 — IPTC / Photoshop
	0xfe, // COM   — comment
]);

export function stripJpegMetadata(input: ArrayBuffer): ArrayBuffer {
	const bytes = new Uint8Array(input);

	if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== SOI) {
		throw new Error("stripJpegMetadata: not a JPEG (missing SOI marker)");
	}

	const keep: Array<{ start: number; end: number }> = [];
	// The SOI itself.
	keep.push({ start: 0, end: 2 });

	let offset = 2;
	while (offset < bytes.length) {
		if (bytes[offset] !== 0xff) {
			throw new Error(
				`stripJpegMetadata: expected a marker at byte ${offset}, found 0x${bytes[offset]?.toString(16)}`,
			);
		}

		// Runs of 0xFF are legal padding before a marker.
		let markerAt = offset;
		while (markerAt < bytes.length && bytes[markerAt] === 0xff) markerAt += 1;
		const marker = bytes[markerAt];
		if (marker === undefined) break;

		if (isStandalone(marker)) {
			keep.push({ start: offset, end: markerAt + 1 });
			offset = markerAt + 1;
			continue;
		}

		const lengthAt = markerAt + 1;
		const high = bytes[lengthAt];
		const low = bytes[lengthAt + 1];
		if (high === undefined || low === undefined) {
			throw new Error("stripJpegMetadata: truncated segment length");
		}
		const segmentLength = (high << 8) | low;
		const segmentEnd = lengthAt + segmentLength;
		if (segmentEnd > bytes.length) {
			throw new Error(
				"stripJpegMetadata: segment length runs past end of file",
			);
		}

		if (marker === SOS) {
			// Everything from here to the end is entropy-coded scan data plus the
			// EOI. Copy it verbatim — this is the compressed image, and touching
			// it is exactly what this function exists to avoid.
			keep.push({ start: offset, end: bytes.length });
			break;
		}

		if (!STRIPPED_MARKERS.has(marker)) {
			keep.push({ start: offset, end: segmentEnd });
		}
		offset = segmentEnd;
	}

	const total = keep.reduce((sum, range) => sum + (range.end - range.start), 0);
	const out = new Uint8Array(total);
	let written = 0;
	for (const range of keep) {
		out.set(bytes.subarray(range.start, range.end), written);
		written += range.end - range.start;
	}
	return out.buffer;
}
