/**
 * Decoder for Autodesk Animator FLI (`.fli`) and FLC (`.flc`) animations.
 *
 * FLIC is the 1990s-era DOS animation format that shipped with Autodesk
 * Animator and Animator Pro, and it was everywhere on early CD-ROMs: game
 * intros, menu loops, demo-scene intros and those first "multimedia"
 * brochures. Decades later it survives only where the original floppy or CD
 * holds it — a museum file, so no mainstream converter ever looks at it.
 *
 * The format is a sequence of frames, each a set of run-length and delta
 * sub-chunks drawn over the previous frame, with a running 256-colour palette
 * that any frame may patch. That maps almost exactly onto GIF: both are
 * indexed colour and both update a persistent palette, so the conversion can
 * be streamed colour-for-colour with no re-quantisation.
 *
 * Frame timing differs by variant. FLI's speed field counts 1/70s ticks; FLC
 * counts millisecond directly. Both become the GIF frame delay.
 *
 * Layout follows the format reference at https://www.compuphase.com/flic.htm
 * and the reference implementation at
 * https://github.com/aseprite/flic (decoder.cpp / flic_details.h).
 */

export type Rgb = [number, number, number];

/**
 * One decoded frame: a complete 8-bit indexed pixel buffer plus a snapshot of
 * the 256-colour palette in force when the frame was emitted.
 */
export type FlicFrame = {
	pixels: Uint8Array;
	palette: Rgb[];
	/**
	 * True when a colour sub-chunk ran during this frame. The GIF encoder
	 * mirrors FLIC's own behaviour: a palette change here becomes the palette
	 * that later frames keep using until the next change.
	 */
	paletteChanged: boolean;
};

export type FlicAnimation = {
	kind: "fli" | "flc";
	width: number;
	height: number;
	frames: FlicFrame[];
	frameDelayMs: number;
};

const FLI_MAGIC = 0xaf11;
const FLC_MAGIC = 0xaf12;
const FRAME_CHUNK = 0xf1fa;
const SUB_COLOR_256 = 4;
const SUB_DELTA_FLC = 7;
const SUB_COLOR_64 = 11;
const SUB_DELTA_FLI = 12;
const SUB_BLACK = 13;
const SUB_BRUN = 15;
const SUB_COPY = 16;

const MAX_DIMENSION = 4096;
const MAX_FRAMES = 2000;

function unsupportedDepthMessage(depth: number): string {
	return `This file declares a colour depth of ${depth} bits, but only the 8-bit (256 colour) variant can be converted.`;
}

function truncatedAt(offset: number): Error {
	return new Error(
		`The file ends in the middle of a structure at byte ${offset} — it is truncated.`,
	);
}

/**
 * Bounds-checked little-endian reader over a FLIC byte stream. Counted reads
 * throw rather than roll past the end of the buffer, so a truncated upload
 * surfaces as a clear error instead of silently decoding garbage.
 */
class Reader {
	private readonly view: DataView;
	private pos: number;

	constructor(bytes: Uint8Array) {
		this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		this.pos = 0;
	}

	get position(): number {
		return this.pos;
	}

	seek(offset: number): void {
		if (offset < 0 || offset > this.view.byteLength) {
			throw truncatedAt(offset);
		}
		this.pos = offset;
	}

	u8(): number {
		if (this.pos + 1 > this.view.byteLength) throw truncatedAt(this.pos);
		const value = this.view.getUint8(this.pos);
		this.pos += 1;
		return value;
	}

	i8(): number {
		if (this.pos + 1 > this.view.byteLength) throw truncatedAt(this.pos);
		const value = this.view.getInt8(this.pos);
		this.pos += 1;
		return value;
	}

	u16(): number {
		if (this.pos + 2 > this.view.byteLength) throw truncatedAt(this.pos);
		const value = this.view.getUint16(this.pos, true);
		this.pos += 2;
		return value;
	}

	i16(): number {
		if (this.pos + 2 > this.view.byteLength) throw truncatedAt(this.pos);
		const value = this.view.getInt16(this.pos, true);
		this.pos += 2;
		return value;
	}

	u32(): number {
		if (this.pos + 4 > this.view.byteLength) throw truncatedAt(this.pos);
		const value = this.view.getUint32(this.pos, true);
		this.pos += 4;
		return value;
	}
}

