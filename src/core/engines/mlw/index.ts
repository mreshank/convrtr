import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseMlwContainer } from "./parser";

/**
 * The AES-128-GCM key embedded in every install of the MLW-producing app,
 * recovered by inspecting its client. It is not a per-file or per-user
 * secret — every MLW file from this app is encrypted with the same key, so
 * the "encryption" only prevents casual inspection, not a determined reader.
 */
export const MLW_KEY_HEX = "d27e154628ae2ba6ab4b9775165ff737";

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

let cachedKey: Promise<CryptoKey> | undefined;
function importKey(): Promise<CryptoKey> {
	cachedKey ??= crypto.subtle.importKey(
		"raw",
		hexToBytes(MLW_KEY_HEX),
		"AES-GCM",
		false,
		["decrypt"],
	);
	return cachedKey;
}

/**
 * Decrypts an MLW-wrapped video back to plain MP4 bytes.
 *
 * MLW is a proprietary container: a "Root\0"-marked filename block followed
 * by an AES-GCM-encrypted payload. There is no re-encoding step — the MP4
 * bytes inside are already valid MP4, so this only has to find them.
 */
export const mlwToMp4Engine: Engine = {
	id: "extract:mlw-to-mp4",

	async probe() {
		// Pure Web Crypto — no WASM, available in every modern browser.
		return typeof crypto?.subtle !== "undefined";
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.1, "PARSE");
		const { iv, ciphertextWithTag } = parseMlwContainer(input);

		onProgress(0.4, "DECRYPT");
		const key = await importKey();
		const plaintext = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			key,
			ciphertextWithTag,
		);

		onProgress(1, "DONE");
		return plaintext;
	},
};
