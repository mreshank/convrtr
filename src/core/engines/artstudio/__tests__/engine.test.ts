import { describe, expect, it } from "vitest";
import { artStudioToPngEngine, convertArtStudioToPng } from "../index";

function createMockArtBuffer(options: {
	mode: "multicolor" | "hires";
	includePrgHeader?: boolean;
}): Uint8Array {
	const includePrg = options.includePrgHeader ?? true;
	const isMulticolor = options.mode === "multicolor";

	// Multicolor: 2 header + 8000 bitmap + 1000 screen + 1000 color + 1 bg = 10003 bytes
	// Hires: 2 header + 8000 bitmap + 1000 screen = 9002 bytes
	const dataSize = isMulticolor ? 10001 : 9000;
	const totalSize = (includePrg ? 2 : 0) + dataSize;
	const buffer = new Uint8Array(totalSize);

	let offset = 0;
	if (includePrg) {
		buffer[0] = 0x00;
		buffer[1] = 0x20; // 0x2000
		offset = 2;
	}

	// 8000 bytes bitmap
	for (let i = 0; i < 8000; i++) {
		buffer[offset + i] = i % 2 === 0 ? 0xaa : 0x55;
	}

	// 1000 bytes screen ram
	for (let i = 0; i < 1000; i++) {
		buffer[offset + 8000 + i] = 0x12; // High nibble 1 (white), Low nibble 2 (red)
	}

	if (isMulticolor) {
		// 1000 bytes color ram
		for (let i = 0; i < 1000; i++) {
			buffer[offset + 9000 + i] = 0x03; // Cyan
		}
		// 1 byte background color
		buffer[offset + 10000] = 0x00; // Black
	}

	return buffer;
}

describe("Commodore 64 Advanced Art Studio (.art) engine", () => {
	it("probes successfully", async () => {
		expect(await artStudioToPngEngine.probe()).toBe(true);
	});

	it("rejects input smaller than minimum 9,000 bytes", () => {
		const small = new Uint8Array(4000);
		expect(() => convertArtStudioToPng(small)).toThrow(
			/smaller than the required 9,000 bytes/,
		);
	});

	it("decodes multicolor .art file with PRG header into valid PNG", () => {
		const mock = createMockArtBuffer({ mode: "multicolor" });
		const result = convertArtStudioToPng(mock);

		expect(result.metadata.mode).toBe("multicolor");
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.loadAddress).toBe(0x2000);
		expect(result.pngBytes.length).toBeGreaterThan(100);

		// PNG Magic: \x89PNG\r\n\x1a\n
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50);
		expect(result.pngBytes[2]).toBe(0x4e);
		expect(result.pngBytes[3]).toBe(0x47);
	});

	it("decodes hires .art file into valid 320x200 PNG", () => {
		const mock = createMockArtBuffer({ mode: "hires" });
		const result = convertArtStudioToPng(mock);

		expect(result.metadata.mode).toBe("hires");
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.colorsUsed).toContain(1); // white
		expect(result.metadata.colorsUsed).toContain(2); // red
		expect(result.pngBytes[0]).toBe(0x89);
	});

	it("supports custom scaling and palette options", () => {
		const mock = createMockArtBuffer({ mode: "multicolor" });
		const result = convertArtStudioToPng(mock, {
			scale: 2,
			palette: "colodore",
		});

		expect(result.metadata.width).toBe(640);
		expect(result.metadata.height).toBe(400);
		expect(result.metadata.palette).toBe("colodore");
	});

	it("executes through engine interface", async () => {
		const mock = createMockArtBuffer({ mode: "multicolor" });
		const output = await artStudioToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{ scale: 1 },
			() => {},
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		const view = new Uint8Array(output);
		expect(view[0]).toBe(0x89);
		expect(view[1]).toBe(0x50);
	});
});
