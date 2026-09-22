import { encodeRgbaToPng } from "../dds/parser";

export interface PsdImage {
	width: number;
	height: number;
	rgba: Uint8Array;
	layerCount: number;
	simplified: boolean;
}

const MAX_PIXELS = 50_000_000;

class Cursor {
	off = 0;
	constructor(private readonly buf: Uint8Array) {}
	get view(): DataView {
		return new DataView(
			this.buf.buffer,
			this.buf.byteOffset,
			this.buf.byteLength,
		);
	}
	u8(): number {
		return this.buf[this.off++] ?? 0;
	}
	u16(): number {
		const v = this.view.getUint16(this.off, false);
		this.off += 2;
		return v;
	}
	i16(): number {
		const v = this.view.getInt16(this.off, false);
		this.off += 2;
		return v;
	}
	u32(): number {
		const v = this.view.getUint32(this.off, false);
		this.off += 4;
		return v;
	}
	i32(): number {
		const v = this.view.getInt32(this.off, false);
		this.off += 4;
		return v;
	}
	take(n: number): Uint8Array {
		const s = this.buf.subarray(this.off, this.off + n);
		this.off += n;
		return s;
	}
	skip(n: number): void {
		this.off += n;
	}
	ascii(n: number): string {
		return new TextDecoder("ascii").decode(this.take(n));
	}
	get remaining(): number {
		return this.buf.length - this.off;
	}
}

function unpackPackBitsRow(src: Uint8Array, expected: number): Uint8Array {
	const out = new Uint8Array(expected);
	let si = 0;
	let di = 0;
	while (si < src.length && di < expected) {
		const n = src[si++] ?? 0;
		if (n <= 127) {
			const count = n + 1;
			for (let k = 0; k < count && di < expected && si < src.length; k++) {
				out[di++] = src[si++] ?? 0;
			}
		} else if (n >= 129) {
			const count = 257 - n;
			const val = src[si++] ?? 0;
			for (let k = 0; k < count && di < expected; k++) out[di++] = val;
		}
		// n === 128: no-op.
	}
	return out;
}

interface ChannelPlane {
	id: number;
	data: Uint8Array;
}

/** Reads + validates one compression code, shared by raw/RLE paths. */
function readCompression(cur: Cursor): number {
	const compression = cur.u16();
	if (compression !== 0 && compression !== 1) {
		throw new Error(
			compression === 2 || compression === 3
				? "ZIP-compressed image data is not supported — re-save with RLE or raw compression."
				: `Unsupported image compression (${compression}).`,
		);
	}
	return compression;
}

/**
 * Decodes one channel plane (raw or RLE rows) of w×h bytes.
 * NOTE: layer channels each carry their own compression field, but the
 * trailing merged composite carries ONE field for all planes — callers
 * must use readCompression + decodePlaneData for that section.
 */
function decodePlane(cur: Cursor, w: number, h: number): Uint8Array {
	return decodePlaneData(cur, w, h, readCompression(cur));
}

function decodePlaneData(
	cur: Cursor,
	w: number,
	h: number,
	compression: number,
): Uint8Array {
	const out = new Uint8Array(w * h);
	if (compression === 0) {
		out.set(cur.take(w * h).subarray(0, w * h));
		return out;
	}
	const rowLens: number[] = [];
	for (let y = 0; y < h; y++) rowLens.push(cur.u16());
	let di = 0;
	for (let y = 0; y < h; y++) {
		const len = rowLens[y] ?? 0;
		const row = unpackPackBitsRow(cur.take(len), w);
		out.set(row, di);
		di += w;
	}
	return out;
}

interface RawLayer {
	left: number;
	top: number;
	width: number;
	height: number;
	opacity: number;
	blend: string;
	planes: ChannelPlane[];
}

/**
 * Parses an Adobe Photoshop (`.psd`/`.psb`-layout) file into flat RGBA.
 *
 * Pure TypeScript, no canvas: header validation (8BPS, depth 8 only),
 * gray/indexed/RGB modes, RLE + raw channel decoding, and a simplified
 * compositor (normal blending × opacity, bottom-up, hidden layers skipped).
 * Complex blend modes, clipping masks, adjustment layers and effects are
 * flattened as normal layers — stated on the tool page, matching what every
 * lightweight PSD reader does. CMYK/Lab/16-bit and ZIP compression fail
 * with specific errors instead of wrong pixels.
 */
