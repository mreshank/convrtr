#!/usr/bin/env node

/**
 * Generates Chrome extension icons (16, 32, 48, 128 px)
 * directly from the convrtr chevron geometry.
 * Self-contained zero-dependency PNG encoder using Node's zlib.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = join(here, "..", "src", "extension", "icons");

const MARK_GROUND = hexToRgb("#000000");
const MARK_INK = hexToRgb("#FFFFFF");

const CHEVRON_OUTLINE = [
	[10.6, 4.2],
	[26.333333333333332, 16],
	[10.6, 27.8],
	[8.2, 24.6],
	[19.666666666666668, 16],
	[8.2, 7.4],
];

const VIEWBOX = 32;

const TARGETS = [
	{ file: "icon-16.png", size: 16 },
	{ file: "icon-32.png", size: 32 },
	{ file: "icon-48.png", size: 48 },
	{ file: "icon-128.png", size: 128 },
];

export async function generateExtensionIcons() {
	await mkdir(outDir, { recursive: true });
	for (const target of TARGETS) {
		const rgba = rasterize(target.size, CHEVRON_OUTLINE);
		const png = encodePng(rgba, target.size, target.size);
		const destination = join(outDir, target.file);
		await mkdir(dirname(destination), { recursive: true });
		await writeFile(destination, png);
		console.log(
			`Generated extension icon: ${destination} (${target.size}x${target.size})`,
		);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	generateExtensionIcons().catch((err) => {
		console.error("Failed to generate extension icons:", err);
		process.exit(1);
	});
}
