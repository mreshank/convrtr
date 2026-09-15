import { describe, expect, it } from "vitest";
import { cpcToPngEngine, parseCpcScreen } from "../index";

function createMockCpcScreen(
	includeAmsdosHeader = false,
	amsdosName = "TEST.SCR",
): Uint8Array {
	const headerSize = includeAmsdosHeader ? 128 : 0;
	const totalSize = headerSize + 16384;
	const buffer = new Uint8Array(totalSize);

	if (includeAmsdosHeader) {
		// User 0
		buffer[0] = 0;
		// Filename: 8 chars
		const parts = amsdosName.split(".");
		const base = (parts[0] ?? "").padEnd(8, " ");
		const ext = (parts[1] ?? "").padEnd(3, " ");
		for (let i = 0; i < 8; i++) buffer[1 + i] = base.charCodeAt(i);
		for (let i = 0; i < 3; i++) buffer[9 + i] = ext.charCodeAt(i);

		// Type: 2 = screen
		buffer[18] = 2;
		// Load address: 0xC000
		buffer[21] = 0x00;
		buffer[22] = 0xc0;
		// Length: 0x4000
		buffer[24] = 0x00;
		buffer[25] = 0x40;

		// Checksum: bytes 0..66
		let sum = 0;
		for (let i = 0; i < 67; i++) sum += buffer[i] ?? 0;
		buffer[67] = sum & 0xff;
		buffer[68] = (sum >> 8) & 0xff;
	}

	// Fill some scanlines with recognizable pattern
	for (let y = 0; y < 200; y++) {
		const lineInChar = y % 8;
		const charRow = Math.floor(y / 8);
		const offset = headerSize + lineInChar * 0x800 + charRow * 80;
		for (let x = 0; x < 80; x++) {
			buffer[offset + x] = (x + y) & 0xff;
		}
	}

	return buffer;
}

describe("cpcToPngEngine", () => {
	it("probes successfully", async () => {
		expect(await cpcToPngEngine.probe()).toBe(true);
	});

	it("throws on invalid file size", () => {
		const smallBuffer = new Uint8Array(500);
		expect(() => parseCpcScreen(smallBuffer)).toThrow(
			/Invalid Amstrad CPC screen file/,
		);
	});

	it("decodes raw Mode 0 screen with default aspect correction (320x200)", async () => {
		const rawScreen = createMockCpcScreen(false);
		const result = parseCpcScreen(rawScreen, {
			mode: 0,
			aspectCorrection: true,
		});

		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.mode).toBe(0);
		expect(result.metadata.hasAmsdosHeader).toBe(false);
		expect(result.pngBuffer.byteLength).toBeGreaterThan(100);

		// Check PNG magic bytes
		const pngBytes = new Uint8Array(result.pngBuffer);
		expect(pngBytes[0]).toBe(0x89);
		expect(pngBytes[1]).toBe(0x50); // 'P'
		expect(pngBytes[2]).toBe(0x4e); // 'N'
		expect(pngBytes[3]).toBe(0x47); // 'G'
	});

	it("decodes Mode 0 screen without aspect correction (160x200)", () => {
		const rawScreen = createMockCpcScreen(false);
		const result = parseCpcScreen(rawScreen, {
			mode: 0,
			aspectCorrection: false,
		});

		expect(result.metadata.width).toBe(160);
		expect(result.metadata.height).toBe(200);
		expect(result.metadata.mode).toBe(0);
	});

	it("decodes Mode 1 screen (320x200) and Mode 2 screen (640x200)", () => {
		const rawScreen = createMockCpcScreen(false);

		const mode1 = parseCpcScreen(rawScreen, { mode: 1 });
		expect(mode1.metadata.width).toBe(320);
		expect(mode1.metadata.height).toBe(200);
		expect(mode1.metadata.mode).toBe(1);

		const mode2 = parseCpcScreen(rawScreen, { mode: 2 });
		expect(mode2.metadata.width).toBe(640);
		expect(mode2.metadata.height).toBe(200);
		expect(mode2.metadata.mode).toBe(2);
	});

	it("correctly parses AMSDOS 128-byte header and filename", () => {
		const amsdosScreen = createMockCpcScreen(true, "DEMO.SCR");
		const result = parseCpcScreen(amsdosScreen);

		expect(result.metadata.hasAmsdosHeader).toBe(true);
		expect(result.metadata.amsdosFilename).toBe("DEMO.SCR");
		expect(result.metadata.width).toBe(320);
		expect(result.metadata.height).toBe(200);
	});

	it("runs via engine interface with parameters", async () => {
		const screen = createMockCpcScreen(true, "ART.BIN");
		const progressUpdates: Array<{ ratio: number; phase: string }> = [];

		const output = await cpcToPngEngine.run(
			screen.buffer as ArrayBuffer,
			{ mode: 1, aspectCorrection: true },
			(ratio, phase) => progressUpdates.push({ ratio, phase }),
		);

		expect(output).toBeInstanceOf(ArrayBuffer);
		expect(output.byteLength).toBeGreaterThan(200);
		expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
		expect(progressUpdates[progressUpdates.length - 1]?.phase).toBe("COMPLETE");
	});
});
