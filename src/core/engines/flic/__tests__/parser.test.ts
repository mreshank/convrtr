import { describe, expect, it } from "vitest";
import { flicToGifEngine } from "..";
import { parseFlic } from "../parser";

// Hand-crafted FLI/FLC fixtures, built byte-by-byte so every sub-chunk
// decoder is exercised without depending on a vendor file we do not have.

const u16le = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff];
const u32le = (v: number): number[] => [
	v & 0xff,
	(v >> 8) & 0xff,
	(v >> 16) & 0xff,
	(v >> 24) & 0xff,
];

/** A sub-chunk whose size is rounded up to an even number, as the spec demands. */
function subChunk(type: number, payload: number[]): number[] {
	const data = payload.length % 2 === 1 ? [...payload, 0] : payload;
	return [...u32le(6 + data.length), ...u16le(type), ...data];
}

/** A full frame chunk: 16-byte header plus sub-chunks. */
function frameChunk(...subs: number[][]): number[] {
	const payload = subs.flat();
	if (payload.length % 2 === 1) payload.push(0);
	return [
		...u32le(16 + payload.length),
		...u16le(0xf1fa),
		...u16le(subs.length),
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		...payload,
	];
}

function flcHeader(
	width: number,
	height: number,
	speedMs: number,
	frames: number,
	frameBytes: number[][],
): number[] {
	const header = new Array<number>(128).fill(0);
	const put16 = (offset: number, value: number): void => {
		header[offset] = value & 0xff;
		header[offset + 1] = (value >> 8) & 0xff;
	};
	const put32 = (offset: number, value: number): void => {
		for (let i = 0; i < 4; i++) header[offset + i] = (value >> (8 * i)) & 0xff;
	};
	const totalFrameBytes = frameBytes.reduce(
		(sum, frame) => sum + frame.length,
		0,
	);
	put32(0, 128 + totalFrameBytes);
	put16(4, 0xaf12);
	put16(6, frames);
	put16(8, width);
	put16(10, height);
	put16(12, 8);
	put16(14, 0);
	put32(16, speedMs);
	put32(80, 128); // oframe1
	if (frameBytes.length > 1 && frameBytes[0]) {
		put32(84, 128 + frameBytes[0].length); // oframe2
	}
	return header;
}

function fliHeader(
	width: number,
	height: number,
	speedTicks: number,
	frames: number,
	frameBytes: number[][],
): number[] {
	const header = new Array<number>(128).fill(0);
	const put16 = (offset: number, value: number): void => {
		header[offset] = value & 0xff;
		header[offset + 1] = (value >> 8) & 0xff;
	};
	const put32 = (offset: number, value: number): void => {
		for (let i = 0; i < 4; i++) header[offset + i] = (value >> (8 * i)) & 0xff;
	};
	const totalFrameBytes = frameBytes.reduce(
		(sum, frame) => sum + frame.length,
		0,
	);
	put32(0, 128 + totalFrameBytes);
	put16(4, 0xaf11);
	put16(6, frames);
	put16(8, width);
	put16(10, height);
	put16(12, 8);
	put16(14, 0);
	put32(16, speedTicks);
	return header;
}

function toBuffer(parts: number[][]): { buffer: ArrayBuffer } {
	return { buffer: new Uint8Array(parts.flat()).buffer as ArrayBuffer };
}

const colorRun = (count: number): number[] => {
	const colors: number[] = [];
	for (let i = 0; i < count; i++) colors.push(i, i, i);
	return [...u16le(1), 0, count, ...colors];
};

