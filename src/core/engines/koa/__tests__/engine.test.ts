import { describe, expect, it } from "vitest";
import { koaToPngEngine } from "../index";
import { convertKoaToPng } from "../parser";

function createMockKoaBuffer(includePrgHeader = true): Uint8Array {
	const size = includePrgHeader ? 10003 : 10001;
	const buf = new Uint8Array(size);
	let offset = 0;

	if (includePrgHeader) {
		buf[0] = 0x00;
		buf[1] = 0x60; // 0x6000
		offset = 2;
	}

	// 8000 bytes bitmap data
	for (let i = 0; i < 8000; i++) {
		buf[offset + i] = i % 4 === 0 ? 0b11100100 : 0x00;
	}

	// 1000 bytes screen ram (color 01 = white (1), color 10 = red (2))
	for (let i = 0; i < 1000; i++) {
		buf[offset + 8000 + i] = 0x12;
	}

	// 1000 bytes color ram (color 11 = cyan (3))
	for (let i = 0; i < 1000; i++) {
		buf[offset + 9000 + i] = 0x03;
	}

	// 1 byte background color (color 00 = black (0))
	buf[offset + 10000] = 0x00;

	return buf;
}

describe("C64 KoalaPainter engine", () => {
	it("probes successfully", async () => {
		expect(await koaToPngEngine.probe()).toBe(true);
	});

	it("decodes a standard PRG-headed .koa file", () => {
		const mock = createMockKoaBuffer(true);
		const result = convertKoaToPng(mock);
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.loadAddress).toBe(0x6000);
		expect(result.metadata.backgroundColor).toBe(0);
		expect(result.pngBytes.length).toBeGreaterThan(100);
		// Check PNG magic
		expect(result.pngBytes[0]).toBe(0x89);
		expect(result.pngBytes[1]).toBe(0x50); // 'P'
		expect(result.pngBytes[2]).toBe(0x4e); // 'N'
		expect(result.pngBytes[3]).toBe(0x47); // 'G'
	});

	it("decodes a raw 10,001-byte .koa file without PRG header", () => {
		const mock = createMockKoaBuffer(false);
		const result = convertKoaToPng(mock);
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.loadAddress).toBe(0x6000);
	});

	it("supports 2x scaling and Colodore palette", () => {
		const mock = createMockKoaBuffer(true);
		const result = convertKoaToPng(mock, { scale: 2, palette: "colodore" });
		expect(result.metadata.width).toBe(640);
		expect(result.metadata.height).toBe(400);
	});

	it("throws on truncated buffer", () => {
		const badBytes = new Uint8Array(5000);
		expect(() => convertKoaToPng(badBytes)).toThrow(
			/smaller than required 10,001 bytes/,
		);
	});

	it("executes through the engine interface", async () => {
		const mock = createMockKoaBuffer(true);
		const out = await koaToPngEngine.run(
			mock.buffer as ArrayBuffer,
			{ scale: "1" },
			() => {},
		);
		expect(out.byteLength).toBeGreaterThan(100);
	});
});
