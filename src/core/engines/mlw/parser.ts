/**
 * Parses the MLW container format: a "Root\0"-marked filename block followed
 * by an AES-GCM-encrypted payload. The offsets below are empirical — read
 * off a real MLW file rather than from any published spec — so each one
 * documents what is actually known about it instead of implying a spec that
 * does not exist.
 */

const ROOT_MARKER = new Uint8Array([0x52, 0x6f, 0x6f, 0x74, 0x00]); // "Root\0"

/** Bytes between the filename's NUL terminator and the start of the payload. */
const PAYLOAD_OFFSET_FROM_FILENAME_NUL = 13;

/** AES-GCM uses a 96-bit (12-byte) IV. */
const IV_LENGTH = 12;

/**
 * The ciphertext begins 16 bytes into the payload: the 12-byte IV plus 4
 * bytes of data whose meaning is unidentified (possibly a length prefix or
 * reserved field) — skipped rather than interpreted.
 */
const CIPHERTEXT_OFFSET = 16;

export interface MlwPayload {
	iv: Uint8Array<ArrayBuffer>;
	/** Ciphertext with the AES-GCM authentication tag appended, as Web Crypto's `decrypt()` expects. */
	ciphertextWithTag: Uint8Array<ArrayBuffer>;
}

function findSubarray(
	haystack: Uint8Array,
	needle: Uint8Array,
	from = 0,
): number {
	search: for (let i = from; i <= haystack.length - needle.length; i++) {
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) continue search;
		}
		return i;
	}
	return -1;
}

export function parseMlwContainer(input: ArrayBuffer): MlwPayload {
	const bytes = new Uint8Array(input);

	const rootIdx = findSubarray(bytes, ROOT_MARKER);
	if (rootIdx === -1) {
		throw new Error(
			'parseMlwContainer: "Root\\0" marker not found — not a valid MLW file',
		);
	}

	const filenameStart = rootIdx + ROOT_MARKER.length;
	const nullIdx = bytes.indexOf(0, filenameStart);
	if (nullIdx === -1) {
		throw new Error("parseMlwContainer: filename block has no NUL terminator");
	}

	const payloadStart = nullIdx + PAYLOAD_OFFSET_FROM_FILENAME_NUL;
	const ivEnd = payloadStart + IV_LENGTH;
	const ciphertextStart = payloadStart + CIPHERTEXT_OFFSET;
	if (ivEnd > bytes.length) {
		throw new Error("parseMlwContainer: file truncated before the IV");
	}

	const ciphertextWithTag = bytes.slice(ciphertextStart);
	if (ciphertextStart > bytes.length || ciphertextWithTag.length === 0) {
		throw new Error(
			"parseMlwContainer: file truncated — no ciphertext after the IV",
		);
	}

	return { iv: bytes.slice(payloadStart, ivEnd), ciphertextWithTag };
}
