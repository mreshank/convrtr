import { describe, expect, it } from "vitest";
import { amfToWavEngine, convertAmfToWav } from "../index";

function buildSyntheticAmf(): Uint8Array {
	// AMF v10 header: 40 bytes
	// 0..2: "AMF"
	// 3: version 10
	// 4..35: Title (32 bytes)
	// 36: numSamples = 1
	// 37: numOrders = 1
	// 38: numPatterns = 1
	// 39: numChannels = 4
	// Orders: 1 byte (order 0)
	// Sample 0 Header: 47 bytes (1 type + 32 name + 4 len + 2 c2spd + 1 vol + 4 loopStart + 4 loopEnd)
	// Pattern 0: 64 rows * 4 channels * 3 bytes = 768 bytes
	// Sample 0 Data: 16 bytes PCM

	const header = new Uint8Array(40);
	header[0] = 0x41; // 'A'
	header[1] = 0x4d; // 'M'
	header[2] = 0x46; // 'F'
	header[3] = 10;

	// Title: "Synthetic Test AMF"
	const title = "Synthetic Test AMF";
	for (let i = 0; i < title.length; i++) {
		header[4 + i] = title.charCodeAt(i);
	}
	header[36] = 1; // 1 sample
	header[37] = 1; // 1 order
	header[38] = 1; // 1 pattern
	header[39] = 4; // 4 channels

	// Order table: 1 byte
	const orders = new Uint8Array([0]);

	// Sample header: 48 bytes
	const sHead = new Uint8Array(48);
	sHead[0] = 0; // type
	const sName = "Sine Beep";
	for (let i = 0; i < sName.length; i++) {
		sHead[1 + i] = sName.charCodeAt(i);
	}
	const sView = new DataView(sHead.buffer);
	sView.setUint32(33, 16, true); // length = 16
	sView.setUint16(37, 8363, true); // C2Spd = 8363
	sHead[39] = 64; // Volume = 64
	sView.setUint32(40, 0, true); // loopStart
	sView.setUint32(44, 16, true); // loopEnd

	// Pattern: 64 rows * 4 channels * 3 bytes = 768 bytes
	const pat = new Uint8Array(64 * 4 * 3);
	// Place note on row 0, channel 0: note 49 (Middle C), inst 1, vol 64
	pat[0] = 49; // Note C-4
	pat[1] = 1; // Sample 1
	pat[2] = 64; // Volume 64

	// Sample PCM: 16 bytes of sine wave (centered at 128)
	const pcm = new Uint8Array(16);
	for (let i = 0; i < 16; i++) {
		pcm[i] = Math.floor(128 + 120 * Math.sin((i / 16) * Math.PI * 2));
	}

	const total = new Uint8Array(
		header.length + orders.length + sHead.length + pat.length + pcm.length,
	);
	let offset = 0;
	total.set(header, offset);
	offset += header.length;
	total.set(orders, offset);
	offset += orders.length;
	total.set(sHead, offset);
	offset += sHead.length;
	total.set(pat, offset);
	offset += pat.length;
	total.set(pcm, offset);

	return total;
}

