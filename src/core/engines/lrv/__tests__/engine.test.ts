import { describe, expect, it } from "vitest";
import { lrvToMp4Engine } from "../index";

function ftypMp4(): ArrayBuffer {
	const bytes = new Uint8Array(32);
	const view = new DataView(bytes.buffer);
	// ISO BMFF box: size (4) + "ftyp" (4) + major brand etc.
	view.setUint32(0, 32, false);
	bytes[4] = 0x66; // f
	bytes[5] = 0x74; // t
	bytes[6] = 0x79; // y
	bytes[7] = 0x70; // p
	const brand = new TextEncoder().encode("mp42");
	bytes.set(brand, 8);
	return bytes.buffer as ArrayBuffer;
}

describe("lrvToMp4Engine", () => {
	it("probes available without codecs", async () => {
		await expect(lrvToMp4Engine.probe()).resolves.toBe(true);
	});

	it("passes an MP4 container through unchanged", async () => {
		const input = ftypMp4();
		const output = await lrvToMp4Engine.run(input, {}, () => {});
		expect(new Uint8Array(output)).toEqual(new Uint8Array(input));
	});

	it("rejects bytes that are not an MP4 container", async () => {
		const notMp4 = new Uint8Array([
			0x00, 0x01, 0x02, 0x03, 0xaa, 0xbb, 0xcc, 0xdd, 0x00,
		]).buffer;
		await expect(
			lrvToMp4Engine.run(notMp4 as ArrayBuffer, {}, () => {}),
		).rejects.toThrow(/expected a GoPro \.lrv proxy/);
	});
});
