import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { pckToZipEngine } from "../index";

function buildMockPck(
	files: Array<{ path: string; data: string }>,
	version = 1,
): Uint8Array {
	const totalHeaderSize = 4 + 4 + 12 + (version >= 2 ? 4 + 8 + 64 : 64) + 4;
	// Calculate directory size
	let dirSize = 0;
	for (const f of files) {
		const pathBytes = new TextEncoder().encode(f.path);
		const pad = (4 - (pathBytes.length % 4)) % 4;
		dirSize += 4 + pathBytes.length + pad + 16 + 16 + (version >= 2 ? 4 : 0);
	}

	const dataStart = totalHeaderSize + dirSize;
	let totalPayload = 0;
	for (const f of files) {
		totalPayload += new TextEncoder().encode(f.data).length;
	}

	const buffer = new ArrayBuffer(dataStart + totalPayload);
	const view = new DataView(buffer);
	const u8 = new Uint8Array(buffer);

	// "GDPC"
	u8.set([0x47, 0x44, 0x50, 0x43], 0);
	view.setUint32(4, version, true);
	view.setUint32(8, 3, true); // major
	view.setUint32(12, 5, true); // minor
	view.setUint32(16, 0, true); // patch

	let cursor = 20;
	if (version >= 2) {
		view.setUint32(cursor, 0, true); // flags
		cursor += 4;
		view.setBigUint64(cursor, BigInt(0), true); // file_base
		cursor += 8;
		cursor += 64; // reserved
	} else {
		cursor += 64; // reserved
	}

	view.setUint32(cursor, files.length, true);
	cursor += 4;

	let currentOffset = dataStart;
	for (const f of files) {
		const pathBytes = new TextEncoder().encode(f.path);
		const filePayload = new TextEncoder().encode(f.data);

		view.setUint32(cursor, pathBytes.length, true);
		cursor += 4;
		u8.set(pathBytes, cursor);
		cursor += pathBytes.length;

		const pad = (4 - (pathBytes.length % 4)) % 4;
		cursor += pad;

		view.setBigUint64(cursor, BigInt(currentOffset), true);
		cursor += 8;
		view.setBigUint64(cursor, BigInt(filePayload.length), true);
		cursor += 8;

		// 16 bytes md5
		cursor += 16;

		if (version >= 2) {
			view.setUint32(cursor, 0, true);
			cursor += 4;
		}

		// Write payload at currentOffset
		u8.set(filePayload, currentOffset);
		currentOffset += filePayload.length;
	}

	return u8;
}

describe("pckToZipEngine", () => {
	it("probes successfully", async () => {
		expect(await pckToZipEngine.probe()).toBe(true);
	});

	it("unpacks Godot 3 package into structured ZIP archive", async () => {
		const mockPck = buildMockPck(
			[
				{
					path: "res://scripts/main.gd",
					data: 'extends Node\nfunc _ready():\n\tprint("Hello Godot")',
				},
				{ path: "res://assets/config.json", data: '{"score": 100}' },
			],
			1,
		);

		const result = await pckToZipEngine.run(
			mockPck.buffer as ArrayBuffer,
			{},
			() => {},
		);
		expect(result.byteLength).toBeGreaterThan(0);

		const unzipped = unzipSync(new Uint8Array(result));
		expect(Object.keys(unzipped)).toContain("scripts/main.gd");
		expect(Object.keys(unzipped)).toContain("assets/config.json");

		const scriptContent = new TextDecoder().decode(unzipped["scripts/main.gd"]);
		expect(scriptContent).toContain("Hello Godot");
	});

	it("unpacks Godot 4 package into structured ZIP archive", async () => {
		const mockPck = buildMockPck(
			[{ path: "res://icon.svg", data: "<svg><circle/></svg>" }],
			2,
		);

		const result = await pckToZipEngine.run(
			mockPck.buffer as ArrayBuffer,
			{},
			() => {},
		);
		const unzipped = unzipSync(new Uint8Array(result));
		expect(Object.keys(unzipped)).toContain("icon.svg");
	});

	it("rejects non-GDPC files or truncated inputs", async () => {
		const tooSmall = new Uint8Array([1, 2, 3]);
		await expect(
			pckToZipEngine.run(tooSmall.buffer, {}, () => {}),
		).rejects.toThrow(/too small/i);

		const badMagic = new Uint8Array(120).fill(0x55);
		await expect(
			pckToZipEngine.run(badMagic.buffer, {}, () => {}),
		).rejects.toThrow(/invalid magic signature/i);
	});
});
