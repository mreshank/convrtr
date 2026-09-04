/**
 * Strips tags and artwork from a FLAC without re-encoding it.
 *
 * A FLAC file is the four bytes "fLaC", then a run of metadata blocks, then
 * the encoded audio frames. Each block declares its own type and length, so
 * unwanted ones can be dropped by rewriting the block list and copying the
 * audio frames verbatim. The audio is bit-identical afterwards — which for a
 * format whose entire purpose is exactness is the only acceptable outcome.
 *
 * What is deliberately KEPT:
 *   - STREAMINFO — mandatory, and the decoder cannot work without it. It holds
 *     sample rate, channels, bit depth and the MD5 of the audio, none of which
 *     identifies a person.
 *   - SEEKTABLE — purely functional. Removing it makes seeking slower and
 *     protects nobody.
 *
 * What is removed:
 *   - VORBIS_COMMENT — the tags proper, and also the vendor string, which
 *     names the exact encoder and version used.
 *   - PICTURE — embedded artwork, often the largest part of the file.
 *   - APPLICATION — third-party blobs whose contents are anyone's guess.
 *   - CUESHEET — track layout, and can carry ISRC codes identifying a release.
 *   - PADDING — empty space reserved for future tag edits; pointless once the
 *     tags are gone.
 */

const BLOCK_STREAMINFO = 0;
const BLOCK_SEEKTABLE = 3;

/** Blocks worth keeping: required by the decoder, or purely functional. */
const KEEP = new Set([BLOCK_STREAMINFO, BLOCK_SEEKTABLE]);

export function stripFlacMetadata(input: ArrayBuffer): ArrayBuffer {
	const bytes = new Uint8Array(input);
	if (
		bytes.length < 4 ||
		bytes[0] !== 0x66 ||
		bytes[1] !== 0x4c ||
		bytes[2] !== 0x61 ||
		bytes[3] !== 0x43
	) {
		throw new Error('This is not a FLAC file — it does not begin with "fLaC".');
	}

	const kept: { type: number; start: number; end: number }[] = [];
	let offset = 4;
	let audioStart = -1;

	while (offset + 4 <= bytes.length) {
		const header = bytes[offset] ?? 0;
		const isLast = (header & 0x80) !== 0;
		const type = header & 0x7f;
		const length =
			((bytes[offset + 1] ?? 0) << 16) |
			((bytes[offset + 2] ?? 0) << 8) |
			(bytes[offset + 3] ?? 0);
		const bodyStart = offset + 4;
		const bodyEnd = bodyStart + length;
		if (bodyEnd > bytes.length) {
			throw new Error(
				"This FLAC file's metadata is truncated, so it cannot be rewritten safely.",
			);
		}

		if (KEEP.has(type)) kept.push({ type, start: offset, end: bodyEnd });

		offset = bodyEnd;
		if (isLast) {
			audioStart = offset;
			break;
		}
	}

	if (audioStart < 0 || kept.length === 0) {
		throw new Error(
			"This FLAC file has no readable metadata structure, so it cannot be rewritten safely.",
		);
	}

	const audioLength = bytes.length - audioStart;
	const metadataLength = kept.reduce(
		(sum, block) => sum + (block.end - block.start),
		0,
	);
	const output = new Uint8Array(4 + metadataLength + audioLength);
	output.set(bytes.subarray(0, 4), 0);

	let cursor = 4;
	kept.forEach((block, index) => {
		output.set(bytes.subarray(block.start, block.end), cursor);
		// The last-block flag must move to whichever block is now last, or the
		// decoder keeps reading metadata and walks straight into the audio.
		const header = output[cursor] ?? 0;
		const isLast = index === kept.length - 1;
		output[cursor] = isLast ? header | 0x80 : header & 0x7f;
		cursor += block.end - block.start;
	});

	output.set(bytes.subarray(audioStart), cursor);
	return output.buffer as ArrayBuffer;
}
