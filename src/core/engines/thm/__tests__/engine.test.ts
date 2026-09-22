import { describe, expect, it } from "vitest";
import { thmToJpgEngine } from "../index";

function jpegBytes(): ArrayBuffer {
	const bytes = new Uint8Array([
		0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
	]);
	return bytes.buffer as ArrayBuffer;
}

describe("thmToJpgEngine", () => {
	it("probes available without codecs", async () => {
		await expect(thmToJpgEngine.probe()).resolves.toBe(true);
	});

	it("passes a JPEG payload through unchanged", async () => {
		const input = jpegBytes();
		const output = await thmToJpgEngine.run(input, {}, () => {});
		expect(new Uint8Array(output)).toEqual(new Uint8Array(input));
	});

	it("rejects bytes that are not a JPEG / .thm thumbnail", async () => {
		const notJpeg = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]).buffer;
		await expect(
			thmToJpgEngine.run(notJpeg as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/expected a GoPro \.thm thumbnail/);
	});
});