export function parsePsd(fileBytes: Uint8Array): PsdImage {
	const cur = new Cursor(fileBytes);
	if (fileBytes.length < 26)
		throw new Error("Invalid PSD file: smaller than the 26-byte header.");
	if (cur.ascii(4) !== "8BPS")
		throw new Error("Invalid PSD file: missing 8BPS signature.");
	if (cur.u16() !== 1) throw new Error("Unsupported PSD version (expected 1).");
	cur.skip(6);
	const channels = cur.u16();
	const height = cur.u32();
	const width = cur.u32();
	const depth = cur.u16();
	const colorMode = cur.u16();

	if (depth !== 8) {
		throw new Error(
			`Only 8-bit PSDs are supported (this file is ${depth}-bit).`,
		);
	}
	if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) {
		throw new Error(`Unusable PSD dimensions ${width}x${height}.`);
	}
	if (colorMode !== 1 && colorMode !== 2 && colorMode !== 3) {
		const names: Record<number, string> = {
			0: "bitmap",
			4: "CMYK",
			7: "multichannel",
			8: "duotone",
			9: "Lab",
		};
		throw new Error(
			`${names[colorMode] ?? `color mode ${colorMode}`} PSDs are not supported (gray, indexed and RGB are).`,
		);
	}

	// Colour mode data (holds the 768-byte palette for indexed colour).
	const colorLen = cur.u32();
	let palette: Uint8Array | null = null;
	if (colorMode === 2) {
		if (colorLen < 768)
			throw new Error("Indexed PSD is missing its 768-byte palette.");
		palette = cur.take(768);
	} else {
		cur.skip(colorLen);
	}

	// Image resources (skipped: resolution, guides, thumbnails…).
	cur.skip(cur.u32());

	// Layer and mask information (absent entirely when the length is 0,
	// as Photoshop writes for flat files — do not read past it).
	const layerSectionLen = cur.u32();
	const layerSectionEnd = cur.off + layerSectionLen;
	const layers: RawLayer[] = [];
	let simplified = false;

	const layerInfoLen = layerSectionLen > 0 ? cur.u32() : 0;

	if (layerInfoLen > 0) {
		let layerCount = cur.i16();
		if (layerCount < 0) layerCount = -layerCount;
		interface PendingLayer {
			left: number;
			top: number;
			width: number;
			height: number;
			opacity: number;
			hidden: boolean;
			chIds: number[];
			chLens: number[];
		}
		const pending: PendingLayer[] = [];
		for (let li = 0; li < layerCount; li++) {
			const top = cur.i32();
			const left = cur.i32();
			const bottom = cur.i32();
			const right = cur.i32();
			const chCount = cur.u16();
			const chIds: number[] = [];
			const chLens: number[] = [];
			for (let c = 0; c < chCount; c++) {
				chIds.push(cur.i16());
				chLens.push(cur.u32());
			}
			const blendSig = cur.ascii(4);
			const blend = cur.ascii(4);
			const opacity = cur.u8();
			const clipping = cur.u8();
			const flags = cur.u8();
			cur.u8(); // filler
			if (blendSig !== "8BIM")
				throw new Error("Corrupt PSD layer record (bad blend signature).");
			cur.skip(cur.u32()); // extra data (masks, ranges, name…)
			if (blend !== "norm" && blend !== "pass") simplified = true;
			if (clipping !== 0) simplified = true;
			pending.push({
				left,
				top,
				width: Math.max(0, right - left),
				height: Math.max(0, bottom - top),
				opacity,
				hidden: (flags & 0x02) !== 0,
				chIds,
				chLens,
			});
		}
		// Channel image data follows ALL records, in layer order.
		for (const p of pending) {
			const planes: ChannelPlane[] = [];
			const usable = !p.hidden && p.width > 0 && p.height > 0;
			for (let c = 0; c < p.chIds.length; c++) {
				const id = p.chIds[c] ?? 0;
				const keep = usable && (id === -1 || id === 0 || id === 1 || id === 2);
				if (keep) {
					planes.push({ id, data: decodePlane(cur, p.width, p.height) });
				} else {
					// Skip by the recorded data length (includes compression bytes).
					cur.skip(p.chLens[c] ?? 0);
				}
			}
			if (usable && planes.length > 0) {
				layers.push({
					left: p.left,
					top: p.top,
					width: p.width,
					height: p.height,
					opacity: p.opacity,
					blend: "norm",
					planes,
				});
			}
		}
	}
	cur.off = layerSectionEnd;

	const rgba = new Uint8Array(width * height * 4);

	if (layers.length > 0) {
		// File order is top-first: paint in reverse so the bottom layer lands first.
		for (let li = layers.length - 1; li >= 0; li--) {
			const layer = layers[li];
			if (!layer) continue;
			paintLayer(rgba, width, height, layer, colorMode, palette);
		}
	} else {
		// Flattened file: ONE compression field governs every plane, then
		// channel data back-to-back (for RLE: all planes' row tables first).
		const planeCount = colorMode === 1 ? 1 : channels >= 3 ? 3 : channels;
		const compression = readCompression(cur);
		const planes: Uint8Array[] = [];
		if (compression === 1) {
			const tables: number[][] = [];
			for (let c = 0; c < planeCount; c++) {
				const lens: number[] = [];
				for (let y = 0; y < height; y++) lens.push(cur.u16());
				tables.push(lens);
			}
			for (let c = 0; c < planeCount; c++) {
				const out = new Uint8Array(width * height);
				let di = 0;
				for (let y = 0; y < height; y++) {
					const row = unpackPackBitsRow(cur.take(tables[c]?.[y] ?? 0), width);
					out.set(row, di);
					di += width;
				}
				planes.push(out);
			}
		} else {
			for (let c = 0; c < planeCount; c++)
				planes.push(decodePlaneData(cur, width, height, 0));
		}
		for (let i = 0; i < width * height; i++) {
			if (colorMode === 1) {
				const g = planes[0]?.[i] ?? 0;
				rgba[i * 4] = g;
				rgba[i * 4 + 1] = g;
				rgba[i * 4 + 2] = g;
				rgba[i * 4 + 3] = 255;
			} else if (colorMode === 2 && palette) {
				const idx = planes[0]?.[i] ?? 0;
				rgba[i * 4] = palette[idx * 3] ?? 0;
				rgba[i * 4 + 1] = palette[idx * 3 + 1] ?? 0;
				rgba[i * 4 + 2] = palette[idx * 3 + 2] ?? 0;
				rgba[i * 4 + 3] = 255;
			} else {
				rgba[i * 4] = planes[0]?.[i] ?? 0;
				rgba[i * 4 + 1] = planes[1]?.[i] ?? 0;
				rgba[i * 4 + 2] = planes[2]?.[i] ?? 0;
				rgba[i * 4 + 3] = 255;
			}
		}
	}

	return { width, height, rgba, layerCount: layers.length, simplified };
}

