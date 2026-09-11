import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { sf2ToWavEngine } from "../index";

function buildSyntheticSf2(
	samples: { name: string; pcmWords: number[]; sampleRate: number }[],
): ArrayBuffer {
	// Concatenate all PCM words into one buffer
	let totalPcmWords = 0;
	const sampleOffsets: {
		name: string;
		start: number;
		end: number;
		sampleRate: number;
	}[] = [];

	for (const s of samples) {
		const start = totalPcmWords;
		const end = start + s.pcmWords.length;
		sampleOffsets.push({ name: s.name, start, end, sampleRate: s.sampleRate });
		totalPcmWords += s.pcmWords.length;
	}

	const smplBytes = new Uint8Array(totalPcmWords * 2);
	const smplView = new DataView(smplBytes.buffer);
	let wordIdx = 0;
	for (const s of samples) {
		for (const w of s.pcmWords) {
			smplView.setInt16(wordIdx * 2, w, true);
			wordIdx++;
		}
	}

	// Build shdr records: 46 bytes each + 1 EOS entry
	const shdrCount = samples.length + 1;
	const shdrBytes = new Uint8Array(shdrCount * 46);
	const shdrView = new DataView(shdrBytes.buffer);

	for (let i = 0; i < samples.length; i++) {
		const offset = i * 46;
		const s = sampleOffsets[i];
		if (!s) continue;
		// Name (20 bytes)
		const nameBytes = new TextEncoder().encode(s.name);
		shdrBytes.set(nameBytes.subarray(0, 19), offset);
		shdrView.setUint32(offset + 20, s.start, true);
		shdrView.setUint32(offset + 24, s.end, true);
		shdrView.setUint32(offset + 36, s.sampleRate, true);
		shdrView.setUint16(offset + 44, 1, true); // Mono
	}
	// EOS entry
	const eosOffset = samples.length * 46;
	shdrBytes.set(new TextEncoder().encode("EOS"), eosOffset);

	// Construct RIFF chunks
	// LIST sdta
	const sdtaPayloadLen = 4 + (8 + smplBytes.length);
	// LIST pdta
	const pdtaPayloadLen = 4 + (8 + shdrBytes.length);

	const totalRiffLen = 4 + (8 + sdtaPayloadLen) + (8 + pdtaPayloadLen);
	const buffer = new ArrayBuffer(8 + totalRiffLen);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	// "RIFF"
	u8.set(new TextEncoder().encode("RIFF"), 0);
	view.setUint32(4, totalRiffLen, true);
	// "sfbk"
	u8.set(new TextEncoder().encode("sfbk"), 8);

	// LIST sdta
	let cursor = 12;
	u8.set(new TextEncoder().encode("LIST"), cursor);
	view.setUint32(cursor + 4, sdtaPayloadLen, true);
	cursor += 8;
	u8.set(new TextEncoder().encode("sdta"), cursor);
	cursor += 4;
	u8.set(new TextEncoder().encode("smpl"), cursor);
	view.setUint32(cursor + 4, smplBytes.length, true);
	cursor += 8;
	u8.set(smplBytes, cursor);
	cursor += smplBytes.length;

	// LIST pdta
	u8.set(new TextEncoder().encode("LIST"), cursor);
	view.setUint32(cursor + 4, pdtaPayloadLen, true);
	cursor += 8;
	u8.set(new TextEncoder().encode("pdta"), cursor);
	cursor += 4;
	u8.set(new TextEncoder().encode("shdr"), cursor);
	view.setUint32(cursor + 4, shdrBytes.length, true);
	cursor += 8;
	u8.set(shdrBytes, cursor);

	return buffer;
}

describe("sf2ToWavEngine", () => {
	it("probes successfully", async () => {
		expect(await sf2ToWavEngine.probe()).toBe(true);
	});

	it("extracts instrument samples from a SoundFont into a ZIP of WAV files", async () => {
		const sf2 = buildSyntheticSf2([
			{ name: "SnareDrum", pcmWords: [100, 200, -300, 400], sampleRate: 44100 },
			{ name: "PianoC4", pcmWords: [500, 1000, 1500, 2000], sampleRate: 22050 },
		]);

		const output = await sf2ToWavEngine.run(sf2, {}, () => {});
		const unzipped = unzipSync(new Uint8Array(output));

		expect(Object.keys(unzipped)).toContain("SnareDrum.wav");
		expect(Object.keys(unzipped)).toContain("PianoC4.wav");

		// Validate WAV header of first sample
		const snareWav = unzipped["SnareDrum.wav"];
		expect(snareWav).toBeDefined();
		if (!snareWav) throw new Error("SnareDrum.wav missing from zip");
		const snareRiff = new TextDecoder().decode(snareWav.subarray(0, 4));
		const snareWave = new TextDecoder().decode(snareWav.subarray(8, 12));
		expect(snareRiff).toBe("RIFF");
		expect(snareWave).toBe("WAVE");
	});

	it("rejects files that are too small or not SoundFont 2", async () => {
		const smallBytes = new Uint8Array(10);
		await expect(
			sf2ToWavEngine.run(smallBytes.buffer, {}, () => {}),
		).rejects.toThrow(/too small/i);

		const badBytes = new Uint8Array(100).fill(0x55);
		await expect(
			sf2ToWavEngine.run(badBytes.buffer, {}, () => {}),
		).rejects.toThrow(/not a valid SoundFont/i);
	});
});
