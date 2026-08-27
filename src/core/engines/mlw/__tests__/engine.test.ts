import { describe, expect, it } from "vitest";
import { MLW_KEY_HEX, mlwToMp4Engine } from "../index";

const ROOT_MARKER = [0x52, 0x6f, 0x6f, 0x74, 0x00]; // "Root\0"

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

/** Encrypts `plaintext` with the engine's real key and wraps it in a synthetic MLW container. */
async function encryptToMlw(
	plaintext: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
	const key = await crypto.subtle.importKey(
		"raw",
		hexToBytes(MLW_KEY_HEX),
		"AES-GCM",
		false,
		["encrypt"],
	);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertextWithTag = new Uint8Array(
		await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
	);

	const bytes = [
		...ROOT_MARKER,
		0x61,
		0x2e,
		0x6d,
		0x6c,
		0x77,
		0x00, // "a.mlw\0"
		...new Array(12).fill(0), // gap
		...iv,
		...new Array(4).fill(0), // reserved
		...ciphertextWithTag,
	];
	return new Uint8Array(bytes).buffer;
}

describe("mlwToMp4Engine", () => {
	it("probes true — pure Web Crypto, no WASM", async () => {
		expect(await mlwToMp4Engine.probe()).toBe(true);
	});

	it("decrypts an MLW container back to the original plaintext bytes", async () => {
		const plaintext = new Uint8Array([
			0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
		]); // looks like the start of an MP4 ftyp box
		const input = await encryptToMlw(plaintext);

		const progressPhases: string[] = [];
		const output = await mlwToMp4Engine.run(input, {}, (_ratio, phase) => {
			progressPhases.push(phase);
		});

		expect(new Uint8Array(output)).toEqual(plaintext);
		expect(progressPhases.length).toBeGreaterThan(0);
	});

	it("rejects a file that fails authentication (wrong key, corrupted, or not MLW)", async () => {
		const input = await encryptToMlw(new Uint8Array([1, 2, 3]));
		const corrupted = new Uint8Array(input);
		const lastIdx = corrupted.length - 1;
		corrupted[lastIdx] = (corrupted[lastIdx] ?? 0) ^ 0xff; // flip a ciphertext byte

		await expect(
			mlwToMp4Engine.run(corrupted.buffer, {}, () => {}),
		).rejects.toThrow();
	});
});
