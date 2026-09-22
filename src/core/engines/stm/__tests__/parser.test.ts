import { describe, expect, it } from "vitest";
import { stmToWavEngine } from "../index";
import { convertStmToWav } from "../parser";

function buildStm(): Uint8Array {
	const parts: Uint8Array[] = [];
	const head = new Uint8Array(0x30);
	const enc = new TextEncoder();
	enc.encodeInto("Test Song", head.subarray(0));
	enc.encodeInto("!Scream!", head.subarray(0x14));
	head[0x1c] = 0x1a;
	head[0x1d] = 2; // module
	head[0x1e] = 2; // v2
	head[0x1f] = 21; // 2.21 hex tempo
	head[0x20] = 0x60; // tpr 6, fac 0
	head[0x21] = 1; // 1 pattern
	head[0x22] = 64;
	parts.push(head);

	// 31 sample headers (32 bytes each).
	const sampleData = new Uint8Array([0, 64, 192, 0]); // signed PCM: 0, .5, -.5, 0
	const headers = new Uint8Array(31 * 32);
	const hv = new DataView(headers.buffer);
	enc.encodeInto("kick", headers.subarray(0));
	hv.setUint16(0x0e, 0, true); // patched below
	hv.setUint16(0x10, sampleData.length, true);
	hv.setUint16(0x12, 0, true);
	hv.setUint16(0x14, 0, true);
	headers[0x16] = 64;
	hv.setUint16(0x18, 8363, true);
	parts.push(headers);

	// Orders at 0x410: pattern 0 then end.
	const orders = new Uint8Array(128).fill(99);
	orders[0] = 0;
	// pad 0x30+992=0x410 check
	const prefixLen = 0x30 + 31 * 32;
	if (prefixLen !== 0x410) throw new Error("header math wrong");
	parts.push(orders);

	// Pattern 0: row 0 ch 0 = C2 ins1 vol64; everything else blank (255).
	const pat: number[] = [0x20, 0x08, 0x80, 0x00];
	for (let i = 1; i < 64 * 4; i++) pat.push(255);
	parts.push(new Uint8Array(pat));

	const before = parts.reduce((a, p) => a + p.length, 0);
	const posPara = Math.ceil(before / 16);
	const padLen = posPara * 16 - before;
	parts.push(new Uint8Array(padLen));
	hv.setUint16(0x0e, posPara, true);
	parts.push(sampleData);

	const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

describe("Scream Tracker 2 (.stm) Parser & Engine", () => {
	it("renders a one-pattern module to WAV", () => {
		const result = convertStmToWav(buildStm(), {}, () => {});
		expect(result.metadata.title).toBe("Test Song");
		expect(result.metadata.version).toBe("2.21");
		expect(result.metadata.numPatterns).toBe(1);
		expect(result.metadata.durationSeconds).toBeGreaterThan(0);
		const wav = result.wavBytes;
		expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe("RIFF");
		expect(new TextDecoder().decode(wav.subarray(8, 12))).toBe("WAVE");
		// Non-silent: peak amplitude well above zero.
		const dv = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		let peak = 0;
		for (let i = 44; i + 2 <= wav.length; i += 2) {
			const s = Math.abs(dv.getInt16(i, true));
			if (s > peak) peak = s;
		}
		expect(peak).toBeGreaterThan(1000);
	});

	it("runs through the engine", async () => {
		expect(await stmToWavEngine.probe()).toBe(true);
		const file = buildStm();
		const out = await stmToWavEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		expect(new TextDecoder().decode(new Uint8Array(out).subarray(0, 4))).toBe(
			"RIFF",
		);
	});

	it("refuses songs, v1 and truncated files specifically", () => {
		const song = buildStm();
		song[0x1d] = 1;
		expect(() => convertStmToWav(song)).toThrow("STS song");
		const v1 = buildStm();
		v1[0x1e] = 1;
		expect(() => convertStmToWav(v1)).toThrow("v2");
		expect(() => convertStmToWav(new Uint8Array(100))).toThrow("smaller than");
	});
});