function planeOf(layer: RawLayer, id: number): Uint8Array | null {
	return layer.planes.find((p) => p.id === id)?.data ?? null;
}

function paintLayer(
	canvas: Uint8Array,
	canvasW: number,
	canvasH: number,
	layer: RawLayer,
	colorMode: number,
	palette: Uint8Array | null,
): void {
	const alpha = planeOf(layer, -1);
	const chan0 = planeOf(layer, 0);
	const chan1 = planeOf(layer, 1);
	const chan2 = planeOf(layer, 2);
	const opacity = (layer.opacity === 255 ? 255 : layer.opacity) / 255;

	for (let ly = 0; ly < layer.height; ly++) {
		const gy = layer.top + ly;
		if (gy < 0 || gy >= canvasH) continue;
		for (let lx = 0; lx < layer.width; lx++) {
			const gx = layer.left + lx;
			if (gx < 0 || gx >= canvasW) continue;
			const i = ly * layer.width + lx;
			let r: number;
			let g: number;
			let b: number;
			if (colorMode === 1) {
				r = g = b = chan0?.[i] ?? 0;
			} else if (colorMode === 2 && palette) {
				const idx = chan0?.[i] ?? 0;
				r = palette[idx * 3] ?? 0;
				g = palette[idx * 3 + 1] ?? 0;
				b = palette[idx * 3 + 2] ?? 0;
			} else {
				r = chan0?.[i] ?? 0;
				g = chan1?.[i] ?? r;
				b = chan2?.[i] ?? r;
			}
			const a = ((alpha?.[i] ?? 255) / 255) * opacity;
			if (a <= 0) continue;
			const o = (gy * canvasW + gx) * 4;
			const dstA = (canvas[o + 3] ?? 0) / 255;
			const outA = a + dstA * (1 - a);
			if (outA <= 0) continue;
			canvas[o] = Math.round(
				(r * a + (canvas[o] ?? 0) * dstA * (1 - a)) / outA,
			);
			canvas[o + 1] = Math.round(
				(g * a + (canvas[o + 1] ?? 0) * dstA * (1 - a)) / outA,
			);
			canvas[o + 2] = Math.round(
				(b * a + (canvas[o + 2] ?? 0) * dstA * (1 - a)) / outA,
			);
			canvas[o + 3] = Math.round(outA * 255);
		}
	}
}

export function convertPsdToPng(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading PSD structure...");
	const image = parsePsd(new Uint8Array(input));
	onProgress?.(0.6, `Flattening ${image.layerCount} layers...`);
	const png = encodeRgbaToPng(image.width, image.height, image.rgba);
	onProgress?.(1.0, "Complete");
	const buf = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength);
	return buf as ArrayBuffer;
}
