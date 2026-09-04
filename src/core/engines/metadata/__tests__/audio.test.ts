import { describe, expect, it } from "vitest";
import { stripFlacMetadata } from "../flac";
import { stripMp3Metadata } from "../mp3";

/** Bytes that stand in for audio, distinctive enough to locate afterwards. */
const AUDIO = Uint8Array.from([0xff, 0xfb, 0x90, 0x64, 1, 2, 3, 4, 5, 6, 7, 8]);

function id3v2Header(bodyLength: number, flags = 0): Uint8Array {
	const tag = new Uint8Array(10);
	tag.set([0x49, 0x44, 0x33, 3, 0], 0); // "ID3", version 3.0
	tag[5] = flags;
	// Syncsafe: seven bits per byte.
	tag[6] = (bodyLength >> 21) & 0x7f;
	tag[7] = (bodyLength >> 14) & 0x7f;
	tag[8] = (bodyLength >> 7) & 0x7f;
	tag[9] = bodyLength & 0x7f;
	return tag;
}

function join(...parts: Uint8Array[]): ArrayBuffer {
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(total);
	let at = 0;
	for (const part of parts) {
		out.set(part, at);
		at += part.length;
	}
	return out.buffer;
}

describe("stripMp3Metadata", () => {
	it("removes a leading ID3v2 tag and keeps the audio byte-identical", () => {
		const result = new Uint8Array(
			stripMp3Metadata(join(id3v2Header(40), new Uint8Array(40), AUDIO)),
		);
		expect(Array.from(result)).toEqual(Array.from(AUDIO));
	});

	it("reads the size as syncsafe, not as a plain integer", () => {
		// A body of 200 bytes encodes as 0x01,0x48 in syncsafe. Read as
		// big-endian it would be 328, overshooting into the audio and silently
		// truncating it — the classic ID3 bug.
		const result = new Uint8Array(
			stripMp3Metadata(join(id3v2Header(200), new Uint8Array(200), AUDIO)),
		);
		expect(Array.from(result)).toEqual(Array.from(AUDIO));
	});

	it("removes a trailing ID3v1 tag", () => {
		const v1 = new Uint8Array(128);
		v1.set([0x54, 0x41, 0x47], 0); // "TAG"
		const result = new Uint8Array(stripMp3Metadata(join(AUDIO, v1)));
		expect(Array.from(result)).toEqual(Array.from(AUDIO));
	});

	it("removes stacked ID3v2 tags", () => {
		// Rare but legal, and players read them all — so leaving the second one
		// would leave the data it holds.
		const result = new Uint8Array(
			stripMp3Metadata(
				join(
					id3v2Header(8),
					new Uint8Array(8),
					id3v2Header(4),
					new Uint8Array(4),
					AUDIO,
				),
			),
		);
		expect(Array.from(result)).toEqual(Array.from(AUDIO));
	});

	it("accounts for the ID3v2 footer when the flag is set", () => {
		const flagged = id3v2Header(16, 0x10);
		const result = new Uint8Array(
			stripMp3Metadata(
				join(flagged, new Uint8Array(16), new Uint8Array(10), AUDIO),
			),
		);
		expect(Array.from(result)).toEqual(Array.from(AUDIO));
	});

	it("leaves a file with no tags completely unchanged", () => {
		const result = new Uint8Array(stripMp3Metadata(join(AUDIO)));
		expect(Array.from(result)).toEqual(Array.from(AUDIO));
	});

	it("refuses a file that is nothing but tags", () => {
		expect(() =>
			stripMp3Metadata(join(id3v2Header(4), new Uint8Array(4))),
		).toThrow(/nothing but tags/i);
	});
});

function flacBlock(type: number, length: number, isLast: boolean): Uint8Array {
	const block = new Uint8Array(4 + length);
	block[0] = (isLast ? 0x80 : 0) | type;
	block[1] = (length >> 16) & 0xff;
	block[2] = (length >> 8) & 0xff;
	block[3] = length & 0xff;
	return block;
}

const FLAC_MAGIC = Uint8Array.from([0x66, 0x4c, 0x61, 0x43]);

describe("stripFlacMetadata", () => {
	it("keeps STREAMINFO and the audio, dropping tags and artwork", () => {
		const input = join(
			FLAC_MAGIC,
			flacBlock(0, 34, false), // STREAMINFO
			flacBlock(4, 20, false), // VORBIS_COMMENT
			flacBlock(6, 50, true), // PICTURE, last
			AUDIO,
		);
		const result = new Uint8Array(stripFlacMetadata(input));

		// magic + STREAMINFO header/body + audio, and nothing else.
		expect(result.length).toBe(4 + 4 + 34 + AUDIO.length);
		expect(Array.from(result.subarray(0, 4))).toEqual(Array.from(FLAC_MAGIC));
		expect(Array.from(result.subarray(result.length - AUDIO.length))).toEqual(
			Array.from(AUDIO),
		);
	});

	it("moves the last-block flag to whichever block is now last", () => {
		// Without this the decoder keeps reading metadata and walks into the
		// audio — a file that looks right and does not play.
		const input = join(
			FLAC_MAGIC,
			flacBlock(0, 34, false),
			flacBlock(4, 8, true),
			AUDIO,
		);
		const result = new Uint8Array(stripFlacMetadata(input));

		const blockHeader = result[4] ?? 0;
		expect(blockHeader & 0x80, "STREAMINFO must now be marked last").toBe(0x80);
		expect(blockHeader & 0x7f, "and must still be type 0").toBe(0);
	});

	it("keeps a SEEKTABLE, which is functional rather than personal", () => {
		const input = join(
			FLAC_MAGIC,
			flacBlock(0, 34, false),
			flacBlock(3, 18, false), // SEEKTABLE
			flacBlock(4, 8, true), // VORBIS_COMMENT
			AUDIO,
		);
		const result = new Uint8Array(stripFlacMetadata(input));

		expect(result.length).toBe(4 + (4 + 34) + (4 + 18) + AUDIO.length);
	});

	it("rejects something that is not a FLAC file", () => {
		expect(() => stripFlacMetadata(join(AUDIO))).toThrow(/not a FLAC file/i);
	});

	it("refuses truncated metadata rather than producing a broken file", () => {
		const input = join(FLAC_MAGIC, flacBlock(0, 34, false).subarray(0, 10));
		expect(() => stripFlacMetadata(input)).toThrow(/truncated/i);
	});
});
