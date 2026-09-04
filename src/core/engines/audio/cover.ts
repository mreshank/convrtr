import type { ParamValue } from "@/core/quality";
import type { Engine, OutputType } from "../types";

/**
 * Pulls the embedded artwork out of an MP3 or FLAC.
 *
 * The image is copied out exactly as it was stored — the same JPEG or PNG
 * bytes the tagger put in, not a re-encode of them. That is worth insisting on
 * even though nothing would obviously look wrong otherwise: re-encoding a JPEG
 * in order to save it under a different name would visibly degrade an image
 * the user assumes they are simply retrieving.
 *
 * Because the stored type varies, the engine reports what it actually found
 * rather than the tool declaring it up front. Naming a PNG `.jpg` would hand
 * back a file some tools refuse to open.
 */

/** Sniffed from the bytes; a tagger's declared MIME is often wrong or absent. */
function detectImageType(bytes: Uint8Array): OutputType {
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return { ext: "jpg", mime: "image/jpeg" };
	}
	if (
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return { ext: "png", mime: "image/png" };
	}
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
		return { ext: "gif", mime: "image/gif" };
	}
	// Deliberately not a guess. An unknown container saved under a plausible
	// extension is worse than one the user can inspect for themselves.
	return { ext: "bin", mime: "application/octet-stream" };
}

function syncsafe(bytes: Uint8Array, at: number): number {
	return (
		((bytes[at] ?? 0) & 0x7f) * 0x200000 +
		((bytes[at + 1] ?? 0) & 0x7f) * 0x4000 +
		((bytes[at + 2] ?? 0) & 0x7f) * 0x80 +
		((bytes[at + 3] ?? 0) & 0x7f)
	);
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
	let out = "";
	for (let i = 0; i < length; i++) {
		out += String.fromCharCode(bytes[at + i] ?? 0);
	}
	return out;
}

/**
 * Finds the APIC frame in an ID3v2 tag.
 *
 * Frame sizes are syncsafe in ID3v2.4 but plain big-endian in 2.3, and reading
 * the wrong one walks the frame list off into nonsense. The version byte in the
 * tag header decides which.
 */
function extractFromMp3(input: ArrayBuffer): Uint8Array {
	const bytes = new Uint8Array(input);
	if (!(bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)) {
		throw new Error(
			"This MP3 has no ID3 tag, so there is no embedded artwork to extract.",
		);
	}

	const major = bytes[3] ?? 0;
	const tagSize = syncsafe(bytes, 6);
	const end = Math.min(bytes.length, 10 + tagSize);
	let offset = 10;

	while (offset + 10 <= end) {
		const id = ascii(bytes, offset, 4);
		const size =
			major >= 4
				? syncsafe(bytes, offset + 4)
				: ((bytes[offset + 4] ?? 0) << 24) |
					((bytes[offset + 5] ?? 0) << 16) |
					((bytes[offset + 6] ?? 0) << 8) |
					(bytes[offset + 7] ?? 0);

		// A frame id of zero bytes means padding, which fills the rest of the tag.
		if (size <= 0 || bytes[offset] === 0) break;

		if (id === "APIC") {
			const body = offset + 10;
			const frameEnd = body + size;
			// Layout: one encoding byte, a null-terminated MIME string, a picture
			// type byte, a description terminated in the frame's own encoding, and
			// then the image data.
			const encoding = bytes[body] ?? 0;
			let cursor = body + 1;
			while (cursor < frameEnd && bytes[cursor] !== 0) cursor++;
			cursor++;
			cursor++;

			if (encoding === 1 || encoding === 2) {
				// UTF-16 descriptions terminate with two zero bytes, not one.
				while (
					cursor + 1 < frameEnd &&
					!(bytes[cursor] === 0 && bytes[cursor + 1] === 0)
				) {
					cursor += 2;
				}
				cursor += 2;
			} else {
				while (cursor < frameEnd && bytes[cursor] !== 0) cursor++;
				cursor++;
			}

			const image = bytes.subarray(cursor, frameEnd);
			if (image.length === 0) {
				throw new Error("This file's artwork frame is empty.");
			}
			return image;
		}

		offset += 10 + size;
	}

	throw new Error("This MP3 has no embedded artwork.");
}

/** Finds the PICTURE block in a FLAC's metadata. */
function extractFromFlac(input: ArrayBuffer): Uint8Array {
	const bytes = new Uint8Array(input);
	if (
		bytes[0] !== 0x66 ||
		bytes[1] !== 0x4c ||
		bytes[2] !== 0x61 ||
		bytes[3] !== 0x43
	) {
		throw new Error('This is not a FLAC file — it does not begin with "fLaC".');
	}

	let offset = 4;
	while (offset + 4 <= bytes.length) {
		const header = bytes[offset] ?? 0;
		const isLast = (header & 0x80) !== 0;
		const type = header & 0x7f;
		const length =
			((bytes[offset + 1] ?? 0) << 16) |
			((bytes[offset + 2] ?? 0) << 8) |
			(bytes[offset + 3] ?? 0);
		const body = offset + 4;

		if (type === 6) {
			// PICTURE, all fields big-endian: picture type, MIME length and string,
			// description length and string, then width, height, colour depth and
			// indexed-colour count, then the image length and the image itself.
			const view = new DataView(input);
			let cursor = body + 4;
			cursor += 4 + view.getUint32(cursor, false);
			cursor += 4 + view.getUint32(cursor, false);
			cursor += 16;
			const dataLength = view.getUint32(cursor, false);
			cursor += 4;

			const image = bytes.subarray(cursor, cursor + dataLength);
			if (image.length === 0) {
				throw new Error("This file's artwork block is empty.");
			}
			return image;
		}

		offset = body + length;
		if (isLast) break;
	}

	throw new Error("This FLAC has no embedded artwork.");
}

export function createCoverExtractEngine(format: "mp3" | "flac"): Engine {
	const extract = format === "mp3" ? extractFromMp3 : extractFromFlac;

	return {
		id: `extract:cover-${format}`,

		async probe() {
			// Byte manipulation only — nothing to feature-detect.
			return true;
		},

		async run(
			input: ArrayBuffer,
			_params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
			onOutputType?: (type: OutputType) => void,
		) {
			onProgress(0.2, "SCAN");
			const image = extract(input);
			const type = detectImageType(image);
			onOutputType?.(type);

			if (type.ext === "bin") {
				onNotice?.(
					"The embedded artwork is not in a format convrtr recognises, so it was saved with a .bin extension rather than guessed at. The bytes are exactly what the file contained.",
				);
			} else {
				onNotice?.(
					`Extracted a ${type.ext.toUpperCase()} of ${(image.length / 1024).toFixed(0)}KB, copied out exactly as it was stored — the image was not re-encoded.`,
				);
			}

			onProgress(1, "EXTRACT");
			// A standalone copy: `subarray` shares the input's buffer, which would
			// keep the whole audio file alive behind a small image.
			return image.slice().buffer as ArrayBuffer;
		},
	};
}
