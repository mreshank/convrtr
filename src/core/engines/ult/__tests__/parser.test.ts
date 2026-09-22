import { describe, expect, it } from "vitest";
import { ultToWavEngine } from "../index";
import { convertUltToWav } from "../parser";

function buildUlt(): Uint8Array {
	const parts: Uint8Array[] = [];
	const head = new Uint8Array(48);
	const enc = new TextEncoder();
	enc.encodeInto("MAS_UTrack_V00", head.subarray(0, 14));
	head[14] = 0x34; // v4
	enc.encodeInto("Test Song", head.subarray(15, 47));
	head[47] = 0; // no message lines
	parts.push(head, new Uint8Array([1])); // 1 sample

	// Sample header (66 bytes, v4 layout).
	const sh = new Uint8Array(66);
	const sv = new DataView(sh.buffer);
	enc.encodeInto("kick", sh.subarray(0));
	sv.setUint32(44, 0, true); // loopStart
	sv.setUint32(48, 0, true); // loopEnd (no loop)
	sv.setUint32(52, 0, true); // sizeStart
	sv.setUint32(56, 4, true); // sizeEnd
	sh[60] = 255; // volume
	sh[61] = 0; // flags
	sv.setUint16(62, 8363, true); // speed
	sv.setInt16(64, 0, true); // finetune
	parts.push(sh);

	// Orders: pattern 0, then end.
	const orders = new Uint8Array(256).fill(0xff);
	orders[0] = 0;
	parts.push(orders, new Uint8Array([0, 0])); // 1 channel, 1 pattern
	parts.push(new Uint8Array([8])); // pan

	// Pattern 0, channel 0: row 0 = note 37 ins 1, rest empty.
	const pat: number[] = [37, 1, 0, 0, 0];
	for (let r = 1; r < 64; r++) pat.push(0, 0, 0, 0, 0);
	parts.push(new Uint8Array(pat));

	// Sample data: signed 8-bit [0, 64, -64, 0].
	parts.push(new Uint8Array([128, 192, 64, 128].map((b) => b & 0xff)));

	const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

describe("UltraTracker (.ult) Parser & Engine", () => {
	it("renders a one-pattern module to WAV", () => {
		const result = convertUltToWav(buildUlt(), {}, () => {});
		expect(result.metadata.title).toBe("Test Song");
		expect(result.metadata.version).toBe("4");
		expect(result.metadata.numChannels).toBe(1);
		expect(result.metadata.numPatterns).toBe(1);
		expect(result.metadata.durationSeconds).toBeGreaterThan(0);
		const wav = result.wavBytes;
		expect(new TextDecoder().decode(wav.subarray(0, 4))).toBe("RIFF");
		const dv = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		let peak = 0;
		for (let i = 44; i + 2 <= wav.length; i += 2) {
			const s = Math.abs(dv.getInt16(i, true));
			if (s > peak) peak = s;
		}
		expect(peak).toBeGreaterThan(1000);
	});

	it("runs through the engine", async () => {
		expect(await ultToWavEngine.probe()).toBe(true);
		const file = buildUlt();
		const out = await ultToWavEngine.run(
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

	it("refuses bad signatures, versions and empty orders", () => {
		const bad = buildUlt();
		bad[0] = 0x58;
		expect(() => convertUltToWav(bad)).toThrow("signature");
		const v5 = buildUlt();
		v5[14] = 0x35;
		expect(() => convertUltToWav(v5)).toThrow("version");
		expect(() => convertUltToWav(new Uint8Array(10))).toThrow("48-byte header");
	});
});
