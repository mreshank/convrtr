import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { convertMngToPng, mngToPngEngine } from "../index";

function createMockMng(width = 32, height = 24): Uint8Array {
	// Encode a base PNG image to obtain valid IHDR, IDAT, IEND chunks
	const rgba = new Uint8Array(width * height * 4);
	for (let i = 0; i < rgba.length; i += 4) {
		rgba[i] = 200;
		rgba[i + 1] = 100;
		rgba[i + 2] = 50;
		rgba[i + 3] = 255;
	}
	const pngBytes = encodeRgbaToPng(width, height, rgba);
	// Slice off the 8-byte PNG signature to get raw chunk stream
	const pngChunks = pngBytes.subarray(8);

	// MNG signature (8 bytes)
	const mngSig = new Uint8Array([
		0x8a, 0x4d, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);

	// MHDR chunk (length 28 + 12 = 40 bytes)
	const mhdr = new Uint8Array(40);
	const mhdrView = new DataView(mhdr.buffer);
	mhdrView.setUint32(0, 28, false); // length
	mhdr[4] = 0x4d; // 'M'
	mhdr[5] = 0x48; // 'H'
	mhdr[6] = 0x44; // 'D'
	mhdr[7] = 0x52; // 'R'
	mhdrView.setUint32(8, width, false); // width
	mhdrView.setUint32(12, height, false); // height
	mhdrView.setUint32(16, 1000, false); // ticks per second
	mhdrView.setUint32(20, 1, false); // layers
	mhdrView.setUint32(24, 1, false); // frames
	mhdrView.setUint32(28, 0, false); // playtime
	mhdrView.setUint32(32, 0, false); // simplicity
	mhdrView.setUint32(36, 0x12345678, false); // CRC

	// MEND chunk (12 bytes)
	const mend = new Uint8Array(12);
	const mendView = new DataView(mend.buffer);
	mendView.setUint32(0, 0, false);
	mend[4] = 0x4d; // 'M'
	mend[5] = 0x45; // 'E'
	mend[6] = 0x4e; // 'N'
	mend[7] = 0x44; // 'D'
	mendView.setUint32(8, 0, false);

	// Combine into final MNG file
	const totalSize =
		mngSig.length + mhdr.length + pngChunks.length + mend.length;
	const mngBytes = new Uint8Array(totalSize);

	let p = 0;
	mngBytes.set(mngSig, p);
	p += mngSig.length;
	mngBytes.set(mhdr, p);
	p += mhdr.length;
	mngBytes.set(pngChunks, p);
	p += pngChunks.length;
	mngBytes.set(mend, p);

	return mngBytes;
}

describe("Multiple-image Network Graphics (MNG) Engine", () => {
	it("converts a valid MNG animation container to PNG", () => {
		const mngBytes = createMockMng(32, 24);
		const result = convertMngToPng(mngBytes);

		expect(result.pngBuffer.byteLength).toBeGreaterThan(50);
		expect(result.metadata.width).toBe(32);
		expect(result.metadata.height).toBe(24);
		expect(result.metadata.frameCount).toBe(1);

		// Check PNG magic signature (0x89 0x50 0x4E 0x47)
		const view = new DataView(result.pngBuffer);
		expect(view.getUint32(0, false)).toBe(0x89504e47);
	});

	it("throws on truncated or invalid MNG files", () => {
		expect(() => convertMngToPng(new Uint8Array([1, 2, 3]))).toThrow(
			"Invalid MNG file: File size is smaller than the 8-byte signature.",
		);

		const badMagic = new Uint8Array(32);
		expect(() => convertMngToPng(badMagic)).toThrow(
			"Invalid MNG file: Missing MNG magic signature",
		);
	});

	it("runs through the engine interface", async () => {
		const mngBytes = createMockMng(16, 16);
		const output = await mngToPngEngine.run(
			mngBytes.buffer.slice(0) as ArrayBuffer,
			{ frameIndex: 0 },
			() => {},
		);

		expect(output.byteLength).toBeGreaterThan(40);
		const view = new DataView(output);
		expect(view.getUint32(0, false)).toBe(0x89504e47);
	});
});
