import { describe, expect, it, vi } from "vitest";
import { ircamToWavEngine } from "../index";
import { convertIrcamToWav, parseIrcamHeader } from "../parser";
import {
	IRCAM_CODE_16BIT_PCM,
	IRCAM_CODE_32BIT_FLOAT,
	IRCAM_CODE_32BIT_PCM,
	IRCAM_CODE_MULAW,
	IRCAM_HEADER_SIZE,
} from "../types";

function createIrcamBuffer(options: {
	isLittleEndian?: boolean;
	sampleRate?: number;
	channels?: number;
	encoding?: number;
	audioPayload: Uint8Array;
}): ArrayBuffer {
	const isLE = options.isLittleEndian ?? false;
	const totalSize = IRCAM_HEADER_SIZE + options.audioPayload.length;
	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	// Magic: 0x64, 0xA3, 0x02, 0x00 for BE; 0x00, 0x02, 0xA3, 0x64 for LE
	if (!isLE) {
		u8[0] = 0x64;
		u8[1] = 0xa3;
		u8[2] = 0x02;
		u8[3] = 0x00;
	} else {
		u8[0] = 0x00;
		u8[1] = 0x02;
		u8[2] = 0xa3;
		u8[3] = 0x64;
	}

	view.setFloat32(4, options.sampleRate ?? 44100, isLE);
	view.setUint32(8, options.channels ?? 1, isLE);
	view.setUint32(12, options.encoding ?? IRCAM_CODE_16BIT_PCM, isLE);

	u8.set(options.audioPayload, IRCAM_HEADER_SIZE);

	return buffer;
}

describe("IRCAM Engine (ircam-to-wav)", () => {
	it("probes successfully", async () => {
		expect(await ircamToWavEngine.probe()).toBe(true);
	});

	it("throws on truncated or unrecognized header", () => {
		const small = new Uint8Array(500);
		expect(() => parseIrcamHeader(small)).toThrow("at least 1024 bytes");

		const wrongMagic = new Uint8Array(1024);
		expect(() => parseIrcamHeader(wrongMagic)).toThrow("magic bytes");
	});

	it("decodes big-endian 16-bit linear PCM", async () => {
		// 4 samples of 16-bit PCM: 0, 1000, -1000, 32767
		const samples = [0, 1000, -1000, 32767];
		const payload = new Uint8Array(samples.length * 2);
		const view = new DataView(payload.buffer);
		for (let i = 0; i < samples.length; i++) {
			view.setInt16(i * 2, samples[i] ?? 0, false); // Big-endian
		}

		const ircam = createIrcamBuffer({
			isLittleEndian: false,
			sampleRate: 48000,
			channels: 1,
			encoding: IRCAM_CODE_16BIT_PCM,
			audioPayload: payload,
		});

		const onProgress = vi.fn();
		const wavBuffer = await ircamToWavEngine.run(ircam, {}, onProgress);
		const wavView = new DataView(wavBuffer);
		const wavU8 = new Uint8Array(wavBuffer);

		// Verify RIFF header
		expect(String.fromCharCode(...wavU8.slice(0, 4))).toBe("RIFF");
		expect(String.fromCharCode(...wavU8.slice(8, 12))).toBe("WAVE");
		expect(String.fromCharCode(...wavU8.slice(12, 16))).toBe("fmt ");
		expect(wavView.getUint16(20, true)).toBe(1); // PCM
		expect(wavView.getUint16(22, true)).toBe(1); // Mono
		expect(wavView.getUint32(24, true)).toBe(48000); // Sample rate
		expect(wavView.getUint16(34, true)).toBe(16); // 16-bit

		// Check decoded samples at offset 44
		expect(wavView.getInt16(44, true)).toBe(0);
		expect(wavView.getInt16(46, true)).toBe(1000);
		expect(wavView.getInt16(48, true)).toBe(-1000);
		expect(wavView.getInt16(50, true)).toBe(32767);

		expect(onProgress).toHaveBeenCalledWith(1.0, "Complete");
	});

	it("decodes little-endian 16-bit linear PCM", () => {
		const samples = [500, -500];
		const payload = new Uint8Array(samples.length * 2);
		const view = new DataView(payload.buffer);
		for (let i = 0; i < samples.length; i++) {
			view.setInt16(i * 2, samples[i] ?? 0, true); // Little-endian
		}

		const ircam = createIrcamBuffer({
			isLittleEndian: true,
			sampleRate: 44100,
			channels: 2,
			encoding: IRCAM_CODE_16BIT_PCM,
			audioPayload: payload,
		});

		const wavBuffer = convertIrcamToWav(ircam);
		const wavView = new DataView(wavBuffer);

		expect(wavView.getUint16(22, true)).toBe(2); // Stereo
		expect(wavView.getInt16(44, true)).toBe(500);
		expect(wavView.getInt16(46, true)).toBe(-500);
	});

	it("decodes 32-bit IEEE floating point audio", () => {
		// Floats: 0.0, 0.5, -0.5, 1.0, -1.0
		const floatVals = [0.0, 0.5, -0.5, 1.0, -1.0];
		const payload = new Uint8Array(floatVals.length * 4);
		const view = new DataView(payload.buffer);
		for (let i = 0; i < floatVals.length; i++) {
			view.setFloat32(i * 4, floatVals[i] ?? 0, false);
		}

		const ircam = createIrcamBuffer({
			isLittleEndian: false,
			sampleRate: 44100,
			channels: 1,
			encoding: IRCAM_CODE_32BIT_FLOAT,
			audioPayload: payload,
		});

		const wavBuffer = convertIrcamToWav(ircam);
		const wavView = new DataView(wavBuffer);

		expect(wavView.getInt16(44, true)).toBe(0);
		// 0.5 * 32767 ≈ 16384
		expect(wavView.getInt16(46, true)).toBeCloseTo(16384, -2);
		// -0.5 * 32768 = -16384
		expect(wavView.getInt16(48, true)).toBeCloseTo(-16384, -2);
		// 1.0 clamped
		expect(wavView.getInt16(50, true)).toBe(32767);
		// -1.0 clamped
		expect(wavView.getInt16(52, true)).toBe(-32768);
	});

	it("decodes 32-bit signed linear PCM", () => {
		const payload = new Uint8Array(8);
		const view = new DataView(payload.buffer);
		view.setInt32(0, 1073741824, false); // 0.5 in 32-bit int => should shift down to ~16384
		view.setInt32(4, -1073741824, false);

		const ircam = createIrcamBuffer({
			isLittleEndian: false,
			sampleRate: 44100,
			channels: 1,
			encoding: IRCAM_CODE_32BIT_PCM,
			audioPayload: payload,
		});

		const wavBuffer = convertIrcamToWav(ircam);
		const wavView = new DataView(wavBuffer);

		expect(wavView.getInt16(44, true)).toBe(16384);
		expect(wavView.getInt16(46, true)).toBe(-16384);
	});

	it("decodes 8-bit mu-law audio", () => {
		const payload = new Uint8Array([0xff, 0x00]); // 0xFF is zero in mu-law
		const ircam = createIrcamBuffer({
			isLittleEndian: false,
			sampleRate: 8000,
			channels: 1,
			encoding: IRCAM_CODE_MULAW,
			audioPayload: payload,
		});

		const wavBuffer = convertIrcamToWav(ircam);
		const wavView = new DataView(wavBuffer);
		expect(wavView.getUint32(24, true)).toBe(8000);
		expect(wavView.getInt16(44, true)).toBe(0);
	});
});
