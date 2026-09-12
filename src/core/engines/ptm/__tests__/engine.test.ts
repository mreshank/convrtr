import { describe, expect, it } from "vitest";
import { convertPtmToWav, ptmToWavEngine } from "../index";

function createMockPtm(options: {
	title?: string;
	channels?: number;
	numSamples?: number;
}): Uint8Array {
	const title = options.title ?? "Epic Demoscene Track";
	const channels = options.channels ?? 4;
	const numSamples = options.numSamples ?? 1;

	// Total size: header (83) + pan (32) + orders (256) + pat offsets (4) + sample headers (80 * numSamples) + sample data
	const samplePcmLen = 256;
	const totalSize =
		83 + 256 + 4 + numSamples * 80 + numSamples * samplePcmLen + 100;
	const buffer = new Uint8Array(totalSize);
	const view = new DataView(buffer.buffer);

	// Song name (28 bytes)
	const nameBytes = new TextEncoder().encode(title);
	buffer.set(nameBytes.subarray(0, 27), 0);

	buffer[28] = 0x1a; // DOS EOF
	view.setUint16(29, 0x0001, true); // type
	view.setUint16(31, 0x0100, true); // version
	view.setUint16(35, 1, true); // numOrders = 1
	view.setUint16(37, numSamples, true); // numSamples
	view.setUint16(39, 1, true); // numPatterns = 1
	view.setUint16(41, channels, true); // numChannels

	// PTMF magic at offset 44
	buffer[44] = 0x50; // P
	buffer[45] = 0x54; // T
	buffer[46] = 0x4d; // M
	buffer[47] = 0x46; // F

	// Panning (32 bytes at 48..79)
	for (let i = 0; i < 32; i++) {
		buffer[48 + i] = i % 2 === 0 ? 3 : 12;
	}

	// Order table (offset 80, 256 bytes)
	buffer[80] = 0; // Order 0 = pattern 0
	for (let i = 1; i < 256; i++) {
		buffer[80 + i] = 255;
	}

	// Pattern offsets (2 bytes per pattern, offset 336)
	const patTableOffset = 80 + 256;
	view.setUint16(patTableOffset, 0, true);

	// Sample headers (offset 336 + 2)
	const sampleTableOffset = patTableOffset + 2;
	const sampleDataOffset = sampleTableOffset + numSamples * 80;

	for (let s = 0; s < numSamples; s++) {
		const sOff = sampleTableOffset + s * 80;
		buffer[sOff] = 1; // 8-bit sample
		const smpName = new TextEncoder().encode(`LeadSynth ${s + 1}`);
		buffer.set(smpName.subarray(0, 27), sOff + 13);
		buffer[sOff + 41] = 64; // volume
		view.setUint16(sOff + 42, 8363, true); // c4speed
		view.setUint32(sOff + 44, sampleDataOffset + s * samplePcmLen, true); // file offset
		view.setUint32(sOff + 48, samplePcmLen, true); // length
		view.setUint32(sOff + 52, 0, true); // loopStart
		view.setUint32(sOff + 56, samplePcmLen, true); // loopEnd
		view.setUint16(sOff + 60, 1, true); // loop enabled

		// Generate sample PCM sine/saw waveform
		const pcmOffset = sampleDataOffset + s * samplePcmLen;
		for (let i = 0; i < samplePcmLen; i++) {
			buffer[pcmOffset + i] = Math.round(
				Math.sin((i / samplePcmLen) * Math.PI * 2) * 100,
			);
		}
	}

	return buffer;
}

describe("ptmToWavEngine", () => {
	it("probes successfully", async () => {
		expect(await ptmToWavEngine.probe()).toBe(true);
	});

	it("throws on truncated or non-PTM file", () => {
		expect(() => convertPtmToWav(new Uint8Array([]))).toThrow(
			/smaller than the 120-byte/,
		);
		expect(() =>
			convertPtmToWav(new Uint8Array(new Array(120).fill(0))),
		).toThrow(/Missing 'PTMF' identifier magic/);
	});

	it("synthesizes valid stereo WAV from PolyTracker module", () => {
		const mockBytes = createMockPtm({
			title: "Jazz Jackrabbit Pinball",
			channels: 4,
			numSamples: 2,
		});

		const result = convertPtmToWav(mockBytes, { maxDurationSeconds: 1 });
		expect(result.metadata.title).toBe("Jazz Jackrabbit Pinball");
		expect(result.metadata.channels).toBe(4);
		expect(result.metadata.numSamples).toBe(2);
		expect(result.metadata.samples.length).toBe(2);

		// Verify WAV RIFF header
		expect(result.wavBytes[0]).toBe(0x52); // R
		expect(result.wavBytes[1]).toBe(0x49); // I
		expect(result.wavBytes[2]).toBe(0x46); // F
		expect(result.wavBytes[3]).toBe(0x46); // F
		// "WAVE" at offset 8
		expect(result.wavBytes[8]).toBe(0x57);
		expect(result.wavBytes[9]).toBe(0x41);
		expect(result.wavBytes[10]).toBe(0x56);
		expect(result.wavBytes[11]).toBe(0x45);
	});

	it("runs through engine runner with custom sample rate", async () => {
		const mockBytes = createMockPtm({ channels: 2, numSamples: 1 });
		const outBuffer = await ptmToWavEngine.run(
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
