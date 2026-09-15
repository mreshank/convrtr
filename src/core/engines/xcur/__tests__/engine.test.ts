import { describe, expect, it } from "vitest";
import { parseXcur, xcurToPngEngine } from "../index";

function createMockXcur(
	sizes: Array<{ width: number; height: number; nominal: number }> = [
		{ width: 24, height: 24, nominal: 24 },
	],
): Uint8Array {
	const ntoc = sizes.length;
	const tocSize = ntoc * 12;
	const headerAndTocSize = 16 + tocSize;

	// Calculate chunk positions
	let currentPos = headerAndTocSize;
	const chunkOffsets: number[] = [];
	const chunkSizes: number[] = [];

	for (const s of sizes) {
		chunkOffsets.push(currentPos);
		const size = 36 + s.width * s.height * 4;
		chunkSizes.push(size);
		currentPos += size;
	}

	const buffer = new Uint8Array(currentPos);
	const view = new DataView(buffer.buffer);

	// Write Xcur Header
	view.setUint32(0, 0x72756358, true); // "Xcur"
	view.setUint32(4, 16, true); // header size
	view.setUint32(8, 1, true); // version
	view.setUint32(12, ntoc, true); // ntoc

	// Write TOC
	for (let i = 0; i < ntoc; i++) {
		const s = sizes[i];
		if (!s) continue;
		const tocOff = 16 + i * 12;
		view.setUint32(tocOff, 0xfffd0002, true); // image type
		view.setUint32(tocOff + 4, s.nominal, true); // subtype / nominal size
		view.setUint32(tocOff + 8, chunkOffsets[i] ?? 0, true); // position
	}

	// Write Image Chunks
	for (let i = 0; i < ntoc; i++) {
		const s = sizes[i];
		const pos = chunkOffsets[i];
		if (!s || pos === undefined) continue;
		view.setUint32(pos, 36, true); // chunk header size
		view.setUint32(pos + 4, 0xfffd0002, true); // type
		view.setUint32(pos + 8, s.nominal, true); // subtype
		view.setUint32(pos + 12, 1, true); // version
		view.setUint32(pos + 16, s.width, true); // width
		view.setUint32(pos + 20, s.height, true); // height
		view.setUint32(pos + 24, 2, true); // xhot
		view.setUint32(pos + 28, 2, true); // yhot
		view.setUint32(pos + 32, 0, true); // delay

		// Write pixels (premultiplied ARGB: B, G, R, A)
		const pixelStart = pos + 36;
		for (let p = 0; p < s.width * s.height; p++) {
			const off = pixelStart + p * 4;
			buffer[off] = 50; // Blue
			buffer[off + 1] = 100; // Green
			buffer[off + 2] = 200; // Red
			buffer[off + 3] = 255; // Alpha
		}
	}

	return buffer;
}

describe("xcurToPngEngine", () => {
	it("probes successfully", async () => {
		expect(await xcurToPngEngine.probe()).toBe(true);
	});

	it("throws on invalid buffer size or missing magic", () => {
		const tooSmall = new Uint8Array(8);
		expect(() => parseXcur(tooSmall)).toThrow(/Invalid X11 cursor file/);

		const invalidMagic = new Uint8Array(32);
		expect(() => parseXcur(invalidMagic)).toThrow(/Missing 'Xcur' magic bytes/);
	});

	it("converts multi-resolution X11 cursor to PNG and selects preferred size", () => {
		const mock = createMockXcur([
			{ width: 24, height: 24, nominal: 24 },
			{ width: 48, height: 48, nominal: 48 },
		]);

		const resDefault = parseXcur(mock);
		// By default picks largest or first frame
		expect(resDefault.metadata.availableSizes).toEqual([24, 48]);
		expect(resDefault.metadata.frameCount).toBe(2);
		expect(resDefault.pngBuffer.byteLength).toBeGreaterThan(50);

		// Select specific size
		const res24 = parseXcur(mock, { size: 24 });
		expect(res24.metadata.width).toBe(24);
		expect(res24.metadata.height).toBe(24);
		expect(res24.metadata.xhot).toBe(2);
		expect(res24.metadata.yhot).toBe(2);

		// Check PNG magic
		const png = new Uint8Array(res24.pngBuffer);
		expect(png[0]).toBe(0x89);
		expect(png[1]).toBe(0x50); // P
		expect(png[2]).toBe(0x4e); // N
		expect(png[3]).toBe(0x47); // G
	});

	it("runs via engine interface with parameters and progress", async () => {
		const mock = createMockXcur([{ width: 32, height: 32, nominal: 32 }]);
		const progress: Array<{ ratio: number; phase: string }> = [];

		const output = await xcurToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{ size: 32 },
			(ratio, phase) => progress.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(100);
		expect(progress.length).toBeGreaterThanOrEqual(3);
		expect(progress[progress.length - 1]?.phase).toBe("COMPLETE");
	});
});
