import { describe, expect, it } from "vitest";
import { convertAvrToWav } from "../parser";

describe("avr engine", () => {
	it("rejects files smaller than 128 bytes", () => {
		const tooSmall = new Uint8Array(64);
		expect(() => convertAvrToWav(tooSmall)).toThrow(
			/too small to contain a 128-byte AVR header/,
		);
	});

	it("rejects files with missing 2VRH signature", () => {
		const invalid = new Uint8Array(150);
		invalid[0] = 0x52; // 'R'
		invalid[1] = 0x49; // 'I'
		invalid[2] = 0x46; // 'F'
		invalid[3] = 0x46; // 'F'
		expect(() => convertAvrToWav(invalid)).toThrow(
			/Missing '2VRH' signature in header/,
		);
	});

	it("decodes 8-bit unsigned mono sample at 22050 Hz", () => {
		const header = new Uint8Array(128);
		const view = new DataView(header.buffer);

		// "2VRH"
		header[0] = 0x32;
		header[1] = 0x56;
		header[2] = 0x52;
		header[3] = 0x48;

		// Sample name: "SNARE"
		const name = new TextEncoder().encode("SNARE");
		header.set(name, 4);

		// Channels: 0 = mono
		view.setUint16(12, 0x0000, false);
		// Bits: 8
		view.setUint16(14, 8, false);
		// Signedness: 0 = unsigned
		view.setUint16(16, 0x0000, false);
		// Loop: 0 = no loop
		view.setUint16(18, 0x0000, false);
		// Sample rate: 22050
		view.setUint32(22, 22050, false);
		// Length in samples: 100
		view.setUint32(26, 100, false);

		// User comment at offset 40
		const comment = new TextEncoder().encode("Atari ST Sound Lab");
		header.set(comment, 40);

		// 100 bytes of audio data
		const samples = new Uint8Array(100);
		for (let i = 0; i < 100; i++) {
			samples[i] = 128 + Math.round(50 * Math.sin((i / 10) * Math.PI));
		}

		const fileData = new Uint8Array(128 + 100);
		fileData.set(header, 0);
		fileData.set(samples, 128);

		const result = convertAvrToWav(fileData);
		expect(result.metadata.sampleName).toBe("SNARE");
		expect(result.metadata.channels).toBe(1);
		expect(result.metadata.bitsPerSample).toBe(8);
		expect(result.metadata.sampleRate).toBe(22050);
		expect(result.metadata.numSamples).toBe(100);
		expect(result.metadata.isSigned).toBe(false);
		expect(result.metadata.isLooping).toBe(false);
		expect(result.metadata.userComment).toBe("Atari ST Sound Lab");

		// Check WAV header
		const wav = result.wavBytes;
		expect(wav.length).toBe(44 + 100 * 2); // 44 header + 100 16-bit samples
		expect(wav[0]).toBe(0x52); // 'R'
		expect(wav[1]).toBe(0x49); // 'I'
		expect(wav[2]).toBe(0x46); // 'F'
		expect(wav[3]).toBe(0x46); // 'F'
		expect(wav[8]).toBe(0x57); // 'W'
		expect(wav[9]).toBe(0x41); // 'A'
		expect(wav[10]).toBe(0x56); // 'V'
		expect(wav[11]).toBe(0x45); // 'E'
	});

	it("decodes 16-bit signed stereo sample at 44100 Hz with normalization", () => {
		const header = new Uint8Array(128);
		const view = new DataView(header.buffer);

		// "2VRH"
		header[0] = 0x32;
		header[1] = 0x56;
		header[2] = 0x52;
		header[3] = 0x48;

		// Stereo: 0xFFFF
		view.setUint16(12, 0xffff, false);
		// Bits: 16
		view.setUint16(14, 16, false);
		// Signedness: 0xFFFF (signed)
		view.setUint16(16, 0xffff, false);
		// Sample rate: 44100
		view.setUint32(22, 44100, false);
		// 50 frames (2 channels * 50 = 100 samples = 200 bytes)
		view.setUint32(26, 50, false);

		const samples = new Uint8Array(200);
		const samplesView = new DataView(samples.buffer);
		for (let i = 0; i < 100; i++) {
			samplesView.setInt16(i * 2, 500 * (i % 10), false); // big-endian
		}

		const fileData = new Uint8Array(128 + 200);
		fileData.set(header, 0);
		fileData.set(samples, 128);

		const result = convertAvrToWav(fileData, { normalize: true });
		expect(result.metadata.channels).toBe(2);
		expect(result.metadata.bitsPerSample).toBe(16);
		expect(result.metadata.sampleRate).toBe(44100);
		expect(result.metadata.numSamples).toBe(50);
		expect(result.metadata.isSigned).toBe(true);

		const wav = result.wavBytes;
		expect(wav.length).toBe(44 + 200);
		const wavView = new DataView(wav.buffer);
		expect(wavView.getUint16(22, true)).toBe(2); // numChannels = 2
		expect(wavView.getUint32(24, true)).toBe(44100); // sampleRate
		expect(wavView.getUint16(34, true)).toBe(16); // bitsPerSample
	});
});
