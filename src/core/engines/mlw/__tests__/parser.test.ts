import { describe, expect, it } from "vitest";
import { parseMlwContainer } from "../parser";

const ROOT_MARKER = [0x52, 0x6f, 0x6f, 0x74, 0x00]; // "Root\0"

/**
 * Builds a synthetic MLW container: some leading bytes, the "Root\0" marker,
 * a NUL-terminated filename, a 12-byte gap, a 12-byte IV, 4 bytes of
 * unidentified/reserved data, then the ciphertext+tag payload.
 *
 * The gap is 12 bytes (not 13) because the IV starts at `nullIdx + 13`: the
 * NUL byte itself occupies index `nullIdx`, so only 12 bytes lie strictly
 * between it and the IV.
 */
function mlw(options: {
	leading?: number[];
	filename?: number[];
	gap?: number[];
	iv?: number[];
	reserved?: number[];
	ciphertextWithTag?: number[];
}): ArrayBuffer {
	const {
		leading = [],
		filename = [0x61, 0x2e, 0x6d, 0x70, 0x34], // "a.mp4"
		gap = new Array(12).fill(0),
		iv = new Array(12).fill(0x11),
		reserved = new Array(4).fill(0),
		ciphertextWithTag = [0xaa, 0xbb, 0xcc, 0xdd, 0xee],
	} = options;

	const bytes = [
		...leading,
		...ROOT_MARKER,
		...filename,
		0x00,
		...gap,
		...iv,
		...reserved,
		...ciphertextWithTag,
	];
	return new Uint8Array(bytes).buffer;
}

describe("parseMlwContainer", () => {
	it("extracts the 12-byte IV and the ciphertext+tag payload", () => {
		const iv = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
		const ciphertextWithTag = [0xde, 0xad, 0xbe, 0xef, 0x01, 0x02];
		const input = mlw({ iv, ciphertextWithTag });

		const result = parseMlwContainer(input);

		expect(Array.from(result.iv)).toEqual(iv);
		expect(Array.from(result.ciphertextWithTag)).toEqual(ciphertextWithTag);
	});

	it("finds the Root marker even when preceded by other bytes", () => {
		const iv = new Array(12).fill(0x22);
		const ciphertextWithTag = [0x01, 0x02, 0x03];
		const input = mlw({
			leading: [0x00, 0x01, 0x02, 0x03, 0x04],
			iv,
			ciphertextWithTag,
		});

		const result = parseMlwContainer(input);

		expect(Array.from(result.iv)).toEqual(iv);
	});

	it("rejects a file with no Root marker", () => {
		const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
		expect(() => parseMlwContainer(input)).toThrow(/root/i);
	});

	it("rejects a file whose filename is never NUL-terminated", () => {
		// Non-zero bytes only, so no NUL exists anywhere for indexOf to find.
		const bytes = [...ROOT_MARKER, 0x61, 0x2e, 0x6d, 0x70, 0x34];
		const input = new Uint8Array(bytes).buffer;
		expect(() => parseMlwContainer(input)).toThrow(/filename/i);
	});

	it("rejects a file truncated before the IV is complete", () => {
		// Gap present, but only 3 of the 12 expected IV bytes follow.
		const bytes = [
			...ROOT_MARKER,
			0x61,
			0x00,
			...new Array(12).fill(0),
			1,
			2,
			3,
		];
		const input = new Uint8Array(bytes).buffer;
		expect(() => parseMlwContainer(input)).toThrow(/truncated/i);
	});

	it("rejects a file with no ciphertext after the IV", () => {
		// Ends exactly at the ciphertext boundary — zero bytes of ciphertext.
		const input = mlw({ ciphertextWithTag: [] });
		expect(() => parseMlwContainer(input)).toThrow(/truncated/i);
	});
});
