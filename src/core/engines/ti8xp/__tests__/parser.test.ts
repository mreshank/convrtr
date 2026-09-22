import { describe, expect, it } from "vitest";
import { convert8xpToText, parse8xp } from "../parser";

describe("ti8xp parser", () => {
	function buildMock8xp(tokens: number[], name = "TESTPROG"): Uint8Array {
		const totalHeaderLen = 55;
		const varHeaderLen = 17; // dataStart(0..16)
		const exprLen = tokens.length;
		const dataLen = varHeaderLen + exprLen;
		const totalLen = totalHeaderLen + dataLen + 2; // + 2 for checksum
		const buf = new Uint8Array(totalLen);

		// Signature "**TI83F*"
		const sig = new TextEncoder().encode("**TI83F*");
		buf.set(sig, 0);
		buf[8] = 0x1a;
		buf[9] = 0x0a;
		buf[10] = 0x00;

		// Comment
		const comment = new TextEncoder().encode("Test program comment");
		buf.set(comment, 11);

		// Data length at 53..54
		buf[53] = dataLen & 0xff;
		buf[54] = (dataLen >> 8) & 0xff;

		const dataStart = 55;
		buf[dataStart] = 0x0b;
		buf[dataStart + 1] = 0x00;
		buf[dataStart + 2] = (exprLen + 2) & 0xff;
		buf[dataStart + 3] = ((exprLen + 2) >> 8) & 0xff;
		buf[dataStart + 4] = 0x05; // Program type

		// Var name
		const nameBytes = new TextEncoder().encode(name);
		buf.set(nameBytes.subarray(0, 8), dataStart + 5);

		// Expression length at 15..16
		buf[dataStart + 15] = exprLen & 0xff;
		buf[dataStart + 16] = (exprLen >> 8) & 0xff;

		// Tokens
		buf.set(tokens, dataStart + 17);

		// Calculate checksum
		let sum = 0;
		for (let i = dataStart; i < dataStart + dataLen; i++) {
			sum = (sum + (buf[i] ?? 0)) & 0xffff;
		}
		buf[dataStart + dataLen] = sum & 0xff;
		buf[dataStart + dataLen + 1] = (sum >> 8) & 0xff;

		return buf;
	}

	it("parses valid .8xp file and de-tokenizes ClrHome, Disp, Prompt, If, Then", () => {
		// Tokens:
		// ClrHome (0xB0)
		// newline (0x3F)
		// Prompt (0xCE) A (0x41)
		// newline (0x3F)
		// Disp (0xD0) " (0x2A) H (0x48) I (0x49) " (0x2A)
		const tokens = [0xb0, 0x3f, 0xce, 0x41, 0x3f, 0xd0, 0x2a, 0x48, 0x49, 0x2a];
		const file = buildMock8xp(tokens, "HELLO");
		const res = parse8xp(file);

		expect(res.name).toBe("HELLO");
		expect(res.comment).toBe("Test program comment");
		expect(res.isProtected).toBe(false);
		expect(res.checksumValid).toBe(true);
		expect(res.code).toContain("ClrHome");
		expect(res.code).toContain("Prompt A");
		expect(res.code).toContain('Disp "HI"');
	});

	it("de-tokenizes 2-byte BB prefix tokens (e.g. <=, >=, !=)", () => {
		// Tokens: If (0xDC) A (0x41) <= (0xBB, 0x6A) B (0x42)
		const tokens = [0xdc, 0x41, 0xbb, 0x6a, 0x42];
		const file = buildMock8xp(tokens);
		const res = parse8xp(file);
		expect(res.code).toBe("If A≤B");
	});

	it("converts to plain text and markdown outputs", () => {
		const tokens = [0xb0, 0x3f, 0xd0, 0x11];
		const file = buildMock8xp(tokens, "DEMO");
		const txt = new TextDecoder().decode(
			convert8xpToText(file.buffer as ArrayBuffer, false),
		);
		expect(txt).toContain("// PROGRAM: DEMO");
		expect(txt).toContain("ClrHome");

		const md = new TextDecoder().decode(
			convert8xpToText(file.buffer as ArrayBuffer, true),
		);
		expect(md).toContain("# DEMO");
		expect(md).toContain("```basic");
	});

	it("throws on invalid header signature", () => {
		const bad = new Uint8Array(60);
		expect(() => parse8xp(bad)).toThrow(
			'Invalid .8xp header: expected "**TI83F*"',
		);
	});
});
