import { describe, expect, it } from "vitest";
import { convertVoxToWav, voxToWavEngine } from "../index";

describe("Dialogic OKI ADPCM VOX to WAV engine", () => {
	// Synthesize a 200-byte test VOX file (~400 samples)
	function createTestVoxData(): Uint8Array {
		const data = new Uint8Array(200);
		for (let i = 0; i < data.length; i++) {
			// Mix various nibbles: positive step, negative step, silent
			const high = i % 8; // 0..7
			const low = (i + 3) % 16; // 0..15
			data[i] = (high << 4) | low;
		}
		return data;
	}

	it("decodes raw VOX stream to valid 16-bit RIFF WAV", () => {
		const voxData = createTestVoxData();
		const result = convertVoxToWav(voxData, { sampleRate: 8000 });

		expect(result.metadata.sampleRate).toBe(8000);
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.sampleCount).toBe(400); // 200 bytes * 2 samples/byte
		expect(result.metadata.durationMs).toBe(50); // 400 / 8000 * 1000 = 50ms
		expect(result.metadata.codec).toBe("Dialogic OKI ADPCM (4-bit)");

		const wav = result.wavBytes;
		expect(wav.length).toBe(44 + 400 * 2); // 44 header + 800 data bytes

		// RIFF header validation
		const textDecoder = new TextDecoder();
		expect(textDecoder.decode(wav.subarray(0, 4))).toBe("RIFF");
		expect(textDecoder.decode(wav.subarray(8, 12))).toBe("WAVE");
		expect(textDecoder.decode(wav.subarray(12, 16))).toBe("fmt ");
		expect(textDecoder.decode(wav.subarray(36, 40))).toBe("data");

		const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		expect(view.getUint16(20, true)).toBe(1); // PCM format
		expect(view.getUint16(22, true)).toBe(1); // Mono
		expect(view.getUint32(24, true)).toBe(8000); // 8000 Hz
		expect(view.getUint16(34, true)).toBe(16); // 16 bits
		expect(view.getUint32(40, true)).toBe(800); // data length
	});

	it("supports custom telephony sample rates", () => {
		const voxData = createTestVoxData();
		const result6k = convertVoxToWav(voxData, { sampleRate: 6000 });
		expect(result6k.metadata.sampleRate).toBe(6000);
		const view6k = new DataView(result6k.wavBytes.buffer);
		expect(view6k.getUint32(24, true)).toBe(6000);

		const result16k = convertVoxToWav(voxData, { sampleRate: 16000 });
		expect(result16k.metadata.sampleRate).toBe(16000);
		const view16k = new DataView(result16k.wavBytes.buffer);
		expect(view16k.getUint32(24, true)).toBe(16000);
	});

	it("throws an error for empty data", () => {
		expect(() => convertVoxToWav(new Uint8Array(0))).toThrow(
			"Invalid VOX file: Input data is empty.",
		);
	});

	it("engine probe and run returns valid WAV ArrayBuffer", async () => {
		expect(await voxToWavEngine.probe()).toBe(true);

		const voxData = createTestVoxData();
		const output = await voxToWavEngine.run(
			voxData.buffer as ArrayBuffer,
			{ sampleRate: 8000 },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBe(44 + 400 * 2);
	});
});
