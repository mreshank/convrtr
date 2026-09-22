/**
 * NScripter / ONScripter Script Archive (nscript.dat) Decryptor & Parser.
 *
 * NScripter was the game engine behind iconic Japanese visual novels, including
 * Tsukihime, Higurashi When They Cry, Umineko no Naku Koro ni, and Narcissu.
 * The master game narrative script is stored in an obfuscated `nscript.dat` file.
 *
 * Cryptographic Scheme:
 * The entire `nscript.dat` binary stream is obfuscated via a single-byte bitwise
 * XOR with key 0x84 (132 decimal):
 * Plaintext_i = Ciphertext_i ^ 0x84
 *
 * Once decrypted, the payload contains Japanese Shift-JIS or UTF-8 text with
 * NScripter script command tags (*start, cl, bg, wav, play, text).
 */

export interface NScriptResult {
	text: string;
	lineCount: number;
	encoding: "shift-jis" | "utf-8";
}

export function decryptNScript(cipherBytes: Uint8Array): NScriptResult {
	if (cipherBytes.length === 0) {
		throw new Error("Invalid nscript.dat file: file is empty.");
	}

	const plain = new Uint8Array(cipherBytes.length);
	for (let i = 0; i < cipherBytes.length; i++) {
		const b = cipherBytes[i] ?? 0;
		plain[i] = b ^ 0x84;
	}

	// Try UTF-8 first, fallback to Shift-JIS
	let text = "";
	let encoding: "shift-jis" | "utf-8" = "utf-8";

	try {
		const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
		text = utf8Decoder.decode(plain);
		encoding = "utf-8";
	} catch {
		// Fallback to Shift-JIS (standard for legacy Japanese NScripter titles)
		try {
			const sjisDecoder = new TextDecoder("shift-jis", { fatal: false });
			text = sjisDecoder.decode(plain);
			encoding = "shift-jis";
		} catch {
			text = new TextDecoder("latin1").decode(plain);
		}
	}

	const lines = text.split(/\r?\n/);
	return {
		text,
		lineCount: lines.length,
		encoding,
	};
}

export function convertNScriptToText(
	input: ArrayBuffer,
	asMarkdown = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Decrypting nscript.dat with XOR 0x84...");
	const result = decryptNScript(new Uint8Array(input));

	onProgress?.(
		0.7,
		`Decoded ${result.lineCount} script lines (${result.encoding})...`,
	);
	let output = "";

	if (asMarkdown) {
		output = `# NScripter Decompiled Script\n\n`;
		output += `- **Lines:** ${result.lineCount}\n`;
		output += `- **Detected Encoding:** ${result.encoding.toUpperCase()}\n\n`;
		output += `\`\`\`text\n${result.text}\n\`\`\`\n`;
	} else {
		output = result.text;
	}

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(output).buffer as ArrayBuffer;
}