export function parseFlic(input: ArrayBuffer): FlicAnimation {
	const bytes = new Uint8Array(input);
	if (bytes.byteLength < 128) {
		throw new Error(
			"A FLIC file is at least 128 bytes long. This one is shorter, so it is either truncated or not a FLIC animation at all.",
		);
	}

	const reader = new Reader(bytes);
	reader.u32(); // total file size — walking chunks is safer than trusting it
	const magic = reader.u16();
	const kind: "fli" | "flc" | null =
		magic === FLI_MAGIC ? "fli" : magic === FLC_MAGIC ? "flc" : null;
	if (kind === null) {
		throw new Error(
			"This is not a FLIC file — it starts with neither the FLI nor the FLC magic bytes.",
		);
	}

	const declaredFrames = reader.u16();
	const width = reader.u16();
	const height = reader.u16();
	let depth = reader.u16();
	reader.u16(); // flags
	const speed = reader.u32();

	if (width < 1 || height < 1) {
		throw new Error(
			"This file has a zero-sized frame, so there is nothing to convert.",
		);
	}
	if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
		throw new Error(
			`This file is ${width}×${height} pixels, which is too large to animate reliably in a browser.`,
		);
	}
	// Many FLC encoders in the wild wrote 16 here while the actual data stayed
	// 8-bit indexed (the FLIC reference notes the bug); treat both as 8-bit and
	// reject everything else honestly.
	if (depth !== 8 && depth !== 16) {
		throw new Error(unsupportedDepthMessage(depth));
	}
	depth = 8;

	// Timing: FLI's speed counts 1/70s ticks, FLC counts milliseconds.
	// Animator used 5-6 ticks (70-85ms) as a comfortable FLI default; a zero
	// field means "use the default".
	const rawMs =
		kind === "fli"
			? Number(speed) > 0
				? Math.round((Number(speed) * 1000) / 70)
				: 70
			: Number(speed) > 0
				? Number(speed)
				: 70;
	const frameDelayMs = Math.max(10, Math.min(65535, rawMs));

	// FLC can place its first frame anywhere via oframe1 (some files put a
	// PREFIX chunk before the animation). FLI has no such field and begins at
	// offset 128.
	let startOffset = 128;
	if (kind === "flc") {
		reader.seek(80);
		const oframe1 = reader.u32();
		if (oframe1 > 0) startOffset = oframe1;
	}

	const widthPixels = width;
	const heightPixels = height;
	const pixels = new Uint8Array(widthPixels * heightPixels);
	const palette: Rgb[] = Array.from({ length: 256 }, () => [0, 0, 0]);
	const frames: FlicFrame[] = [];
	let paletteChanged = false;

	// Walk top-level chunks from the animation's first frame. Anything that is
	// not a frame chunk (PREFIX, segment table, padding) is skipped by its own
	// size, so a file with odd ring frames still decodes in order.
	let cursor = startOffset;
	while (frames.length < MAX_FRAMES && cursor + 6 <= bytes.byteLength) {
		reader.seek(cursor);
		const frameSize = reader.u32();
		const frameType = reader.u16();
		if (frameSize < 6 || cursor + frameSize > bytes.byteLength) {
			throw new Error(
				`A chunk at byte ${cursor} overruns the end of the file — it is truncated.`,
			);
		}
		if (frameType === FRAME_CHUNK) {
			// The frame header is size(4) + type(2) + chunks(2) + pad(8). The
			// first two fields were read in this loop, so continue past the
			// chunk count and pad, then hand the sub-chunks to the decoder.
			const chunkCount = reader.u16();
			reader.seek(cursor + 16);
			const frameEnd = cursor + frameSize;
			decodeFrame(
				reader,
				chunkCount,
				frameEnd,
				pixels,
				palette,
				widthPixels,
				heightPixels,
				(changed) => {
					if (changed) paletteChanged = true;
				},
			);
			frames.push({
				pixels: pixels.slice(),
				palette: palette.map((entry) => entry.slice() as Rgb),
				paletteChanged,
			});
			paletteChanged = false;
		}
		cursor += frameSize;
		// A second pass over the same ring is a corrupt file, not looping frames.
		if (cursor > startOffset + bytes.byteLength) break;
	}

	if (frames.length === 0) {
		throw new Error("No animation frames were found in this file.");
	}
	// Some encoders wrote a stale frame count (the header carries two), so a
	// shortfall is worth a warning rather than a hard failure — but a file that
	// claims more frames than the browser can hold is a real refusal.
	if (declaredFrames > MAX_FRAMES) {
		throw new Error(
			`This animation contains ${declaredFrames} frames, and ${MAX_FRAMES} is the most that fits in memory. Animations this long are better re-saved from their source project.`,
		);
	}

	return { kind, width, height, frames, frameDelayMs };
}

function decodeFrame(
	reader: Reader,
	chunkCount: number,
	frameEnd: number,
	pixels: Uint8Array,
	palette: Rgb[],
	width: number,
	height: number,
	reportPaletteChange: (changed: boolean) => void,
): void {
	for (let i = 0; i < chunkCount; i++) {
		if (reader.position >= frameEnd) break;
		const subStart = reader.position;
		const subSize = reader.u32();
		const subType = reader.u16();
		if (subSize < 6 || subStart + subSize > frameEnd) {
			throw new Error(
				`A sub-chunk at byte ${subStart} overruns its frame — the file is damaged.`,
			);
		}
		reportPaletteChange(
			decodeSubChunk(reader, subType, pixels, palette, width, height),
		);
		// Recentre on the declared boundary: chunk padding is legal and must not
		// be mistaken for the next sub-chunk's size field.
		reader.seek(subStart + subSize);
	}
}

