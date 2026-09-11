import { describe, expect, it } from "vitest";
import {
	ALAW_TO_PCM16,
	convertUlawToWav,
	MULAW_TO_PCM16,
	ulawToWavEngine,
} from "../index";

describe("G.711 mu-law & A-law to WAV engine", () => {
	function createTestAudio(len = 400): Uint8Array {
		const data = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			data[i] = i % 256;
		}
		return data;
	}

	it("pre-computes 256-entry lookup tables with valid 16-bit ranges", () => {
		expect(MULAW_TO_PCM16.length).toBe(256);
		expect(ALAW_TO_PCM16.length).toBe(256);

		// Zero code check (in mu-law, 0xFF is silence/zero; in A-law, 0xD5 is zero)
		expect(Math.abs(MULAW_TO_PCM16[0xff] ?? 999)).toBeLessThanOrEqual(4);
		expect(Math.abs(ALAW_TO_PCM16[0xd5] ?? 999)).toBeLessThanOrEqual(8);
	});

	it("decodes raw mu-law stream to valid 16-bit RIFF WAV", () => {
		const raw = createTestAudio(800);
		const result = convertUlawToWav(raw, { codec: "mulaw", sampleRate: 8000 });

		expect(result.metadata.sampleRate).toBe(8000);
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.sampleCount).toBe(800);
		expect(result.metadata.durationMs).toBe(100);
		expect(result.metadata.codec).toBe("G.711 mu-law");

		const wav = result.wavBytes;
		expect(wav.length).toBe(44 + 800 * 2);

		const textDecoder = new TextDecoder();
		expect(textDecoder.decode(wav.subarray(0, 4))).toBe("RIFF");
		expect(textDecoder.decode(wav.subarray(8, 12))).toBe("WAVE");
		expect(textDecoder.decode(wav.subarray(12, 16))).toBe("fmt ");
		expect(textDecoder.decode(wav.subarray(36, 40))).toBe("data");

		const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		expect(view.getUint16(20, true)).toBe(1); // PCM
		expect(view.getUint16(22, true)).toBe(1); // Mono
		expect(view.getUint32(24, true)).toBe(8000); // 8000 Hz
		expect(view.getUint16(34, true)).toBe(16); // 16-bit
		expect(view.getUint32(40, true)).toBe(1600); // 800 samples * 2 bytes
	});

	it("decodes raw A-law stream to valid 16-bit RIFF WAV", () => {
		const raw = createTestAudio(400);
		const result = convertUlawToWav(raw, { codec: "alaw", sampleRate: 16000 });

		expect(result.metadata.codec).toBe("G.711 A-law");
		expect(result.metadata.sampleRate).toBe(16000);
		expect(result.metadata.durationMs).toBe(25); // 400 / 16000 * 1000 = 25ms

		const view = new DataView(result.wavBytes.buffer);
		expect(view.getUint32(24, true)).toBe(16000);
	});

	it("throws an error for empty data", () => {
		expect(() => convertUlawToWav(new Uint8Array(0))).toThrow(
			"Invalid audio file: Input data is empty.",
		);
	});

	it("engine probe and run returns valid ArrayBuffer", async () => {
		expect(await ulawToWavEngine.probe()).toBe(true);

		const raw = createTestAudio(400);
		const output = await ulawToWavEngine.run(
			raw.buffer as ArrayBuffer,
			{ codec: "mulaw", sampleRate: 8000 },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBe(44 + 400 * 2);
	});
});
