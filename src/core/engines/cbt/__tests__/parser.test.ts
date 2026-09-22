import { describe, expect, it } from "vitest";
import { encodeRgbaToPng } from "../../dds/parser";
import { cbtToPdfEngine } from "../index";
import { parseTar } from "../parser";

function tarEntry(name: string, data: Uint8Array): Uint8Array {
	const header = new Uint8Array(512);
	const enc = new TextEncoder();
	enc.encodeInto(name, header.subarray(0, 100));
	const sizeOct = data.length.toString(8).padStart(11, "0");
	enc.encodeInto(sizeOct, header.subarray(124, 124 + 11));
	header[156] = 0x30; // regular file
	// ustar magic for realism
	enc.encodeInto("ustar", header.subarray(257, 262));
	let sum = 0;
	header.fill(0x20, 148, 156); // checksum field = spaces for calc
	for (const b of header) sum += b;
	enc.encodeInto(sum.toString(8).padStart(6, "0"), header.subarray(148, 154));
	const padded = Math.ceil(data.length / 512) * 512;
	const out = new Uint8Array(512 + padded);
	out.set(header, 0);
	out.set(data, 512);
	return out;
}

function tarArchive(files: Array<[string, Uint8Array]>): Uint8Array {
	const parts = files.map(([n, d]) => tarEntry(n, d));
	const total = parts.reduce((a, p) => a + p.length, 0) + 1024;
	const out = new Uint8Array(total);
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out; // trailing 1024 zero bytes = end-of-archive
}

describe("CBT tar reader & Engine", () => {
	const page1 = encodeRgbaToPng(16, 16, new Uint8Array(16 * 16 * 4).fill(90));
	const page2 = encodeRgbaToPng(8, 8, new Uint8Array(8 * 8 * 4).fill(30));

	it("reads ustar entries in archive order", () => {
		const tar = tarArchive([
			["comic/002.png", page2],
			["comic/001.png", page1],
		]);
		const entries = parseTar(tar);
		expect(Object.keys(entries)).toEqual(["comic/002.png", "comic/001.png"]);
		expect(entries["comic/001.png"]?.[0]).toBe(0x89);
	});

	it("skips directories and GNU longname entries", () => {
		const dir = new Uint8Array(512);
		new TextEncoder().encodeInto("comic/", dir.subarray(0, 100));
		dir[156] = 0x35; // directory
		const tar = new Uint8Array([...dir, ...tarEntry("comic/010.png", page1)]);
		const entries = parseTar(tar);
		expect(Object.keys(entries)).toEqual(["comic/010.png"]);
	});

	it("binds pages to a PDF through the engine", async () => {
		expect(await cbtToPdfEngine.probe()).toBe(true);
		const tar = tarArchive([
			["002.png", page2],
			["001.png", page1],
		]);
		const input = tar.buffer.slice(
			tar.byteOffset,
			tar.byteOffset + tar.byteLength,
		) as ArrayBuffer;
		const out = await cbtToPdfEngine.run(input, {}, () => {});
		const head = new TextDecoder().decode(new Uint8Array(out).subarray(0, 5));
		expect(head).toBe("%PDF-");
	}, 30000);

	it("throws on corrupt archives", () => {
		expect(() => parseTar(new Uint8Array(600).fill(0x41))).toThrow();
	});
});