function decodeSubChunk(
	reader: Reader,
	type: number,
	pixels: Uint8Array,
	palette: Rgb[],
	width: number,
	height: number,
): boolean {
	switch (type) {
		case SUB_COLOR_256:
		case SUB_COLOR_64: {
			const is64 = type === SUB_COLOR_64;
			let packets = reader.u16();
			let index = 0;
			while (packets-- > 0 && index < 256) {
				index += reader.u8(); // colours to leave untouched
				let count = reader.u8();
				if (count === 0) count = 256; // full run
				while (count-- > 0 && index < 256) {
					const r = reader.u8();
					const g = reader.u8();
					const b = reader.u8();
					palette[index] = is64
						? [
								Math.min(255, Math.round((r * 255) / 63)),
								Math.min(255, Math.round((g * 255) / 63)),
								Math.min(255, Math.round((b * 255) / 63)),
							]
						: [r, g, b];
					index += 1;
				}
			}
			return true;
		}

		case SUB_BLACK: // clear the whole frame
			pixels.fill(0);
			return false;

		case SUB_COPY: // raw scanline bytes
			for (let i = 0; i < pixels.length; i++) pixels[i] = reader.u8();
			return false;

		case SUB_BRUN: {
			for (let y = 0; y < height; y++) {
				let packets = reader.u8();
				// A zero packet count means "emit until the width is filled".
				const openEnded = packets === 0;
				let x = 0;
				while ((openEnded || packets-- > 0) && x < width) {
					const count = reader.i8();
					if (count >= 0) {
						const color = reader.u8();
						let left = count;
						while (left-- > 0 && x < width) {
							pixels[y * width + x] = color;
							x += 1;
						}
					} else {
						let left = -count;
						while (left-- > 0 && x < width) {
							pixels[y * width + x] = reader.u8();
							x += 1;
						}
					}
				}
			}
			return false;
		}

		case SUB_DELTA_FLI: {
			// Lines are addressed absolutely, and unchanged lines before the
			// first packet are skipped wholesale.
			const skipLines = reader.u16();
			let lines = reader.u16();
			for (let y = skipLines; lines-- > 0 && y < height; y += 1) {
				let packets = reader.u8();
				const row = y * width;
				let x = 0;
				while (packets-- > 0 && x < width) {
					x += reader.u8(); // skip untouched pixels
					if (x >= width) break;
					const count = reader.i8();
					if (count >= 0) {
						let left = count;
						while (left-- > 0 && x < width) {
							pixels[row + x] = reader.u8();
							x += 1;
						}
					} else {
						const color = reader.u8();
						let left = -count;
						while (left-- > 0 && x < width) {
							pixels[row + x] = color;
							x += 1;
						}
					}
				}
			}
			return false;
		}

		case SUB_DELTA_FLC: {
			// Line addressing is relative via opcodes: a packet count, a "skip
			// N lines" code (both high bits set), or a "last pixel of the line"
			// code (high bit only). Words hold two pixel indices each.
			let lines = reader.u16();
			let y = 0;
			while (lines-- > 0 && y < height) {
				let packets = 0;
				let belowFrame = false;
				while (true) {
					const word = reader.i16();
					if (word >= 0) {
						packets = word;
						break;
					}
					if (word & 0x4000) {
						y += -word; // skip lines that are unchanged
						if (y >= height) {
							belowFrame = true;
							break;
						}
					} else if (width > 0) {
						pixels[y * width + (width - 1)] = word & 0xff;
					}
				}
				if (belowFrame) break;
				const row = y * width;
				let x = 0;
				while (packets-- > 0) {
					x += reader.u8();
					const count = reader.i8();
					if (count >= 0) {
						let left = count;
						while (left-- > 0 && x < width) {
							const c1 = reader.u8();
							const c2 = reader.u8();
							pixels[row + x] = c1;
							x += 1;
							if (x < width) {
								pixels[row + x] = c2;
								x += 1;
							}
						}
					} else {
						const c1 = reader.u8();
						const c2 = reader.u8();
						let left = -count;
						while (left-- > 0 && x < width) {
							pixels[row + x] = c1;
							x += 1;
							if (x < width) {
								pixels[row + x] = c2;
								x += 1;
							}
						}
					}
				}
				y += 1;
			}
			return false;
		}

		default:
			// Unknown sub-chunks (stamps, sound, future extensions) are skipped
			// by the caller's recentre on the declared size.
			return false;
	}
}
