import { describe, expect, it } from "vitest";
import { pkgToMp4Engine } from "../index";

function buildSyntheticPkg(
	files: { name: string; data: Uint8Array }[],
): ArrayBuffer {
	const magic = new TextEncoder().encode("PKGV0001");
	const count = files.length;

	// Calculate header length
	let headerLen = 8 + 4;
	for (const f of files) {
		const nameBytes = new TextEncoder().encode(f.name);
		headerLen += 4 + nameBytes.length + 4 + 4;
	}

	let totalPayload = 0;
	for (const f of files) totalPayload += f.data.length;

	const buffer = new ArrayBuffer(headerLen + totalPayload);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	u8.set(magic, 0);
	view.setUint32(8, count, true);

	let cursor = 12;
	let payloadOffset = headerLen;

	for (const f of files) {
		const nameBytes = new TextEncoder().encode(f.name);
		view.setUint32(cursor, nameBytes.length, true);
		cursor += 4;

		u8.set(nameBytes, cursor);
		cursor += nameBytes.length;

		view.setUint32(cursor, payloadOffset, true);
		cursor += 4;

		view.setUint32(cursor, f.data.length, true);
		cursor += 4;

		u8.set(f.data, payloadOffset);
		payloadOffset += f.data.length;
	}

	return buffer;
}

describe("pkgToMp4Engine", () => {
	it("probes successfully", async () => {
		expect(await pkgToMp4Engine.probe()).toBe(true);
	});

	it("extracts the embedded MP4 video from a PKGV0001 package", async () => {
		const fakeVideo = new Uint8Array([
			0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
		]);
		const fakeJson = new TextEncoder().encode('{"title":"Anime Wallpaper"}');

		const pkg = buildSyntheticPkg([
			{ name: "project.json", data: fakeJson },
			{ name: "video.mp4", data: fakeVideo },
		]);

		const output = await pkgToMp4Engine.run(pkg, {}, () => {});
		expect(new Uint8Array(output)).toEqual(fakeVideo);
	});

	it("rejects non-PKGV files", async () => {
		const badBytes = new TextEncoder().encode("NOT_A_PKG_FILE_AT_ALL");
		await expect(
			pkgToMp4Engine.run(badBytes.buffer, {}, () => {}),
		).rejects.toThrow(/not a valid Wallpaper Engine package/i);
	});

	it("rejects packages without an MP4 video stream", async () => {
		const sceneOnly = buildSyntheticPkg([
			{ name: "scene.json", data: new Uint8Array([1, 2, 3]) },
		]);

		await expect(pkgToMp4Engine.run(sceneOnly, {}, () => {})).rejects.toThrow(
			/no MP4 video stream found/i,
		);
	});
});
