import { describe, expect, it } from "vitest";
import { stlToSrtEngine } from "../index";
import { convertStlToSrt, parseStl } from "../parser";

function ebuStl(
	cues: Array<{
		start: [number, number, number, number];
		end: [number, number, number, number];
		text: Uint8Array;
	}>,
): Uint8Array {
	const gsi = new Uint8Array(1024);
	const enc = new TextEncoder();
	enc.encodeInto("STL25.01", gsi.subarray(0, 8)); // CPN + DFC="25"
	const blocks: Uint8Array[] = [];
	let sn = 0;
	for (const cue of cues) {
		const tti = new Uint8Array(128);
		tti[0] = 0x00; // SGN
		tti[1] = sn++; // SN
		tti[2] = 0x00; // EBN: last
		tti[3] = 0x00; // CS
		tti.set(cue.start, 4);
		tti.set(cue.end, 8);
		tti[12] = 0x00; // VP first row
		tti[13] = 0x02; // JC centre
		tti[14] = 0x00; // CF
		tti.set(cue.text.subarray(0, 112), 16);
		blocks.push(tti);
	}
	const out = new Uint8Array(1024 + blocks.length * 128);
	out.set(gsi, 0);
	for (const [i, b] of blocks.entries()) {
		if (b) out.set(b, 1024 + i * 128);
	}
	return out;
}

const ascii = (s: string): Uint8Array => new TextEncoder().encode(s);

const SPRUCE = `// Spruce export
$FontName = Arial
00:00:13:05,00:00:16:20,First line|Second line
00:00:18:00,00:00:20:00,Solo
`;

describe("STL subtitle Parser & Engine", () => {
	it("decodes EBU binary cues with row breaks", () => {
		const text = new Uint8Array([
			...ascii("Cafe "),
			0x8a, // EBU row break
			...ascii("Line two"),
		]);
		const file = ebuStl([{ start: [0, 0, 13, 5], end: [0, 0, 16, 20], text }]);
		const cues = parseStl(file);
		expect(cues).toHaveLength(1);
		expect(cues[0]?.startMs).toBe(13200); // (13*25+5)/25 s @25fps
		expect(cues[0]?.endMs).toBe(16800);
		expect(cues[0]?.text).toBe("Cafe\nLine two");
	});

	it("resolves combining diacritics to precomposed characters", () => {
		// 0xC2 (acute) + 'e' must render as é
		const text = new Uint8Array([...ascii("caf"), 0xc2, 0x65]);
		const file = ebuStl([{ start: [0, 0, 1, 0], end: [0, 0, 3, 0], text }]);
		const cues = parseStl(file);
		expect(cues[0]?.text).toBe("caf\u00e9");
	});

	it("parses Spruce text with pipe row separators", () => {
		const cues = parseStl(new TextEncoder().encode(SPRUCE));
		expect(cues).toHaveLength(2);
		expect(cues[0]?.startMs).toBe(13200);
		expect(cues[0]?.text).toBe("First line\nSecond line");
	});

	it("emits numbered SRT through the engine", async () => {
		expect(await stlToSrtEngine.probe()).toBe(true);
		const file = ebuStl([
			{ start: [0, 1, 0, 0], end: [0, 1, 2, 0], text: ascii("Hello") },
		]);
		const out = await convertStlToSrt(
			file.buffer.slice(
				file.byteOffset,
				file.byteOffset + file.byteLength,
			) as ArrayBuffer,
			() => {},
		);
		const srt = new TextDecoder().decode(out);
		expect(srt).toBe("1\n00:01:00,000 --> 00:01:02,000\nHello\n\n");
	});

	it("rejects tiny non-subtitle files", () => {
		expect(() => parseStl(new Uint8Array([1, 2, 3]))).toThrow(
			"Too small for EBU STL",
		);
	});
});
