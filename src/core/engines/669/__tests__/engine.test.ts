import { describe, expect, it } from "vitest";
import { convert669ToWav, sixSixNineToWavEngine } from "../index";

function createMock669(options: {
	magic?: "if" | "JN";
	title?: string;
	numSamples?: number;
}): Uint8Array {
	const magic = options.magic ?? "if";
	const title = options.title ?? "Renaissance Chiptune";
	const numSamples = options.numSamples ?? 1;
	const numPatterns = 1;

	// Total size: header (495) + sample headers (25 * numSamples) + patterns (numPatterns * 64 * 8 * 3) + sample PCM data
	const patternBytes = numPatterns * 64 * 8 * 3;
	const samplePcmLen = 256;
	const totalSize =
		495 + numSamples * 25 + patternBytes + numSamples * samplePcmLen + 100;

	const buffer = new Uint8Array(totalSize);
	const view = new DataView(buffer.buffer);

	// Magic (2 bytes)
	buffer[0] = magic.charCodeAt(0);
	buffer[1] = magic.charCodeAt(1);

	// Title (line 1, bytes 2..37)
	const titleBytes = new TextEncoder().encode(title);
	buffer.set(titleBytes.subarray(0, 35), 2);

	buffer[108] = numSamples;
	buffer[109] = numPatterns;
	buffer[110] = 0; // loopOrder

	// Order table (offset 111)
	buffer[111] = 0; // order 0 = pattern 0
	buffer[112] = 0xff; // end of orders

	// Tempos (offset 239)
	buffer[239] = 78;

	// Pbreaks (offset 367)
	buffer[367] = 63;

	// Sample headers (offset 495)
	const sampleHeaderStart = 495;
	const patternStart = sampleHeaderStart + numSamples * 25;
	const pcmDataStart = patternStart + patternBytes;

	for (let s = 0; s < numSamples; s++) {
		const sOff = sampleHeaderStart + s * 25;
		const sName = new TextEncoder().encode(`SYNTH${s + 1}.SMP`);
		buffer.set(sName.subarray(0, 12), sOff);
		view.setUint32(sOff + 13, samplePcmLen, true); // length
		view.setUint32(sOff + 17, 0, true); // loopStart
		view.setUint32(sOff + 21, samplePcmLen, true); // loopEnd

		// Fill PCM data with sine/saw wave
		const pcmOffset = pcmDataStart + s * samplePcmLen;
		for (let i = 0; i < samplePcmLen; i++) {
			buffer[pcmOffset + i] =
				128 + Math.round(Math.sin((i / samplePcmLen) * Math.PI * 2) * 100);
		}
	}

	// Trigger a note on channel 0, row 0 in pattern 0
	// Cell: Note 24 (C-4), Inst 1, Vol 15
	// b0: (24 << 2) | (inst >> 4) = (24 << 2) | 0 = 96
	// b1: ((inst & 0x0f) << 4) | vol = (1 << 4) | 15 = 31
	// b2: effect = 0
	buffer[patternStart] = 24 << 2;
	buffer[patternStart + 1] = (1 << 4) | 15;
	buffer[patternStart + 2] = 0;

	return buffer;
}

describe("sixSixNineToWavEngine", () => {
	it("probes successfully", async () => {
		expect(await sixSixNineToWavEngine.probe()).toBe(true);
	});

	it("throws on truncated or invalid magic", () => {
		expect(() => convert669ToWav(new Uint8Array([]))).toThrow(
			/smaller than the 495-byte/,
		);
		expect(() =>
			convert669ToWav(new Uint8Array(new Array(500).fill(0))),
		).toThrow(/Expected magic 'if' or 'JN'/);
	});

	it("converts Composer 669 ('if') module to stereo WAV", () => {
		const mockBytes = createMock669({
			magic: "if",
			title: "Tran Renaissance Hit",
			numSamples: 2,
		});

		const result = convert669ToWav(mockBytes, { maxDurationSeconds: 1 });
		expect(result.metadata.title).toBe("Tran Renaissance Hit");
		expect(result.metadata.magic).toBe("if");
		expect(result.metadata.numSamples).toBe(2);
		expect(result.metadata.samples.length).toBe(2);

		// WAV RIFF header
		expect(result.wavBytes[0]).toBe(0x52); // R
		expect(result.wavBytes[1]).toBe(0x49); // I
		expect(result.wavBytes[2]).toBe(0x46); // F
		expect(result.wavBytes[3]).toBe(0x46); // F
		expect(result.wavBytes[8]).toBe(0x57); // W
		expect(result.wavBytes[9]).toBe(0x41); // A
		expect(result.wavBytes[10]).toBe(0x56); // V
		expect(result.wavBytes[11]).toBe(0x45); // E
	});

	it("converts UNIS 669 ('JN') module via engine runner", async () => {
		const mockBytes = createMock669({
			magic: "JN",
			title: "UNIS 669 Demo",
			numSamples: 1,
		});

		const outBuffer = await sixSixNineToWavEngine.run(
			mockBytes.buffer as ArrayBuffer,
			{ sampleRate: 22050 },
			() => {},
		);

		const outBytes = new Uint8Array(outBuffer);
		expect(outBytes[0]).toBe(0x52); // R
		expect(outBytes[1]).toBe(0x49); // I
		expect(outBytes.length).toBeGreaterThan(1000);
	});
});
