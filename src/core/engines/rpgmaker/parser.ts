/**
 * RPG Maker MV and MZ encrypted asset parser and decrypter.
 *
 * RPG Maker MV/MZ encrypts images (.rpgmvp), OGG audio (.rpgmvo), and M4A audio (.rpgmvm)
 * using a simple 16-byte XOR obfuscation:
 * - Bytes 0..15 (16 bytes): Fake header ("RPGMV\0\0\0...")
 * - Bytes 16..31 (16 bytes): The original file's first 16 bytes XORed with a 16-byte encryption key
 * - Bytes 32..end: Completely unencrypted original file bytes!
 *
 * Because standard PNG files always begin with the identical 16-byte sequence
 * (\x89PNG\r\n\x1a\n\0\0\0\rIHDR), we can deduce the 16-byte key automatically
 * via known-plaintext XOR recovery without needing System.json!
 */

export const RPGMV_MAGIC = new Uint8Array([0x52, 0x50, 0x47, 0x4d, 0x56]); // "RPGMV"

export const PNG_HEADER = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
	0x48, 0x44, 0x52,
]);

export const OGG_HEADER = new Uint8Array([0x4f, 0x67, 0x67, 0x53]); // "OggS"

export function parseHexKey(hex: string): Uint8Array {
	const clean = hex.replace(/[^0-9a-fA-F]/g, "");
	if (clean.length !== 32) {
		throw new Error(
			`parseHexKey: Key must be exactly 32 hex characters (16 bytes), got ${clean.length}`,
		);
	}
	const bytes = new Uint8Array(16);
	for (let i = 0; i < 16; i++) {
		bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

/**
 * Validates the 16-byte RPGMV header.
 */
function validateRpgmvHeader(bytes: Uint8Array, callerName: string): void {
	if (bytes.length < 32) {
		throw new Error(
			`${callerName}: File is truncated (must be at least 32 bytes for header and payload)`,
		);
	}

	for (let i = 0; i < RPGMV_MAGIC.length; i++) {
		if (bytes[i] !== RPGMV_MAGIC[i]) {
			throw new Error(
				`${callerName}: Invalid header — file does not begin with the RPGMV marker`,
			);
		}
	}
}

/**
 * Validates the RPG Maker MV/MZ file header and returns the decrypted PNG bytes.
 * If customKeyHex is not provided, automatically recovers the key from PNG known plaintext.
 */
export function decryptRpgmvp(
	input: ArrayBuffer,
	customKeyHex?: string,
): ArrayBuffer {
	const bytes = new Uint8Array(input);
	validateRpgmvHeader(bytes, "decryptRpgmvp");

	let key: Uint8Array;
	if (customKeyHex && customKeyHex.trim().length > 0) {
		key = parseHexKey(customKeyHex);
	} else {
		// Zero-knowledge known-plaintext key deduction:
		// Key[i] = Cipher[16 + i] ^ PNG_HEADER[i]
		key = new Uint8Array(16);
		for (let i = 0; i < 16; i++) {
			const byteVal = bytes[16 + i] ?? 0;
			const pngVal = PNG_HEADER[i] ?? 0;
			key[i] = byteVal ^ pngVal;
		}
	}

	const outputLength = bytes.length - 16;
	const output = new Uint8Array(outputLength);

	for (let i = 0; i < 16; i++) {
		const byteVal = bytes[16 + i] ?? 0;
		const keyVal = key[i] ?? 0;
		output[i] = byteVal ^ keyVal;
	}

	output.set(bytes.subarray(32), 16);
	return output.buffer;
}

/**
 * Decrypts an RPG Maker MV/MZ encrypted OGG audio file (.rpgmvo).
 */
export function decryptRpgmvo(
	input: ArrayBuffer,
	customKeyHex?: string,
): ArrayBuffer {
	const bytes = new Uint8Array(input);
	validateRpgmvHeader(bytes, "decryptRpgmvo");

	if (!customKeyHex || customKeyHex.trim().length === 0) {
		throw new Error(
			"decryptRpgmvo: The 16-byte encryption key is required to decrypt audio. You can find this key in your game's data/System.json (under 'encryptionKey') or by first decrypting any .rpgmvp image with convrtr.",
		);
	}

	const key = parseHexKey(customKeyHex);
	const outputLength = bytes.length - 16;
	const output = new Uint8Array(outputLength);

	for (let i = 0; i < 16; i++) {
		const byteVal = bytes[16 + i] ?? 0;
		const keyVal = key[i] ?? 0;
		output[i] = byteVal ^ keyVal;
	}

	output.set(bytes.subarray(32), 16);
	return output.buffer;
}

/**
 * Decrypts an RPG Maker MV/MZ encrypted M4A audio file (.rpgmvm).
 */
export function decryptRpgmvm(
	input: ArrayBuffer,
	customKeyHex?: string,
): ArrayBuffer {
	const bytes = new Uint8Array(input);
	validateRpgmvHeader(bytes, "decryptRpgmvm");

	if (!customKeyHex || customKeyHex.trim().length === 0) {
		throw new Error(
			"decryptRpgmvm: The 16-byte encryption key is required to decrypt audio. You can find this key in your game's data/System.json (under 'encryptionKey') or by first decrypting any .rpgmvp image with convrtr.",
		);
	}

	const key = parseHexKey(customKeyHex);
	const outputLength = bytes.length - 16;
	const output = new Uint8Array(outputLength);

	for (let i = 0; i < 16; i++) {
		const byteVal = bytes[16 + i] ?? 0;
		const keyVal = key[i] ?? 0;
		output[i] = byteVal ^ keyVal;
	}

	output.set(bytes.subarray(32), 16);
	return output.buffer;
}
