import { encode } from "silk-wasm";
import { describe, expect, it } from "vitest";
import { silkToWavEngine } from "../index";
import { createWavFromPcm, normalizeSilkBytes, parseSilk } from "../parser";

describe("Skype & WeChat Silk v3 Parser & Engine", () => {
	it("synthesizes standard RIFF WAV header from linear PCM bytes", () => {
		const pcm = new Uint8Array(2400); // 100ms at 24000Hz 16-bit mono = 2400 bytes
		const wav = createWavFromPcm(pcm, 24000, 1);

		expect(wav.length).toBe(44 + 2400);

		// "RIFF"
		expect(
			String.fromCharCode(wav[0] ?? 0, wav[1] ?? 0, wav[2] ?? 0, wav[3] ?? 0),
		).toBe("RIFF");
		// "WAVE"
		expect(
			String.fromCharCode(wav[8] ?? 0, wav[9] ?? 0, wav[10] ?? 0, wav[11] ?? 0),
		).toBe("WAVE");
		// "fmt "
		expect(
			String.fromCharCode(
				wav[12] ?? 0,
				wav[13] ?? 0,
				wav[14] ?? 0,
				wav[15] ?? 0,
			),
		).toBe("fmt ");

		const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
		expect(view.getUint16(20, true)).toBe(1); // PCM format
		expect(view.getUint16(22, true)).toBe(1); // 1 channel
		expect(view.getUint32(24, true)).toBe(24000); // 24kHz sample rate
		expect(view.getUint16(34, true)).toBe(16); // 16 bits per sample

		// "data"
		expect(
			String.fromCharCode(
				wav[36] ?? 0,
				wav[37] ?? 0,
				wav[38] ?? 0,
				wav[39] ?? 0,
			),
		).toBe("data");
		expect(view.getUint32(40, true)).toBe(2400);
	});

	it("normalizes WeChat 0x02 prefix and standard Silk v3 headers", () => {
		const standard = new TextEncoder().encode("#!SILK_V3\x00\x05mock");
		const normalizedStd = normalizeSilkBytes(standard);
		expect(normalizedStd.length).toBe(1 + standard.length);
		expect(normalizedStd[0]).toBe(0x02);
		expect(normalizedStd[1]).toBe(0x23); // '#'

		// WeChat voice message with 0x02 prefix
		const weChatBytes = new Uint8Array(1 + standard.length);
		weChatBytes[0] = 0x02;
		weChatBytes.set(standard, 1);

		const normalizedWc = normalizeSilkBytes(weChatBytes);
		expect(normalizedWc.length).toBe(weChatBytes.length);
		expect(normalizedWc[0]).toBe(0x02);
		expect(normalizedWc[1]).toBe(0x23); // '#'

		// Raw bytes without header
		const raw = new Uint8Array([0x10, 0x20, 0x30]);
		const normalizedRaw = normalizeSilkBytes(raw);
		expect(normalizedRaw.length).toBe(1 + 9 + raw.length);
		expect(normalizedRaw[0]).toBe(0x02);
		expect(normalizedRaw[1]).toBe(0x23);
	});

	it("decodes encoded Silk audio stream into playable WAV", async () => {
		// Generate 100ms of synthetic 24kHz 16-bit PCM audio (tone or silence)
		const sampleRate = 24000;
		const samples = 2400;
		const pcm = new Uint8Array(samples * 2);
		for (let i = 0; i < samples; i++) {
			const sampleVal = Math.round(
				Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 16000,
			);
			const idx = i * 2;
			pcm[idx] = sampleVal & 0xff;
			pcm[idx + 1] = (sampleVal >> 8) & 0xff;
		}

		// Encode to Silk v3
		const encoded = await encode(pcm, sampleRate);
		expect(encoded.data.length).toBeGreaterThan(10);

		// Parse and decode back to WAV
		const result = await parseSilk(encoded.data, sampleRate);
		expect(result.sampleRate).toBe(sampleRate);
		expect(result.channels).toBe(1);
		expect(result.durationMs).toBeGreaterThan(50);
		expect(result.wavBytes.length).toBeGreaterThan(44);

		// Check RIFF header on result
		const sig = String.fromCharCode(
			result.wavBytes[0] ?? 0,
			result.wavBytes[1] ?? 0,
			result.wavBytes[2] ?? 0,
			result.wavBytes[3] ?? 0,
		);
		expect(sig).toBe("RIFF");
	});

	it("runs conversion through silkToWavEngine", async () => {
		const sampleRate = 24000;
		const samples = 2400;
		const pcm = new Uint8Array(samples * 2);
		const encoded = await encode(pcm, sampleRate);

		expect(await silkToWavEngine.probe()).toBe(true);

		let progress = 0;
		const outputBuffer = await silkToWavEngine.run(
			encoded.data.buffer as ArrayBuffer,
			{},
			(p) => {
				progress = p;
			},
		);

		expect(progress).toBe(1.0);
		expect(outputBuffer.byteLength).toBeGreaterThan(44);
		const outBytes = new Uint8Array(outputBuffer);
		expect(
			String.fromCharCode(
				outBytes[0] ?? 0,
				outBytes[1] ?? 0,
				outBytes[2] ?? 0,
				outBytes[3] ?? 0,
			),
		).toBe("RIFF");
	});
});
