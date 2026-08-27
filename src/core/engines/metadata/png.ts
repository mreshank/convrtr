/**
 * Strips metadata from a PNG without re-encoding it.
 *
 * PNG is a sequence of length-prefixed chunks, so metadata chunks can be
 * dropped and the compressed IDAT data copied verbatim — the pixels come out
 * bit-identical. Decoding and re-encoding would also work here (PNG is
 * lossless) but would burn significant CPU on large images for no benefit.
 *
 * Removed: tEXt / zTXt / iTXt (arbitrary text, frequently tool and path
 * names), eXIf (EXIF, including GPS), tIME (last-modified timestamp).
 *
 * Kept: everything colour- or rendering-critical — iCCP, sRGB, gAMA, cHRM,
 * pHYs, tRNS, bKGD, PLTE, IHDR, IDAT, IEND. Dropping a colour chunk would
 * visibly change the image, which is a degradation masquerading as a privacy
 * feature.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const STRIPPED_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

export function stripPngMetadata(input: ArrayBuffer): ArrayBuffer {
	const bytes = new Uint8Array(input);

	if (bytes.length < 8) {
		throw new Error("stripPngMetadata: file is too short to be a PNG");
	}
	for (const [index, expected] of PNG_SIGNATURE.entries()) {
		if (bytes[index] !== expected) {
			throw new Error("stripPngMetadata: not a PNG (bad signature)");
		}
	}

	const keep: Array<{ start: number; end: number }> = [{ start: 0, end: 8 }];

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 8;
	while (offset + 8 <= bytes.length) {
		const dataLength = view.getUint32(offset);
		const typeBytes = bytes.subarray(offset + 4, offset + 8);
		const type = String.fromCharCode(...typeBytes);
		// length(4) + type(4) + data + crc(4)
		const chunkEnd = offset + 12 + dataLength;
		if (chunkEnd > bytes.length) {
			throw new Error(
				`stripPngMetadata: chunk "${type}" runs past end of file`,
			);
		}

		if (!STRIPPED_CHUNKS.has(type)) {
			keep.push({ start: offset, end: chunkEnd });
		}

		offset = chunkEnd;
		if (type === "IEND") break;
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
