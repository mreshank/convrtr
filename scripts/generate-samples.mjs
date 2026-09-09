#!/usr/bin/env node

// Generates the demo sample files (public/samples/*) that `LiveDemo` runs a
// real conversion over.
//
// This project's whole claim is that a file never leaves the device, so a
// sample cannot be *fetched* from anywhere — and a binary of unknown
// provenance presented as a sample is exactly the fabrication the product
// forbids. Instead every sample is written from raw data, the same way
// `generate-icons.mjs` writes the PWA icons: PNG encoding uses only Node's
// built-in zlib for the IDAT deflate stream, and WAV is a RIFF header
// wrapped around synthesised PCM samples. No image or audio library is
// installed to do this, and nothing is fetched.
//
// The two samples exist because they are the two formats this can honestly
// generate, and they were chosen to match one real tool from each of the
// two collectives that demo them:
//
//   podcast-clip.wav  -- a quiet mono tone, fed to `audio/normalise-wav`
//                        (podcast-kit's demo). Quiet on purpose: normalising
//                        to a louder target only proves something if the
//                        source is not already there.
//   tagged-photo.png  -- a small gradient carrying real tEXt/tIME chunks,
//                        fed to `image/remove-metadata-png` (strip-metadata's
//                        demo). The chunks exist so the demo has metadata to
//                        actually remove, not an empty file pretending to.
//
// Run once, by hand, whenever a sample needs to change -- not on every
// build. The output is committed as an ordinary static asset, so the build
// never depends on this script running. `src/content/samples/registry.ts`
// records each file's real on-disk size, and its own test
// (`__tests__/registry.test.ts`) fails if that number ever drifts from the
// file, and separately decodes both files with the app's own real decoders
// (`@jsquash/png/decode`, `core/engines/audio/wav.ts`'s `parseWav`) and runs
// the real `metadata:strip-png` engine over the PNG -- so a plausible-looking
// header that no decoder actually accepts cannot pass silently.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = join(here, "..", "public", "samples");

async function main() {
	await mkdir(outDir, { recursive: true });

	const wav = encodeWav(synthesiseTone());
	await writeFile(join(outDir, "podcast-clip.wav"), wav);
	console.log(`wrote public/samples/podcast-clip.wav (${wav.length} bytes)`);

	const png = encodeTaggedPng(synthesiseGradient(200, 120));
	await writeFile(join(outDir, "tagged-photo.png"), png);
	console.log(`wrote public/samples/tagged-photo.png (${png.length} bytes)`);
}

// --- WAV -------------------------------------------------------------

const SAMPLE_RATE = 22050;
const DURATION_SECONDS = 1;
const TONE_HZ = 440; // A4 -- an arbitrary, recognisable pitch
// Quiet on purpose (roughly -20.7dBFS peak): normalise-wav's default
// "Streaming (-14 LUFS)" preset only demonstrates a real gain change if the
// source starts well below that target.
const PEAK_AMPLITUDE = 3000;

function synthesiseTone() {
	const count = Math.round(SAMPLE_RATE * DURATION_SECONDS);
	const samples = new Int16Array(count);
	for (let i = 0; i < count; i++) {
		samples[i] = Math.round(
			PEAK_AMPLITUDE * Math.sin((2 * Math.PI * TONE_HZ * i) / SAMPLE_RATE),
		);
	}
	return samples;
}

/** A plain-PCM mono WAV -- the exact shape `core/engines/audio/wav.ts` reads. */
function encodeWav(samples) {
	const bitsPerSample = 16;
	const channels = 1;
	const bytesPerSample = bitsPerSample / 8;
	const blockAlign = channels * bytesPerSample;
	const dataSize = samples.length * bytesPerSample;
	const buffer = Buffer.alloc(44 + dataSize);

	buffer.write("RIFF", 0, "ascii");
	buffer.writeUInt32LE(36 + dataSize, 4);
	buffer.write("WAVE", 8, "ascii");
	buffer.write("fmt ", 12, "ascii");
	buffer.writeUInt32LE(16, 16); // PCM fmt chunk size
	buffer.writeUInt16LE(1, 20); // format = PCM
	buffer.writeUInt16LE(channels, 22);
	buffer.writeUInt32LE(SAMPLE_RATE, 24);
	buffer.writeUInt32LE(SAMPLE_RATE * blockAlign, 28);
	buffer.writeUInt16LE(blockAlign, 32);
	buffer.writeUInt16LE(bitsPerSample, 34);
	buffer.write("data", 36, "ascii");
	buffer.writeUInt32LE(dataSize, 40);
	for (let i = 0; i < samples.length; i++) {
		buffer.writeInt16LE(samples[i] ?? 0, 44 + i * 2);
	}
	return buffer;
}

// --- PNG -------------------------------------------------------------

/** A deterministic RGBA gradient -- a pattern, not a photograph, and not
 * pretending to be one. */
function synthesiseGradient(width, height) {
	const rgba = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const nx = x / (width - 1);
			const ny = y / (height - 1);
			const idx = (y * width + x) * 4;
			rgba[idx] = Math.round(255 * nx);
			rgba[idx + 1] = Math.round(255 * ny);
			rgba[idx + 2] = Math.round(
				255 * (0.5 + 0.5 * Math.sin((nx + ny) * Math.PI * 3)),
			);
			rgba[idx + 3] = 255;
		}
	}
	return { rgba, width, height };
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

/** keyword\0text, both Latin-1 -- the tEXt chunk body per the PNG spec. */
function textChunk(keyword, text) {
	return pngChunk(
		"tEXt",
		Buffer.concat([
			Buffer.from(keyword, "latin1"),
			Buffer.from([0]),
			Buffer.from(text, "latin1"),
		]),
	);
}

/** A fixed date, not `Date.now()` -- the whole point is a byte-identical
 * file on every run, so the registry's recorded size never drifts. */
function fixedTimeChunk() {
	const data = Buffer.alloc(7);
	data.writeUInt16BE(2024, 0); // year
	data[2] = 1; // month
	data[3] = 1; // day
	data[4] = 0; // hour
	data[5] = 0; // minute
	data[6] = 0; // second
	return pngChunk("tIME", data);
}

/**
 * A PNG that genuinely carries the metadata `image/remove-metadata-png`
 * removes -- two tEXt chunks and a tIME chunk -- ahead of its pixel data, so
 * the live demo has something real to strip rather than an empty gesture.
 */
function encodeTaggedPng({ rgba, width, height }) {
	const signature = Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);

	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(width, 0);
	ihdrData.writeUInt32BE(height, 4);
	ihdrData[8] = 8; // bit depth
	ihdrData[9] = 6; // colour type: RGBA
	ihdrData[10] = 0;
	ihdrData[11] = 0;
	ihdrData[12] = 0;
	const ihdr = pngChunk("IHDR", ihdrData);

	const software = textChunk(
		"Software",
		"convrtr sample generator (scripts/generate-samples.mjs)",
	);
	const comment = textChunk(
		"Comment",
		"Deterministic sample data, not a real photograph.",
	);
	const time = fixedTimeChunk();

	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) {
		const rowStart = y * (stride + 1);
		raw[rowStart] = 0; // filter type: None
		rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
	}
	const idat = pngChunk("IDAT", deflateSync(raw, { level: 9 }));
	const iend = pngChunk("IEND", Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, software, comment, time, idat, iend]);
}

main();
