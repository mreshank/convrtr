import { describe, expect, it } from "vitest";
import { clipToPngEngine } from "../index";

function buildSyntheticClipFile(pngs: Uint8Array[]): ArrayBuffer {
	// 100 bytes minimum, starts with "SQLite format 3\0"
	const sqliteHeader = new TextEncoder().encode("SQLite format 3\0");
	const totalLen = Math.max(
		128,
		100 + pngs.reduce((sum, p) => sum + p.length + 32, 0),
	);
	const buffer = new Uint8Array(totalLen);
	buffer.set(sqliteHeader, 0);

	let cursor = 64;
	for (const png of pngs) {
		buffer.set(png, cursor);
		cursor += png.length + 32;
	}

	return buffer.buffer;
}

function buildSyntheticPng(
	width: number,
	height: number,
	payloadLength = 16,
): Uint8Array {
	const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	const iend = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
	const png = new Uint8Array(header.length + payloadLength + iend.length);
	png.set(header, 0);
	for (let i = 0; i < payloadLength; i++) {
		png[header.length + i] = (width + height + i) % 256;
	}
	png.set(iend, header.length + payloadLength);
	return png;
}

describe("clipToPngEngine", () => {
	it("probes successfully", async () => {
		expect(await clipToPngEngine.probe()).toBe(true);
	});

	it("extracts the largest embedded PNG artwork preview", async () => {
		const smallThumbnail = buildSyntheticPng(64, 64, 16);
		const largeCanvas = buildSyntheticPng(2048, 2048, 128);

		const clipFile = buildSyntheticClipFile([smallThumbnail, largeCanvas]);
		const output = await clipToPngEngine.run(clipFile, {}, () => {});

		expect(new Uint8Array(output)).toEqual(largeCanvas);
	});

	it("rejects files without the SQLite header", async () => {
		const badBytes = new TextEncoder().encode(
			"This is not a Clip Studio Paint file!",
		);
		const buffer = new Uint8Array(128);
		buffer.set(badBytes, 0);

		await expect(
			clipToPngEngine.run(buffer.buffer, {}, () => {}),
		).rejects.toThrow(/missing SQLite header/i);
	});

	it("rejects valid SQLite files that contain no PNG preview", async () => {
		const emptyDb = buildSyntheticClipFile([]);

		await expect(clipToPngEngine.run(emptyDb, {}, () => {})).rejects.toThrow(
			/no rendered artwork preview found/i,
		);
	});
});
