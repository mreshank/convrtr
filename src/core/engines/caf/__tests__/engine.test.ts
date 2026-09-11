import { describe, expect, it } from "vitest";
import { convertCafToWav, parseCafHeader } from "../parser";

function createMockCaf(
	sampleRate: number,
	channels: number,
	bitsPerChannel: number,
	isFloat: boolean,
	isLittleEndian: boolean,
	pcmData: Uint8Array,
): Uint8Array {
	const headerSize = 8;
	const descChunkSize = 12 + 32; // 12 header + 32 payload
	const dataChunkSize = 12 + 4 + pcmData.length; // 12 header + 4 editCount + data
	const totalSize = headerSize + descChunkSize + dataChunkSize;

	const buf = new Uint8Array(totalSize);
	const view = new DataView(buf.buffer);
	const encoder = new TextEncoder();

	// 1. File header: 'caff', version 1, flags 0
	buf.set(encoder.encode("caff"), 0);
	view.setUint16(4, 1, false);
	view.setUint16(6, 0, false);

	// 2. 'desc' chunk
	let ptr = 8;
	buf.set(encoder.encode("desc"), ptr);
	view.setBigInt64(ptr + 4, BigInt(32), false);
	ptr += 12;

	view.setFloat64(ptr, sampleRate, false);
	buf.set(encoder.encode("lpcm"), ptr + 8);

	let formatFlags = 0;
	if (isFloat) formatFlags |= 1;
	if (isLittleEndian) formatFlags |= 2;
	view.setUint32(ptr + 12, formatFlags, false);

	const bytesPerPacket = channels * (bitsPerChannel / 8);
	view.setUint32(ptr + 16, bytesPerPacket, false);
	view.setUint32(ptr + 20, 1, false); // framesPerPacket
	view.setUint32(ptr + 24, channels, false);
	view.setUint32(ptr + 28, bitsPerChannel, false);
	ptr += 32;

	// 3. 'data' chunk
	buf.set(encoder.encode("data"), ptr);
	view.setBigInt64(ptr + 4, BigInt(4 + pcmData.length), false);
	ptr += 12;
	view.setUint32(ptr, 0, false); // editCount
	ptr += 4;

	buf.set(pcmData, ptr);

	return buf;
}

describe("Apple Core Audio Format (CAF) Engine", () => {
	it("parses and converts 16-bit Little-Endian stereo CAF to WAV", () => {
		// 4 samples * 2 channels * 2 bytes = 16 bytes
		const pcm = new Uint8Array(16);
		const view = new DataView(pcm.buffer);
		view.setInt16(0, 1000, true);
		view.setInt16(2, -1000, true);
		view.setInt16(4, 2000, true);
		view.setInt16(6, -2000, true);

		const caf = createMockCaf(44100, 2, 16, false, true, pcm);

		const header = parseCafHeader(caf);
		expect(header.version).toBe(1);
		expect(header.desc.sampleRate).toBe(44100);
		expect(header.desc.channelsPerFrame).toBe(2);
		expect(header.desc.bitsPerChannel).toBe(16);
		expect(header.desc.isLittleEndian).toBe(true);

		const result = convertCafToWav(caf);
		expect(result.sampleRate).toBe(44100);
		expect(result.channels).toBe(2);
		expect(result.wavBuffer.length).toBe(44 + 16);

		// Check WAV magic
		const magicRiff = new TextDecoder().decode(result.wavBuffer.subarray(0, 4));
		const magicWave = new TextDecoder().decode(
			result.wavBuffer.subarray(8, 12),
		);
		expect(magicRiff).toBe("RIFF");
		expect(magicWave).toBe("WAVE");
	});

	it("converts 16-bit Big-Endian mono CAF", () => {
		const pcm = new Uint8Array(4);
		const view = new DataView(pcm.buffer);
		view.setInt16(0, 5000, false);
		view.setInt16(2, -5000, false);

		const caf = createMockCaf(48000, 1, 16, false, false, pcm);
		const result = convertCafToWav(caf);

		expect(result.sampleRate).toBe(48000);
		expect(result.channels).toBe(1);
		expect(result.wavBuffer.length).toBe(44 + 4);

		// Check swapped Little-Endian values in output
		const outView = new DataView(
			result.wavBuffer.buffer,
			result.wavBuffer.byteOffset,
		);
		expect(outView.getInt16(44, true)).toBe(5000);
		expect(outView.getInt16(46, true)).toBe(-5000);
	});

	it("converts 32-bit Float CAF to 16-bit PCM WAV", () => {
		const pcm = new Uint8Array(8);
		const view = new DataView(pcm.buffer);
		view.setFloat32(0, 0.5, true);
		view.setFloat32(4, -0.5, true);

		const caf = createMockCaf(44100, 1, 32, true, true, pcm);
		const result = convertCafToWav(caf);

		const outView = new DataView(
			result.wavBuffer.buffer,
			result.wavBuffer.byteOffset,
		);
		// 0.5 * 32767 ≈ 16384
		expect(outView.getInt16(44, true)).toBeCloseTo(16384, -2);
	});

	it("converts 24-bit PCM CAF to 16-bit PCM WAV", () => {
		const pcm = new Uint8Array(3);
		// 24-bit value: 0x400000 -> 16-bit >> 8 = 0x4000 = 16384
		pcm[0] = 0x00;
		pcm[1] = 0x00;
		pcm[2] = 0x40;

		const caf = createMockCaf(44100, 1, 24, false, true, pcm);
		const result = convertCafToWav(caf);

		const outView = new DataView(
			result.wavBuffer.buffer,
			result.wavBuffer.byteOffset,
		);
		expect(outView.getInt16(44, true)).toBe(16384);
	});

	it("throws on invalid non-caff file or missing chunks", () => {
		const bad = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(() => parseCafHeader(bad)).toThrow(/expected 'caff' magic/);
	});
});
