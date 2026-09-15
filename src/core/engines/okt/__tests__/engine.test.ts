import { describe, expect, it } from "vitest";
import { convertOktToWav, oktToWavEngine } from "../index";

function createMockOktModule(): Uint8Array {
	const chunks: Uint8Array[] = [];

	// Magic: OKTASONG
	const magic = new TextEncoder().encode("OKTASONG");
	chunks.push(magic);

	// Helper to write IFF chunk
	function writeChunk(id: string, data: Uint8Array) {
		const header = new Uint8Array(8);
		for (let i = 0; i < 4; i++) header[i] = id.charCodeAt(i);
		const view = new DataView(header.buffer);
		view.setUint32(4, data.length, false);
		chunks.push(header);
		chunks.push(data);
		if (data.length % 2 !== 0) {
			chunks.push(new Uint8Array([0])); // padding
		}
	}

	// CMOD chunk: 8 channels
	writeChunk("CMOD", new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1]));

	// SAMP chunk: 1 sample header (32 bytes)
	const sampHeader = new Uint8Array(32);
	const name = new TextEncoder().encode("AmigaLead");
	sampHeader.set(name, 0);
	const sampView = new DataView(sampHeader.buffer);
	sampView.setUint32(20, 16, false); // 16 bytes length
	sampView.setUint16(24, 0, false); // loop start
	sampView.setUint16(26, 0, false); // loop length
	sampView.setUint16(28, 64, false); // volume 64
	sampView.setUint16(30, 0, false); // mode
	writeChunk("SAMP", sampHeader);

	// SPEE chunk: speed 6
	const spee = new Uint8Array(2);
	new DataView(spee.buffer).setUint16(0, 6, false);
	writeChunk("SPEE", spee);

	// SLEN chunk: 1 order
	const slen = new Uint8Array(2);
	new DataView(slen.buffer).setUint16(0, 1, false);
	writeChunk("SLEN", slen);

	// PLEN chunk: 1 pattern
	const plen = new Uint8Array(2);
	new DataView(plen.buffer).setUint16(0, 1, false);
	writeChunk("PLEN", plen);

	// PATT chunk: order 0
	const patt = new Uint8Array(2);
	new DataView(patt.buffer).setUint16(0, 0, false);
	writeChunk("PATT", patt);

	// PBOD chunk: 1 pattern = 64 rows * 8 channels * 4 bytes = 2048 bytes
	const pbod = new Uint8Array(64 * 8 * 4);
	// Row 0, channel 0: Note 25 (C-3), Sample 1
	pbod[0] = 25; // Note
	pbod[1] = 1; // Sample 1
	pbod[2] = 0; // cmd
	pbod[3] = 0; // param
	writeChunk("PBOD", pbod);

	// SBOD chunk: 16 bytes of PCM data
	const sbod = new Int8Array([
		0, 32, 64, 96, 127, 96, 64, 32, 0, -32, -64, -96, -128, -96, -64, -32,
	]);
	writeChunk(
		"SBOD",
		new Uint8Array(sbod.buffer, sbod.byteOffset, sbod.byteLength),
	);

	// Concatenate all chunks
	const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
	const res = new Uint8Array(totalLen);
	let pos = 0;
	for (const c of chunks) {
		res.set(c, pos);
		pos += c.length;
	}

	return res;
}

describe("OKT to WAV Engine", () => {
	it("rejects non-OKT buffer", () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		expect(() => convertOktToWav(invalid)).toThrow(/Invalid OKT file/);
	});

	it("parses mock OKT module and synthesizes 16-bit stereo WAV", () => {
		const mock = createMockOktModule();
		const result = convertOktToWav(mock, {
			sampleRate: 22050,
			stereoSeparation: 75,
		});

		expect(result.metadata.title).toBe("Oktalyzer Song");
		expect(result.metadata.numChannels).toBe(8);
		expect(result.metadata.numSamples).toBe(1);
		expect(result.metadata.numOrders).toBe(1);
		expect(result.metadata.durationSeconds).toBeGreaterThan(0.5);

		expect(result.wavBuffer).toBeInstanceOf(ArrayBuffer);
		expect(result.wavBuffer.byteLength).toBeGreaterThan(1000);

		// Verify RIFF and WAVE signatures
		const wavBytes = new Uint8Array(result.wavBuffer);
		expect(
			String.fromCharCode(
				wavBytes[0] ?? 0,
				wavBytes[1] ?? 0,
				wavBytes[2] ?? 0,
				wavBytes[3] ?? 0,
			),
		).toBe("RIFF");
		expect(
			String.fromCharCode(
				wavBytes[8] ?? 0,
				wavBytes[9] ?? 0,
				wavBytes[10] ?? 0,
				wavBytes[11] ?? 0,
			),
		).toBe("WAVE");
	});

	it("runs via engine interface with options and progress tracking", async () => {
		const mock = createMockOktModule();
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await oktToWavEngine.run(
			mock.buffer as ArrayBuffer,
			{ sampleRate: 22050 },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(1000);
		expect(progress.length).toBeGreaterThanOrEqual(3);
	});
});
