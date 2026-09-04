#!/usr/bin/env node

// Generates the PWA manifest icons (public/icons/*.png) directly from the
// app mark's own geometry — the chevron drawn by src/app/icon.svg — rather
// than shipping a placeholder or someone else's artwork.
//
// Nothing is installed to do this: the mark is a stroked two-segment
// polyline (a chevron), simple enough that its filled outline can be
// derived analytically (line-line intersection for the miter join at the
// point, offset-and-extend for the square caps at the two arms) and
// rasterised with a small supersampled point-in-polygon test. PNG encoding
// uses only Node's built-in zlib for the IDAT deflate stream — no image
// library required.
//
// This script is run once, by hand, whenever the mark changes — not on
// every build. The output is committed as an ordinary static asset.
//
// Source geometry (src/app/icon.svg, 32x32 viewBox):
//   <rect width="32" height="32" fill="#0A0A0A" />
//   <path d="M11 7 L23 16 L11 25" stroke="#FFFFFF" stroke-width="4"
//         stroke-linecap="square" stroke-linejoin="miter" />

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = join(here, "..", "public", "icons");

const MARK_GROUND = hexToRgb("#0A0A0A");
const MARK_INK = hexToRgb("#FFFFFF");

// The chevron's stroked outline, as a filled hexagon in the icon's 32x32
// viewBox coordinate space. Derived by hand from the path above:
//
//   A = (11, 7), B = (23, 16), C = (11, 25), half stroke width = 2
//
// The outline of a stroked open polyline is: a square cap at each free end
// (A and C), joined along each side by the segment's offset line, meeting
// at B via a miter join on both the convex (outer, pointed) side and the
// concave (inner, notched) side. Both miter points are plain line-line
// intersections of the offset lines through A-B and B-C — the same
// intersection formula works on both sides; which side comes out "pointed"
// vs. "notched" falls out of the geometry rather than needing a special
// case. Walking the six points below traces the outline once, in order:
// cap corner at A -> outer miter point (the sharp tip beyond B) -> cap
// corner at C -> the cap's other corner at C -> inner miter point (the
// notch, short of B) -> the cap's other corner at A -> back to start.
const CHEVRON_OUTLINE = [
	[10.6, 4.2],
	[26.333333333333332, 16],
	[10.6, 27.8],
	[8.2, 24.6],
	[19.666666666666668, 16],
	[8.2, 7.4],
];

const VIEWBOX = 32;
const VIEWBOX_CENTER = VIEWBOX / 2;

// Maskable icons get cropped to an arbitrary shape (circle, squircle, ...)
// by the OS shell, and the spec's safe zone is the centered circle covering
// 80% of the canvas (radius 0.4 * size). The unscaled chevron's farthest
// vertex is already ~12.98 units from the 16,16 center against a safe
// radius of 12.8 — effectively touching the edge — so maskable variants
// scale the mark down around the canvas center before rasterising, while
// the background rect still bleeds edge-to-edge as maskable icons expect.
const MASKABLE_ICON_SCALE = 0.75;

const TARGETS = [
	{ file: "icon-192.png", size: 192, maskable: false },
	{ file: "icon-512.png", size: 512, maskable: false },
	{ file: "icon-192-maskable.png", size: 192, maskable: true },
	{ file: "icon-512-maskable.png", size: 512, maskable: true },
];

async function main() {
	await mkdir(outDir, { recursive: true });
	for (const target of TARGETS) {
		const polygon = target.maskable
			? scalePolygon(
					CHEVRON_OUTLINE,
					MASKABLE_ICON_SCALE,
					VIEWBOX_CENTER,
					VIEWBOX_CENTER,
				)
			: CHEVRON_OUTLINE;
		const rgba = rasterize(target.size, polygon);
		const png = encodePng(rgba, target.size, target.size);
		const destination = join(outDir, target.file);
		await mkdir(dirname(destination), { recursive: true });
		await writeFile(destination, png);
		console.log(`wrote ${destination} (${target.size}x${target.size})`);
	}
}

function hexToRgb(hex) {
	const value = hex.replace("#", "");
	return [
		Number.parseInt(value.slice(0, 2), 16),
		Number.parseInt(value.slice(2, 4), 16),
		Number.parseInt(value.slice(4, 6), 16),
	];
}

function scalePolygon(polygon, scale, centerX, centerY) {
	return polygon.map(([x, y]) => [
		centerX + (x - centerX) * scale,
		centerY + (y - centerY) * scale,
	]);
}

function pointInPolygon(x, y, polygon) {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i];
		const b = polygon[j];
		if (!a || !b) continue;
		const [xi, yi] = a;
		const [xj, yj] = b;
		const crosses = yi > y !== yj > y;
		if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

// 4x4 supersampling per output pixel (16 samples) gives smooth edges on the
// chevron without needing an analytic coverage integral for a mark this
// simple.
const SUPERSAMPLE = 4;

function rasterize(size, polygon) {
	const scale = size / VIEWBOX;
	const buffer = Buffer.alloc(size * size * 4);

	for (let py = 0; py < size; py++) {
		for (let px = 0; px < size; px++) {
			let hits = 0;
			for (let sy = 0; sy < SUPERSAMPLE; sy++) {
				const sampleY = (py + (sy + 0.5) / SUPERSAMPLE) / scale;
				for (let sx = 0; sx < SUPERSAMPLE; sx++) {
					const sampleX = (px + (sx + 0.5) / SUPERSAMPLE) / scale;
					if (pointInPolygon(sampleX, sampleY, polygon)) hits++;
				}
			}
			const coverage = hits / (SUPERSAMPLE * SUPERSAMPLE);
			const idx = (py * size + px) * 4;
			buffer[idx] = lerp(MARK_GROUND[0], MARK_INK[0], coverage);
			buffer[idx + 1] = lerp(MARK_GROUND[1], MARK_INK[1], coverage);
			buffer[idx + 2] = lerp(MARK_GROUND[2], MARK_INK[2], coverage);
			buffer[idx + 3] = 255;
		}
	}
	return buffer;
}

function lerp(a, b, t) {
	return Math.round(a * (1 - t) + b * t);
}

const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c;
	}
	return table;
}

function crc32(buf) {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		const byte = buf[i] ?? 0;
		const tableEntry = CRC_TABLE[(crc ^ byte) & 0xff] ?? 0;
		crc = tableEntry ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
	const typeBuf = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
	return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(rgba, width, height) {
	const signature = Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);

	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(width, 0);
	ihdrData.writeUInt32BE(height, 4);
	ihdrData[8] = 8; // bit depth
	ihdrData[9] = 6; // color type: RGBA
	ihdrData[10] = 0; // compression method
	ihdrData[11] = 0; // filter method
	ihdrData[12] = 0; // interlace method
	const ihdr = pngChunk("IHDR", ihdrData);

	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		const rowStart = y * (stride + 1);
		raw[rowStart] = 0; // filter type: None
		rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
	}
	const idat = pngChunk("IDAT", deflateSync(raw, { level: 9 }));
	const iend = pngChunk("IEND", Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, idat, iend]);
}

main();
