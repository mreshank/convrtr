import { describe, expect, it } from "vitest";
import { rpgmvpToPngEngine } from "../index";
import { PNG_HEADER } from "../parser";

/**
 * Builds a synthetic .rpgmvp encrypted image using the given 16-byte key.
 */
function createSyntheticRpgmvp(
	plaintext: Uint8Array,
	key: Uint8Array,
): ArrayBuffer {
	const output = new Uint8Array(16 + plaintext.length);

	// 16-byte fake header: "RPGMV\0\0\0\0\x03\x01\0\0\0\0\0"
	output.set(
		[
			0x52, 0x50, 0x47, 0x4d, 0x56, 0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x00,
			0x00, 0x00, 0x00, 0x00,
		],
		0,
	);

	// First 16 bytes of plaintext are XORed with key
	for (let i = 0; i < 16; i++) {
		const p = plaintext[i] ?? 0;
		const k = key[i % key.length] ?? 0;
		output[16 + i] = p ^ k;
	}

	// Rest of plaintext is unencrypted
	output.set(plaintext.subarray(16), 32);

	return output.buffer;
}

describe("rpgmvpToPngEngine", () => {
	const testKeyHex = "d41d8cd98f00b204e9800998ecf8427e";
	const testKeyBytes = new Uint8Array([
		0xd4, 0x1d, 0x8c, 0xd9, 0x8f, 0x00, 0xb2, 0x04, 0xe9, 0x80, 0x09, 0x98,
		0xec, 0xf8, 0x42, 0x7e,
	]);

	it("probes successfully", async () => {
		expect(await rpgmvpToPngEngine.probe()).toBe(true);
	});

	it("automatically deduces the key and decrypts the PNG without System.json", async () => {
		// Valid PNG bytes: standard 16-byte header + arbitrary pixel payload
		const originalPng = new Uint8Array(64);
		originalPng.set(PNG_HEADER, 0);
		for (let i = 16; i < 64; i++) {
			originalPng[i] = i * 3;
		}

		const encrypted = createSyntheticRpgmvp(originalPng, testKeyBytes);
		const decrypted = await rpgmvpToPngEngine.run(encrypted, {}, () => {});

		expect(new Uint8Array(decrypted)).toEqual(originalPng);
	});

	it("decrypts using an explicit custom hex key if provided", async () => {
		const originalPng = new Uint8Array(48);
		originalPng.set(PNG_HEADER, 0);
		for (let i = 16; i < 48; i++) {
			originalPng[i] = 255 - i;
		}

		const encrypted = createSyntheticRpgmvp(originalPng, testKeyBytes);
		const decrypted = await rpgmvpToPngEngine.run(
			encrypted,
			{ key: testKeyHex },
			() => {},
		);

		expect(new Uint8Array(decrypted)).toEqual(originalPng);
	});

	it("rejects files that do not have the RPGMV header marker", async () => {
		const badHeader = new Uint8Array(32);
		badHeader.set([0x00, 0x01, 0x02, 0x03, 0x04], 0);

		await expect(
			rpgmvpToPngEngine.run(badHeader.buffer, {}, () => {}),
		).rejects.toThrow(/RPGMV marker/i);
	});

	it("rejects truncated files under 32 bytes", async () => {
		const truncated = new Uint8Array([0x52, 0x50, 0x47, 0x4d, 0x56]);

		await expect(
			rpgmvpToPngEngine.run(truncated.buffer, {}, () => {}),
		).rejects.toThrow(/truncated/i);
	});
});
