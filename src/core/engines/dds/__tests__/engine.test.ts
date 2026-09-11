import { describe, expect, it } from "vitest";
import { ddsToPngEngine } from "../index";

function createMockDdsHeader(options: {
	width: number;
	height: number;
	fourCC?: number;
	rgbBitCount?: number;
	rMask?: number;
	bMask?: number;
	flags?: number;
}): Uint8Array {
	const header = new Uint8Array(128);
	const view = new DataView(header.buffer);

	// Magic: 'DDS ' (0x20534444)
	view.setUint32(0, 0x20534444, true);
	// dwSize: 124
	view.setUint32(4, 124, true);
	// dwFlags: DDSD_CAPS | DDSD_HEIGHT | DDSD_WIDTH | DDSD_PIXELFORMAT
	view.setUint32(8, 0x1007, true);
	// dwHeight
	view.setUint32(12, options.height, true);
	// dwWidth
	view.setUint32(16, options.width, true);

	// ddspf (offset 84)
	view.setUint32(84, 32, true); // dwSize = 32
	if (options.fourCC !== undefined) {
		view.setUint32(88, 0x00000004, true); // DDPF_FOURCC
		view.setUint32(92, options.fourCC, true);
	} else {
		view.setUint32(88, options.flags ?? 0x00000041, true); // DDPF_RGB | DDPF_ALPHAPIXELS
		view.setUint32(96, options.rgbBitCount ?? 32, true);
		view.setUint32(100, options.rMask ?? 0x00ff0000, true);
		view.setUint32(108, options.bMask ?? 0x000000ff, true);
	}

	return header;
}

describe("ddsToPngEngine", () => {
	it("probes successfully", async () => {
		const supported = await ddsToPngEngine.probe();
		expect(supported).toBe(true);
	});

	it("converts DXT1 compressed texture into valid PNG", async () => {
		// 4x4 image with DXT1 compression
		const header = createMockDdsHeader({
			width: 4,
			height: 4,
			fourCC: 0x31545844, // "DXT1"
		});

		// 8-byte DXT1 block: color0 (Red 0xF800), color1 (Blue 0x001F), lookup
		const block = new Uint8Array(8);
		const blockView = new DataView(block.buffer);
		blockView.setUint16(0, 0xf800, true); // Red in RGB565
		blockView.setUint16(2, 0x001f, true); // Blue in RGB565
		blockView.setUint32(4, 0x55555555, true); // alternating pixels

		const fullDds = new Uint8Array(128 + 8);
		fullDds.set(header, 0);
		fullDds.set(block, 128);

		const progress: string[] = [];
		const result = await ddsToPngEngine.run(
			fullDds.buffer,
			{},
			(_ratio, phase) => {
				progress.push(phase);
			},
		);

		expect(result.byteLength).toBeGreaterThan(0);
		const pngBytes = new Uint8Array(result);

		// PNG signature: 89 50 4E 47 0D 0A 1A 0A
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(pngBytes[2]).toBe(0x4e);
		expect(pngBytes[3]).toBe(0x47);

		expect(progress).toContain("READ_HEADER");
		expect(progress).toContain("DECODE_PIXELS");
		expect(progress).toContain("ENCODE_PNG");
		expect(progress).toContain("DONE");
	});

	it("converts DXT5 compressed texture into valid PNG", async () => {
		// 4x4 image with DXT5 compression (16 bytes per block)
		const header = createMockDdsHeader({
			width: 4,
			height: 4,
			fourCC: 0x35545844, // "DXT5"
		});

		const block = new Uint8Array(16);
		// Alpha block: alpha0 = 255, alpha1 = 0
		block[0] = 255;
		block[1] = 0;
		// Color block: green 0x07E0
		const blockView = new DataView(block.buffer);
		blockView.setUint16(8, 0x07e0, true);
		blockView.setUint16(10, 0x07e0, true);

		const fullDds = new Uint8Array(128 + 16);
		fullDds.set(header, 0);
		fullDds.set(block, 128);

		const result = await ddsToPngEngine.run(fullDds.buffer, {}, () => {});
		const pngBytes = new Uint8Array(result);
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(pngBytes[2]).toBe(0x4e);
		expect(pngBytes[3]).toBe(0x47);
	});

	it("converts uncompressed 32-bit BGRA texture into valid PNG", async () => {
		const header = createMockDdsHeader({
			width: 4,
			height: 4,
			rgbBitCount: 32,
			rMask: 0x00ff0000,
			bMask: 0x000000ff,
		});

		// 4x4 pixels * 4 bytes = 64 bytes
		const pixels = new Uint8Array(64);
		for (let i = 0; i < 64; i += 4) {
			pixels[i] = 255; // B
			pixels[i + 1] = 128; // G
			pixels[i + 2] = 64; // R
			pixels[i + 3] = 255; // A
		}

		const fullDds = new Uint8Array(128 + 64);
		fullDds.set(header, 0);
		fullDds.set(pixels, 128);

		const result = await ddsToPngEngine.run(fullDds.buffer, {}, () => {});
		const pngBytes = new Uint8Array(result);
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50);
		expect(pngBytes[2]).toBe(0x4e);
		expect(pngBytes[3]).toBe(0x47);
	});

	it("rejects non-DDS files", async () => {
		const invalid = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
		await expect(
			ddsToPngEngine.run(invalid.buffer, {}, () => {}),
		).rejects.toThrow(/too small/i);
	});
});
