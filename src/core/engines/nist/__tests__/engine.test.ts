import { describe, expect, it, vi } from "vitest";
import { nistToWavEngine } from "../index";
import { convertNistToWav, parseNistHeader } from "../parser";

function createNistBuffer(options: {
	headerSize?: number;
	channels?: number;
	sampleRate?: number;
	byteFormat?: string;
	coding?: string;
	samples: Uint8Array;
}): ArrayBuffer {
	const headerSize = options.headerSize ?? 1024;
	const channels = options.channels ?? 1;
	const sampleRate = options.sampleRate ?? 16000;
	const byteFormat = options.byteFormat ?? "01";
	const coding = options.coding ?? "pcm";

	let headerText = "NIST_1A\n";
	headerText += `   ${headerSize}\n`;
	headerText += `channel_count -i ${channels}\n`;
	headerText += `sample_rate -i ${sampleRate}\n`;
	headerText += "sample_n_bytes -i 2\n";
	headerText += `sample_byte_format -s2 ${byteFormat}\n`;
	headerText += `sample_coding -s3 ${coding}\n`;
	headerText += "end_head\n";

	const totalSize = headerSize + options.samples.length;
	const buffer = new ArrayBuffer(totalSize);
	const u8 = new Uint8Array(buffer);

	const headerBytes = new TextEncoder().encode(headerText);
	u8.set(headerBytes, 0);
	u8.set(options.samples, headerSize);

	return buffer;
}

describe("NIST SPHERE Engine (nist-to-wav)", () => {
	it("probes successfully", async () => {
		expect(await nistToWavEngine.probe()).toBe(true);
	});

	it("throws on missing NIST_1A magic", () => {
		const small = new TextEncoder().encode("RIFF WAVE audio data");
		expect(() => parseNistHeader(small)).toThrow("Missing NIST_1A");
	});

	it("decodes 16-bit Little-Endian PCM speech samples", async () => {
		// Samples: 0, 500, -500, 16000
		const pcm16 = new Int16Array([0, 500, -500, 16000]);
		const samples = new Uint8Array(pcm16.buffer);

		const nist = createNistBuffer({
			sampleRate: 16000,
			channels: 1,
			byteFormat: "01",
			coding: "pcm",
			samples,
		});

		const onProgress = vi.fn();
		const wavBuffer = await nistToWavEngine.run(nist, {}, onProgress);
		const wavView = new DataView(wavBuffer);
		const wavU8 = new Uint8Array(wavBuffer);

		// Verify RIFF WAVE header
		expect(String.fromCharCode(...wavU8.slice(0, 4))).toBe("RIFF");
		expect(String.fromCharCode(...wavU8.slice(8, 12))).toBe("WAVE");
		expect(wavView.getUint16(20, true)).toBe(1); // PCM
		expect(wavView.getUint16(22, true)).toBe(1); // Mono
		expect(wavView.getUint32(24, true)).toBe(16000); // 16kHz
		expect(wavView.getUint16(34, true)).toBe(16); // 16-bit

		// Check samples at offset 44
		expect(wavView.getInt16(44, true)).toBe(0);
		expect(wavView.getInt16(46, true)).toBe(500);
		expect(wavView.getInt16(48, true)).toBe(-500);
		expect(wavView.getInt16(50, true)).toBe(16000);

		expect(onProgress).toHaveBeenCalledWith(1.0, "Complete");
	});

	it("decodes 16-bit Big-Endian PCM speech samples", () => {
		const samples = new Uint8Array(4);
		const view = new DataView(samples.buffer);
		view.setInt16(0, 1234, false); // BE
		view.setInt16(2, -5678, false); // BE

		const nist = createNistBuffer({
			sampleRate: 8000,
			channels: 1,
			byteFormat: "10", // Big-endian
			coding: "pcm",
			samples,
		});

		const wavBuffer = convertNistToWav(nist);
		const wavView = new DataView(wavBuffer);

		expect(wavView.getInt16(44, true)).toBe(1234);
		expect(wavView.getInt16(46, true)).toBe(-5678);
	});

	it("decodes 8-bit mu-law speech samples", () => {
		const samples = new Uint8Array([0xff, 0x00]); // 0xFF is zero in mu-law

		const nist = createNistBuffer({
			sampleRate: 8000,
			channels: 1,
			coding: "ulaw",
			samples,
		});

		const wavBuffer = convertNistToWav(nist);
		const wavView = new DataView(wavBuffer);
		expect(wavView.getUint32(24, true)).toBe(8000);
		expect(wavView.getInt16(44, true)).toBe(0);
	});
});