describe("parseFlic", () => {
	it("decodes a full-frame FLC with a palette into indexed pixels", () => {
		// 4x2, every pixel palette index 1. Frame 0 patches the palette to
		// red/blue/green/white, frame 1 is a plain full redraw.
		const brun = (): number[] => [
			// per line: 1 packet, replicate 4 near the same colour
			1, 4, 1, 1, 4, 1,
		];
		const frame0 = frameChunk(
			subChunk(4, [
				...u16le(1),
				0,
				4,
				255,
				0,
				0,
				0,
				0,
				255,
				0,
				255,
				0,
				255,
				255,
				255,
			]),
			subChunk(15, brun()),
		);
		const frame1 = frameChunk(subChunk(15, brun()));
		const bytes = toBuffer([
			flcHeader(4, 2, 100, 2, [frame0, frame1]),
			frame0,
			frame1,
		]);

		const animation = parseFlic(bytes.buffer);
		expect(animation.kind).toBe("flc");
		expect(animation.width).toBe(4);
		expect(animation.height).toBe(2);
		expect(animation.frameDelayMs).toBe(100);
		expect(animation.frames).toHaveLength(2);

		const first = animation.frames[0] as (typeof animation.frames)[number];
		expect(first.paletteChanged).toBe(true);
		expect([...first.pixels]).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
		expect(first.palette[1]).toEqual([0, 0, 255]);
		expect(first.palette[3]).toEqual([255, 255, 255]);

		const second = animation.frames[1] as (typeof animation.frames)[number];
		expect(second.paletteChanged).toBe(false);
		expect([...second.pixels]).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
		expect(second.palette[1]).toEqual([0, 0, 255]);
	});

	it("converts FLI's 1/70s speed ticks into GIF frame delays", () => {
		// 5 ticks = 71.4ms; GIF stores hundredths of a second, so it rounds to 71.
		const frame0 = frameChunk(subChunk(13, [])); // BLACK
		const bytes = toBuffer([fliHeader(1, 1, 5, 1, [frame0]), frame0]);

		const animation = parseFlic(bytes.buffer);
		expect(animation.kind).toBe("fli");
		expect(animation.frameDelayMs).toBe(71);
		expect(animation.frames).toHaveLength(1);
	});

	it("decodes an FLC delta with word pairs and a last-pixel opcode", () => {
		// 5x2. Frame 0 clears to black and defines colours 0-9. Frame 1 delta:
		//   row 0: one word delta -> indices 7,8 at columns 0,1
		//   row 1: a last-pixel opcode (0x8009) writes index 9 at column 4
		const frame0 = frameChunk(subChunk(4, colorRun(10)), subChunk(13, []));
		// nlines=2; row0: packet count 1, skip 0, one word (7,8);
		// row1: last-pixel 0x8009 then packet count 0.
		const delta = [
			...u16le(2),
			...u16le(1),
			0,
			1,
			7,
			8,
			...u16le(0x8009),
			...u16le(0),
		];
		const frame1 = frameChunk(subChunk(7, delta));
		const bytes = toBuffer([
			flcHeader(5, 2, 100, 2, [frame0, frame1]),
			frame0,
			frame1,
		]);

		const animation = parseFlic(bytes.buffer);
		const first = animation.frames[0] as (typeof animation.frames)[number];
		expect(first.paletteChanged).toBe(true);
		const second = animation.frames[1] as (typeof animation.frames)[number];
		expect([...second.pixels]).toEqual([7, 8, 0, 0, 0, 0, 0, 0, 0, 9]);
		expect(second.paletteChanged).toBe(false);
	});

	it("decodes an FLI line delta with skip and replicate packets", () => {
		// 4x2. Frame 0 blacks out. Frame 1:
		//   row 0: copy index 5 at column 0, then skip a column and replicate
		//          index 6 across the remaining two
		//   row 1: replicate index 9 across the first two columns
		const frame0 = frameChunk(subChunk(13, []));
		const delta = [
			...u16le(0), // no lines skipped
			...u16le(2), // two lines
			2, // packets on row 0
			0,
			1,
			5, // copy 1 byte: index 5
			1,
			0xfd,
			6, // skip 1, replicate 3 x index 6
			1, // packets on row 1
			0,
			0xfe,
			9, // replicate 2 x index 9
		];
		const frame1 = frameChunk(subChunk(12, delta));
		const bytes = toBuffer([
			fliHeader(4, 2, 5, 2, [frame0, frame1]),
			frame0,
			frame1,
		]);

		const animation = parseFlic(bytes.buffer);
		const second = animation.frames[1] as (typeof animation.frames)[number];
		expect([...second.pixels]).toEqual([5, 0, 6, 6, 9, 9, 0, 0]);
	});

	it("scales the 64-colour palette variant up to 255", () => {
		const frame0 = frameChunk(
			subChunk(11, [...u16le(1), 0, 2, 63, 0, 0, 32, 16, 8]),
		);
		const bytes = toBuffer([flcHeader(1, 1, 100, 1, [frame0]), frame0]);

		const animation = parseFlic(bytes.buffer);
		const first = animation.frames[0] as (typeof animation.frames)[number];
		expect(first.palette[0]).toEqual([255, 0, 0]);
		expect(first.palette[1]).toEqual([130, 65, 32]);
	});

	it("parses a file whose header frame count is zero", () => {
		// Some encoders wrote an unusable header frame count; decoding whatever
		// frames the file actually contains should still work.
		const frame0 = frameChunk(subChunk(13, []));
		const bytes = toBuffer([fliHeader(1, 1, 5, 0, [frame0]), frame0]);
		const animation = parseFlic(bytes.buffer);
		expect(animation.frames).toHaveLength(1);
	});

	it("rejects a non-8-bit colour depth with a clear error", () => {
		const header = fliHeader(4, 4, 5, 1, []);
		// depth lives at offset 12
		header[12] = 24;
		const bytes = toBuffer([header]);
		expect(() => parseFlic(bytes.buffer)).toThrow(/24 bits/);
	});

	it("rejects bytes that are not a FLIC file", () => {
		const notFlic = new Uint8Array(128).fill(0x41);
		expect(() => parseFlic(notFlic.buffer)).toThrow(
			/neither the FLI nor the FLC magic bytes/,
		);
	});

	it("rejects a file too short to hold a FLIC header", () => {
		expect(() => parseFlic(new Uint8Array(10).buffer as ArrayBuffer)).toThrow(
			/128 bytes/,
		);
	});
});

describe("flicToGifEngine", () => {
	it("emits a GIF with the animation's dimensions and timing", async () => {
		const brun = (): number[] => [1, 3, 2, 1, 3, 2];
		const frame0 = frameChunk(
			subChunk(4, [...u16le(1), 0, 3, 0, 0, 0, 255, 0, 0, 0, 255, 0]),
			subChunk(15, brun()),
		);
		const bytes = toBuffer([flcHeader(3, 2, 120, 1, [frame0]), frame0]);

		const output = await flicToGifEngine.run(bytes.buffer, {}, () => {});
		const gif = new Uint8Array(output);
		const magic = new TextDecoder().decode(gif.slice(0, 6));
		expect(magic).toBe("GIF89a");
		// Screen descriptor: width u16 LE, height u16 LE
		expect((gif[6] ?? 0) | ((gif[7] ?? 0) << 8)).toBe(3);
		expect((gif[8] ?? 0) | ((gif[9] ?? 0) << 8)).toBe(2);
		// gifenc writes the looping NETSCAPE block for repeat.
		const text = new TextDecoder().decode(gif);
		expect(text).toContain("NETSCAPE2.0");
	});
});
