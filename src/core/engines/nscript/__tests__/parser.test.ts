import { describe, expect, it } from "vitest";
import { convertNScriptToText, decryptNScript } from "../parser";

describe("nscript parser", () => {
	it("decrypts XOR 0x84 obfuscated script accurately", () => {
		const originalScript =
			"*start\ncl\nbg black\n`Welcome to the visual novel.`\nclick\nend\n";
		const plainBytes = new TextEncoder().encode(originalScript);
		const cipherBytes = new Uint8Array(plainBytes.length);

		for (let i = 0; i < plainBytes.length; i++) {
			cipherBytes[i] = (plainBytes[i] ?? 0) ^ 0x84;
		}

		const res = decryptNScript(cipherBytes);
		expect(res.text).toBe(originalScript);
		expect(res.lineCount).toBe(7);
		expect(res.encoding).toBe("utf-8");
	});

	it("converts to plain text and markdown outputs", () => {
		const originalScript = "*start\ntext\n";
		const plainBytes = new TextEncoder().encode(originalScript);
		const cipherBytes = new Uint8Array(plainBytes.length);
		for (let i = 0; i < plainBytes.length; i++) {
			cipherBytes[i] = (plainBytes[i] ?? 0) ^ 0x84;
		}

		const txt = new TextDecoder().decode(
			convertNScriptToText(cipherBytes.buffer as ArrayBuffer, false),
		);
		expect(txt).toBe(originalScript);

		const md = new TextDecoder().decode(
			convertNScriptToText(cipherBytes.buffer as ArrayBuffer, true),
		);
		expect(md).toContain("# NScripter Decompiled Script");
		expect(md).toContain("*start");
	});

	it("throws on empty input", () => {
		expect(() => decryptNScript(new Uint8Array(0))).toThrow(
			"Invalid nscript.dat file: file is empty.",
		);
	});
});
