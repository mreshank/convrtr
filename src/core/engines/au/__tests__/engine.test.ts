import { describe, expect, it } from "vitest";
import { auToWavEngine, convertAuToWav, parseAu } from "../index";

function createMockAu(options: {
	encoding: number;
	sampleRate: number;
	channels: number;
	samplesCount: number;
	info?: string;
}): Uint8Array {
	const infoBytes = options.info
		? new TextEncoder().encode(options.info)
		: new Uint8Array(0);
	const infoPadding =
		infoBytes.length > 0 ? (4 - (infoBytes.length % 4)) % 4 : 0;
	const infoTotal = infoBytes.length + infoPadding;

	const dataOffset = 24 + infoTotal;

	let bytesPerSample = 1;
	if (options.encoding === 3) bytesPerSample = 2;
	else if (options.encoding === 4) bytesPerSample = 3;
	else if (options.encoding === 5 || options.encoding === 6) bytesPerSample = 4;

	const totalDataBytes =
		options.samplesCount * options.channels * bytesPerSample;
	const totalFileBytes = dataOffset + totalDataBytes;

	const out = new Uint8Array(totalFileBytes);
	const view = new DataView(out.buffer);

	// Magic: ".snd" (0x2E 0x73 0x6E 0x64)
	out[0] = 0x2e;
	out[1] = 0x73;
	out[2] = 0x6e;
	out[3] = 0x64;

	view.setUint32(4, dataOffset, false); // big-endian dataOffset
	view.setUint32(8, totalDataBytes, false); // dataSize
	view.setUint32(12, options.encoding, false); // encoding
	view.setUint32(16, options.sampleRate, false); // sampleRate
	view.setUint32(20, options.channels, false); // channels

	if (infoBytes.length > 0) {
		out.set(infoBytes, 24);
	}

	// Fill sample data
	if (options.encoding === 1) {
		// mu-law
		for (let i = 0; i < totalDataBytes; i++) {
			out[dataOffset + i] = (i * 17) & 0xff;
		}
	} else if (options.encoding === 2) {
		// 8-bit signed PCM
		for (let i = 0; i < totalDataBytes; i++) {
			out[dataOffset + i] = (i - 128) & 0xff;
		}
	} else if (options.encoding === 3) {
		// 16-bit Big-Endian PCM
		for (let i = 0; i < options.samplesCount * options.channels; i++) {
			const sampleVal = Math.round(Math.sin(i / 10) * 16000);
			view.setInt16(dataOffset + i * 2, sampleVal, false);
		}
	} else if (options.encoding === 27) {
		// A-law
		for (let i = 0; i < totalDataBytes; i++) {
			out[dataOffset + i] = (i * 23) & 0xff;
		}
	}

	return out;
}

describe("au parser and WAV engine", () => {
	it("parses 8-bit mu-law AU audio with annotation", () => {
		const auBytes = createMockAu({
			encoding: 1,
			sampleRate: 8000,
			channels: 1,
			samplesCount: 800,
			info: "Sun SPARCstation Recording",
		});

		const meta = parseAu(auBytes);
		expect(meta.magic).toBe(".snd");
		expect(meta.encodingName).toBe("8-bit G.711 mu-law");
		expect(meta.sampleRate).toBe(8000);
		expect(meta.channels).toBe(1);
		expect(meta.info).toBe("Sun SPARCstation Recording");
		expect(meta.totalSamples).toBe(800);
		expect(meta.durationSeconds).toBe(0.1);

		// WAV container check
		expect(meta.wavBytes.length).toBe(44 + 800 * 2);
		expect(new TextDecoder().decode(meta.wavBytes.subarray(0, 4))).toBe("RIFF");
		expect(new TextDecoder().decode(meta.wavBytes.subarray(8, 12))).toBe(
			"WAVE",
		);
	});

	it("parses 16-bit linear PCM Big-Endian stereo AU audio", () => {
		const auBytes = createMockAu({
			encoding: 3,
			sampleRate: 44100,
			channels: 2,
			samplesCount: 441,
		});

		const meta = parseAu(auBytes);
		expect(meta.encodingName).toBe("16-bit signed linear PCM");
		expect(meta.sampleRate).toBe(44100);
		expect(meta.channels).toBe(2);
		expect(meta.totalSamples).toBe(441);
		expect(meta.durationSeconds).toBe(0.01);
		expect(meta.wavBytes.length).toBe(44 + 441 * 2 * 2);
	});

	it("parses G.711 A-law and 8-bit signed PCM formats", () => {
		const alawBytes = createMockAu({
			encoding: 27,
			sampleRate: 8000,
			channels: 1,
			samplesCount: 160,
		});
		const alawMeta = parseAu(alawBytes);
		expect(alawMeta.encodingName).toBe("8-bit G.711 A-law");
		expect(alawMeta.totalSamples).toBe(160);

		const pcm8Bytes = createMockAu({
			encoding: 2,
			sampleRate: 11025,
			channels: 1,
			samplesCount: 200,
		});
		const pcm8Meta = parseAu(pcm8Bytes);
		expect(pcm8Meta.encodingName).toBe("8-bit signed linear PCM");
		expect(pcm8Meta.totalSamples).toBe(200);
	});

	it("converts AU to WAV buffer via convertAuToWav", () => {
		const auBytes = createMockAu({
			encoding: 1,
			sampleRate: 8000,
			channels: 1,
			samplesCount: 400,
		});

		const wavBuf = convertAuToWav(
			auBytes.buffer.slice(0) as unknown as ArrayBuffer,
		);
		const view = new DataView(wavBuf);
		expect(view.getUint32(0, false)).toBe(0x52494646); // "RIFF"
		expect(wavBuf.byteLength).toBe(44 + 400 * 2);
	});

	it("executes auToWavEngine with progress tracking", async () => {
		const auBytes = createMockAu({
			encoding: 1,
			sampleRate: 8000,
			channels: 1,
			samplesCount: 500,
		});

		const progressUpdates: number[] = [];
		const res = await auToWavEngine.run(
			auBytes.buffer.slice(0) as unknown as ArrayBuffer,
			{},
			(ratio: number, _phase: string) => {
				progressUpdates.push(ratio);
			},
		);

		expect(progressUpdates.length).toBeGreaterThan(0);
		expect(res.byteLength).toBe(44 + 500 * 2);
	});

	it("throws on invalid signature or truncated buffer", () => {
		const bad = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => parseAu(bad)).toThrow(/Buffer size is smaller/);

		const fake = new Uint8Array(24);
		expect(() => parseAu(fake)).toThrow(/Invalid AU signature/);
	});
});
