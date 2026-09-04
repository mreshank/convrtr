/**
 * Strips tags from an MP3 without touching a single audio frame.
 *
 * MP3 tags are not woven through the audio — they sit in blocks before and
 * after it. ID3v2 is a prefix, ID3v1 a fixed 128-byte suffix, APEv2 another
 * suffix. Removing them is therefore a matter of finding where the audio
 * actually begins and ends and copying that range verbatim: the compressed
 * audio comes out bit-identical, and the file still plays exactly as it did.
 *
 * The alternative — decode and re-encode to produce a "clean" file — would
 * cost real quality to remove a comment field, which is the same bad trade the
 * JPEG stripper exists to avoid.
 *
 * What this removes is not trivia. ID3 frames routinely carry the ripping
 * software and its version, the encoder settings, purchase identifiers from
 * music stores, MusicBrainz IDs that tie a file to a specific release, and
 * free-text comments that have a habit of containing usernames and file paths.
 */

const ID3V2_HEADER = 10;

/** True if the bytes at `at` begin an ID3v2 tag. */
function hasId3v2(bytes: Uint8Array, at: number): boolean {
	return bytes[at] === 0x49 && bytes[at + 1] === 0x44 && bytes[at + 2] === 0x33;
}

/**
 * ID3v2 sizes are "syncsafe": seven bits per byte, with the top bit always
 * clear so the size can never be mistaken for an MPEG frame sync. Reading it
 * as a plain big-endian integer overshoots and truncates the audio.
 */
function syncsafe(bytes: Uint8Array, at: number): number {
	return (
		((bytes[at] ?? 0) & 0x7f) * 0x200000 +
		((bytes[at + 1] ?? 0) & 0x7f) * 0x4000 +
		((bytes[at + 2] ?? 0) & 0x7f) * 0x80 +
		((bytes[at + 3] ?? 0) & 0x7f)
	);
}

function matches(bytes: Uint8Array, at: number, ascii: string): boolean {
	for (let i = 0; i < ascii.length; i++) {
		if (bytes[at + i] !== ascii.charCodeAt(i)) return false;
	}
	return true;
}

export function stripMp3Metadata(input: ArrayBuffer): ArrayBuffer {
	const bytes = new Uint8Array(input);
	let start = 0;
	let end = bytes.length;

	// Leading ID3v2. Several can be stacked, and players read them all, so keep
	// walking rather than assuming one.
	while (start + ID3V2_HEADER <= end && hasId3v2(bytes, start)) {
		const flags = bytes[start + 5] ?? 0;
		const size = syncsafe(bytes, start + 6);
		// Bit 4 of the flags means a 10-byte footer follows the tag body.
		const footer = (flags & 0x10) !== 0 ? ID3V2_HEADER : 0;
		const next = start + ID3V2_HEADER + size + footer;
		if (next <= start || next > end) break;
		start = next;
	}

	// Trailing ID3v1: exactly 128 bytes beginning "TAG". Checked before APE
	// because a file can carry both, with ID3v1 last.
	if (end - start >= 128 && matches(bytes, end - 128, "TAG")) {
		end -= 128;
	}

	// Trailing APEv2. Its 32-byte footer holds the size of the tag *body*, so
	// the whole tag is that plus the footer — and a header may precede it,
	// which the size field does not include.
	if (end - start >= 32 && matches(bytes, end - 32, "APETAGEX")) {
		const view = new DataView(input);
		const bodySize = view.getUint32(end - 32 + 12, true);
		const tagFlags = view.getUint32(end - 32 + 16, true);
		// Bit 31 set means a header is present as well as the footer.
		const header = (tagFlags & 0x80000000) !== 0 ? 32 : 0;
		const candidate = end - 32 - bodySize - header;
		if (candidate >= start) end = candidate;
	}

	if (end <= start) {
		throw new Error(
			"This file appears to be nothing but tags — no audio was found in it.",
		);
	}

	// A copy of exactly the audio range. `slice` on the typed array would share
	// the original buffer's memory in some engines; this guarantees a standalone
	// ArrayBuffer of precisely the right length.
	return bytes.slice(start, end).buffer as ArrayBuffer;
}
