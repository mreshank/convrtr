import { describe, expect, it } from "vitest";
import { torrentToJsonEngine } from "../index";
import { magnetLink, parseTorrent } from "../parser";

function eStr(s: string): number[] {
	const digits = [...`${new TextEncoder().encode(s).length}`].map((c) =>
		c.charCodeAt(0),
	);
	return [...digits, 0x3a, ...new TextEncoder().encode(s)];
}

function eInt(n: number): number[] {
	return [0x69, ...[...`${n}`].map((c) => c.charCodeAt(0)), 0x65];
}

function eList(items: number[][]): number[] {
	return [0x6c, ...items.flat(), 0x65];
}

function eDict(pairs: Array<[string, number[]]>): number[] {
	const out: number[] = [0x64];
	for (const [k, v] of pairs.sort(([a], [b]) => (a < b ? -1 : 1))) {
		out.push(...eStr(k), ...v);
	}
	out.push(0x65);
	return out;
}

function eBytes(raw: Uint8Array): number[] {
	const digits = [...`${raw.length}`].map((c) => c.charCodeAt(0));
	return [...digits, 0x3a, ...raw];
}

function makeTorrent(): Uint8Array {
	const info = eDict([
		["length", eInt(11)],
		["name", eStr("hello.txt")],
		["piece length", eInt(16384)],
		["pieces", eBytes(new Uint8Array(20).fill(0xab))],
	]);
	const top = eDict([
		["announce", eStr("https://tracker.example/announce")],
		[
			"announce-list",
			eList([
				eList([eStr("https://t1.example/a"), eStr("https://t2.example/a")]),
			]),
		],
		["comment", eStr("test")],
		["created by", eStr("convrtr")],
		["creation date", eInt(1717754400)],
		["info", info],
	]);
	return new Uint8Array(top);
}

describe("Torrent metainfo Parser & Engine", () => {
	it("decodes single-file layout with trackers and magnet", async () => {
		const info = await parseTorrent(makeTorrent());
		expect(info.name).toBe("hello.txt");
		expect(info.announce).toBe("https://tracker.example/announce");
		expect(info.announceList).toEqual([
			["https://t1.example/a", "https://t2.example/a"],
		]);
		expect(info.createdBy).toBe("convrtr");
		expect(info.creationDate).toBe("2024-06-07T10:00:00.000Z");
		expect(info.totalLength).toBe(11);
		expect(info.fileCount).toBe(1);
		expect(info.files).toEqual([{ path: "hello.txt", length: 11 }]);
		expect(info.isPrivate).toBe(false);
		expect(info.infoHash).toMatch(/^[0-9a-f]{40}$/);
		const magnet = magnetLink(info);
		expect(magnet.startsWith(`magnet:?xt=urn:btih:${info.infoHash}`)).toBe(
			true,
		);
		expect(magnet).toContain("dn=hello.txt");
	});

	it("emits JSON through the engine", async () => {
		expect(await torrentToJsonEngine.probe()).toBe(true);
		const file = makeTorrent();
		const out = await torrentToJsonEngine.run(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			{},
			() => {},
		);
		const parsed = JSON.parse(new TextDecoder().decode(out)) as {
			name: string;
			magnet: string;
		};
		expect(parsed.name).toBe("hello.txt");
		expect(parsed.magnet.startsWith("magnet:?")).toBe(true);
	});

	it("rejects garbage", async () => {
		await expect(
			parseTorrent(new TextEncoder().encode("nope")),
		).rejects.toThrow();
		await expect(
			parseTorrent(new TextEncoder().encode("d4:infoi1e e")),
		).rejects.toThrow();
	});
});