function buildSyntheticAsylum(): Uint8Array {
	// ASYLUM header: 68 bytes
	// 0..31: "ASYLUM Music Format V1.0\0"
	// 32..63: Title (32 bytes)
	// 64: numSamples = 1
	// 65: numPatterns = 1
	// 66: numOrders = 1
	// 67: channels = 8

	const header = new Uint8Array(68);
	const sig = "ASYLUM Music Format V1.0\0";
	for (let i = 0; i < sig.length; i++) {
		header[i] = sig.charCodeAt(i);
	}
	const title = "Asylum Retro Track";
	for (let i = 0; i < title.length; i++) {
		header[32 + i] = title.charCodeAt(i);
	}
	header[64] = 1; // 1 sample
	header[65] = 1; // 1 pattern
	header[66] = 1; // 1 order

	const orders = new Uint8Array([0]);

	// Sample header for Asylum: 35 bytes (22 name + 4 len + 4 loopStart + 4 loopEnd + 1 vol)
	const sHead = new Uint8Array(35);
	const sName = "Bass Synth";
	for (let i = 0; i < sName.length; i++) {
		sHead[i] = sName.charCodeAt(i);
	}
	const sView = new DataView(sHead.buffer);
	sView.setUint32(22, 16, true);
	sView.setUint32(26, 0, true);
	sView.setUint32(30, 0, true);
	sHead[34] = 64;

	// Pattern: 64 rows * 8 channels * 3 bytes = 1536 bytes
	const pat = new Uint8Array(64 * 8 * 3);
	pat[0] = 37; // Note C-3
	pat[1] = 1;
	pat[2] = 64;

	const pcm = new Uint8Array(16);
	for (let i = 0; i < 16; i++) {
		pcm[i] = i % 2 === 0 ? 50 : 200;
	}

	const total = new Uint8Array(
		header.length + orders.length + sHead.length + pat.length + pcm.length,
	);
	let offset = 0;
	total.set(header, offset);
	offset += header.length;
	total.set(orders, offset);
	offset += orders.length;
	total.set(sHead, offset);
	offset += sHead.length;
	total.set(pat, offset);
	offset += pat.length;
	total.set(pcm, offset);

	return total;
}

describe("amfToWavEngine", () => {
	it("rejects buffer smaller than header", () => {
		expect(() => convertAmfToWav(new Uint8Array(20))).toThrow(
			/smaller than 64 bytes/,
		);
	});

	it("rejects invalid signature", () => {
		const invalid = new Uint8Array(80);
		expect(() => convertAmfToWav(invalid)).toThrow(/Expected signature 'AMF'/);
	});

	it("converts synthetic AMF file into standard WAV audio", () => {
		const amfBytes = buildSyntheticAmf();
		const result = convertAmfToWav(amfBytes, {
			sampleRate: 44100,
			maxDurationSeconds: 2,
		});

		expect(result.metadata.title).toBe("Synthetic Test AMF");
		expect(result.metadata.formatVersion).toBe("AMF v10");
		expect(result.metadata.channels).toBe(4);
		expect(result.metadata.samples.length).toBe(1);
		expect(result.metadata.samples[0]?.name).toBe("Sine Beep");

		const wavBytes = new Uint8Array(result.wavBuffer);
		// Validate RIFF header
		expect(String.fromCharCode(...wavBytes.subarray(0, 4))).toBe("RIFF");
		expect(String.fromCharCode(...wavBytes.subarray(8, 12))).toBe("WAVE");
		expect(wavBytes.byteLength).toBeGreaterThan(1000);
	});

	it("converts synthetic ASYLUM format file into WAV audio", () => {
		const asylumBytes = buildSyntheticAsylum();
		const result = convertAmfToWav(asylumBytes, {
			sampleRate: 22050,
			maxDurationSeconds: 1,
		});

		expect(result.metadata.title).toBe("Asylum Retro Track");
		expect(result.metadata.formatVersion).toBe("ASYLUM 1.0");
		expect(result.metadata.channels).toBe(8);
		expect(result.metadata.samples.length).toBe(1);

		const wavBytes = new Uint8Array(result.wavBuffer);
		expect(String.fromCharCode(...wavBytes.subarray(0, 4))).toBe("RIFF");
		expect(String.fromCharCode(...wavBytes.subarray(8, 12))).toBe("WAVE");
	});

	it("runs successfully through engine interface", async () => {
		const amfBytes = buildSyntheticAmf();
		const wavBuffer = await amfToWavEngine.run(
			amfBytes.buffer as ArrayBuffer,
			{ sampleRate: 44100 },
			() => {},
		);
		const wavBytes = new Uint8Array(wavBuffer);
		expect(String.fromCharCode(...wavBytes.subarray(0, 4))).toBe("RIFF");
		expect(String.fromCharCode(...wavBytes.subarray(8, 12))).toBe("WAVE");
	});
});
