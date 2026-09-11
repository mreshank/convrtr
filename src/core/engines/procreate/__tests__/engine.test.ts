import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { procreateToMp4Engine, procreateToPngEngine } from "../index";

function createSyntheticProcreate(
	files: Record<string, Uint8Array>,
): ArrayBuffer {
	const zipped = zipSync(files);
	return zipped.buffer.slice(
		zipped.byteOffset,
		zipped.byteOffset + zipped.byteLength,
	);
}

describe("procreate engines", () => {
	it("probes successfully", async () => {
		expect(await procreateToMp4Engine.probe()).toBe(true);
		expect(await procreateToPngEngine.probe()).toBe(true);
	});

	it("extracts the embedded timelapse MP4", async () => {
		const fakeMp4 = new Uint8Array([
			0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70,
		]); // ftyp
		const input = createSyntheticProcreate({
			"Document.archive": new Uint8Array([1, 2, 3]),
			"video.mp4": fakeMp4,
			"QuickLook/Thumbnail.png": new Uint8Array([4, 5, 6]),
		});

		const output = await procreateToMp4Engine.run(input, {}, () => {});
		expect(new Uint8Array(output)).toEqual(fakeMp4);
	});

	it("extracts the embedded preview PNG from QuickLook", async () => {
		const fakePng = new Uint8Array([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]); // PNG
		const input = createSyntheticProcreate({
			"Document.archive": new Uint8Array([1, 2, 3]),
			"QuickLook/Thumbnail.png": fakePng,
		});

		const output = await procreateToPngEngine.run(input, {}, () => {});
		expect(new Uint8Array(output)).toEqual(fakePng);
	});

	it("throws if the procreate file has no timelapse", async () => {
		const input = createSyntheticProcreate({
			"Document.archive": new Uint8Array([1, 2, 3]),
			"QuickLook/Thumbnail.png": new Uint8Array([4, 5, 6]),
		});

		await expect(procreateToMp4Engine.run(input, {}, () => {})).rejects.toThrow(
			/no timelapse video found/i,
		);
	});

	it("throws if the archive is corrupted", async () => {
		const corrupted = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0xff]);

		await expect(
			procreateToMp4Engine.run(corrupted.buffer, {}, () => {}),
		).rejects.toThrow(/invalid or corrupted/i);
	});
});
