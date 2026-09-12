import { writeWav } from "../audio/wav";
import type {
	FarConversionOptions,
	FarConversionResult,
	FarMetadata,
	FarSampleInfo,
} from "./types";

interface InternalFarSample {
	info: FarSampleInfo;
	pcmData: Float32Array;
}

interface FarChannelState {
	sample?: InternalFarSample;
	samplePos: number;
	step: number;
	volume: number;
	panning: number; // 0..1 (0=left, 0.5=center, 1=right)
}

/**
 * Parses Farandole Composer (.far) tracker files and synthesizes multi-channel
 * chiptune audio into 16-bit 44.1kHz stereo WAV.
 */
export function convertFarToWav(
	input: ArrayBuffer | Uint8Array,
	options: FarConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): FarConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 100) {
		throw new Error(
			"Invalid FAR file: File size is smaller than the minimum 100-byte Farandole header.",
		);
	}

	// Verify magic signature: "FAR\xFE" at offset 0
	if (
		bytes[0] !== 0x46 || // 'F'
		bytes[1] !== 0x41 || // 'A'
		bytes[2] !== 0x52 || // 'R'
		(bytes[3] !== 0xfe && bytes[3] !== 0x1b && bytes[3] !== 0x0d)
	) {
		throw new Error(
			"Invalid FAR file: Missing 'FAR\\xFE' magic identifier at offset 0.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Song name: 40 bytes at offset 4
	let nameEnd = 4;
	while (nameEnd < 44 && bytes[nameEnd] !== 0) {
		nameEnd++;
	}
	const songTitle =
		new TextDecoder("ascii").decode(bytes.subarray(4, nameEnd)).trim() ||
		"Untitled FAR Module";

	const version = bytes[47] ?? 0x10;

	// Channels state (16 bytes at offset 48)
	const channelPannings: number[] = [];
	for (let ch = 0; ch < 16; ch++) {
		const rawPan = bytes[75 + ch] ?? 8;
		// 0..15 -> 0.0 .. 1.0 (8 is center)
		const panVal = Math.min(1.0, Math.max(0.0, rawPan / 15));
		channelPannings.push(panVal);
	}

	// Song message length
	const textLength = view.getUint16(95, true);
	let message = "";
	let cursor = 97;
	if (textLength > 0 && cursor + textLength <= bytes.length) {
		message = new TextDecoder("ascii")
			.decode(bytes.subarray(cursor, cursor + textLength))
			.trim();
		cursor += textLength;
	}

	// Orders table: 256 bytes
	const orders: number[] = [];
	let numPatterns = 0;
	let songLength = 0;

	if (cursor + 256 + 3 <= bytes.length) {
		const rawOrders = bytes.subarray(cursor, cursor + 256);
		cursor += 256;

		numPatterns = bytes[cursor] ?? 0;
		songLength = bytes[cursor + 1] ?? 0;
		cursor += 3;

		const count = songLength > 0 ? songLength : 1;
		for (let i = 0; i < count; i++) {
			const pat = rawOrders[i] ?? 255;
			if (pat < 255) {
				orders.push(pat);
			}
		}
	}

	if (orders.length === 0) {
		orders.push(0);
	}

	// Pattern length table: numPatterns * 2 bytes (or 256 * 2)
	const patternSizes: number[] = [];
	const patternsToRead = Math.max(numPatterns, 1);
	if (cursor + patternsToRead * 2 <= bytes.length) {
		for (let p = 0; p < patternsToRead; p++) {
			patternSizes.push(view.getUint16(cursor + p * 2, true));
		}
		cursor += patternsToRead * 2;
	}

	onProgress?.(0.2, "PARSING_PATTERNS");

	// Parse Patterns
	interface FarCell {
		note: number;
		sample: number;
		volume: number;
		effect: number;
	}

	type FarPattern = FarCell[][]; // [row][channel]
	const patterns: FarPattern[] = [];

	for (let p = 0; p < patternsToRead; p++) {
		const patSize = patternSizes[p] || 64 * 16 * 4;
		const patternRows: FarCell[][] = [];

		// Default 64 rows per pattern, 16 channels per row
		let patOffset = cursor;
		for (let row = 0; row < 64; row++) {
			const rowCells: FarCell[] = [];
			for (let ch = 0; ch < 16; ch++) {
				if (patOffset + 4 <= bytes.length && patOffset < cursor + patSize) {
					const note = bytes[patOffset] ?? 0;
					const sample = bytes[patOffset + 1] ?? 0;
					const volume = bytes[patOffset + 2] ?? 0;
					const effect = bytes[patOffset + 3] ?? 0;
					rowCells.push({ note, sample, volume, effect });
					patOffset += 4;
				} else {
					rowCells.push({ note: 0, sample: 0, volume: 0, effect: 0 });
				}
			}
			patternRows.push(rowCells);
		}
		patterns.push(patternRows);
		cursor += patSize;
	}

	onProgress?.(0.4, "PARSING_SAMPLES");

	// Sample headers (64 samples in Farandole standard, each 64 bytes)
	const samples: InternalFarSample[] = [];
	const sampleHeaders: {
		name: string;
		length: number;
		finetune: number;
		volume: number;
		loopStart: number;
		loopEnd: number;
		hasLoop: boolean;
	}[] = [];

	const maxSamples = 64;
	const sampleHeaderSize = 64;

	for (let s = 0; s < maxSamples; s++) {
		if (cursor + sampleHeaderSize > bytes.length) break;

		let sNameEnd = cursor;
		while (sNameEnd < cursor + 32 && bytes[sNameEnd] !== 0) {
			sNameEnd++;
		}
		const sName =
			new TextDecoder("ascii")
				.decode(bytes.subarray(cursor, sNameEnd))
				.trim() || `Sample ${s + 1}`;

		const length = view.getUint32(cursor + 32, true);
		const finetune = bytes[cursor + 36] ?? 0;
		const volume = Math.min(64, bytes[cursor + 37] ?? 64);
		const loopStart = view.getUint32(cursor + 38, true);
		const loopEnd = view.getUint32(cursor + 42, true);
		const loopType = bytes[cursor + 46] ?? 0;

		sampleHeaders.push({
			name: sName,
			length,
			finetune,
			volume,
			loopStart,
			loopEnd,
			hasLoop: loopType === 1 && loopEnd > loopStart && loopEnd <= length,
		});

		cursor += sampleHeaderSize;
	}

	// Read sample PCM payloads
	for (let s = 0; s < sampleHeaders.length; s++) {
		const sh = sampleHeaders[s];
		if (!sh || sh.length === 0 || cursor >= bytes.length) {
			continue;
		}

		const actualLength = Math.min(sh.length, bytes.length - cursor);
		const pcmData = new Float32Array(actualLength);

		// Farandole stores 8-bit signed PCM (-128..127)
		for (let i = 0; i < actualLength; i++) {
			const b = bytes[cursor + i] ?? 0;
			const signedVal = (b << 24) >> 24;
			pcmData[i] = signedVal / 128.0;
		}

		cursor += actualLength;

		samples.push({
			info: {
				index: s + 1,
				name: sh.name,
				length: actualLength,
				volume: sh.volume,
				loopStart: sh.loopStart,
				loopEnd: sh.loopEnd,
				hasLoop: sh.hasLoop,
			},
			pcmData,
		});
	}

	onProgress?.(0.6, "SYNTHESIZING_AUDIO");

	// Synthesis parameters
	const sampleRate = options.sampleRate ?? 44100;
	const stereoSep = Math.min(
		1.0,
		Math.max(0.0, options.stereoSeparation ?? 0.8),
	);
	const maxDurationSec = options.maxDurationSeconds ?? 180;
	const maxTotalFrames = Math.floor(sampleRate * maxDurationSec);

	const channels: FarChannelState[] = Array.from({ length: 16 }, (_, ch) => ({
		samplePos: 0,
		step: 0,
		volume: 0,
		panning: channelPannings[ch] ?? (ch % 2 === 0 ? 0.2 : 0.8),
	}));

	const leftOutput: number[] = [];
	const rightOutput: number[] = [];

	const bpm = 125;
	const samplesPerRow = Math.floor((sampleRate * 2.5) / bpm);

	// Multi-channel mixing loop
	let totalFramesRendered = 0;
	outerLoop: for (const orderPatIdx of orders) {
		const pattern = patterns[orderPatIdx];
		if (!pattern) continue;

		for (let row = 0; row < pattern.length; row++) {
			const rowData = pattern[row];
			if (!rowData) continue;

			// Process new notes & events on this row
			for (let ch = 0; ch < 16; ch++) {
				const cell = rowData[ch];
				const channel = channels[ch];
				if (!cell || !channel) continue;

				if (cell.sample > 0) {
					const targetSample = samples.find(
						(s) => s.info.index === cell.sample,
					);
					if (targetSample) {
						channel.sample = targetSample;
						channel.volume = targetSample.info.volume / 64.0;
					}
				}

				if (cell.volume > 0 && cell.volume <= 16) {
					channel.volume = Math.min(1.0, (cell.volume * 4) / 64.0);
				}

				if (cell.note > 0 && channel.sample) {
					// Farandole note scale: note 1..84
					// Pitch frequency calculation: f = 8363 * 2^((note - 49) / 12)
					const freq = 8363 * 2 ** ((cell.note - 49) / 12);
					channel.step = freq / sampleRate;
					channel.samplePos = 0;
				}
			}

			// Render audio frames for this row
			for (let frame = 0; frame < samplesPerRow; frame++) {
				let leftMix = 0.0;
				let rightMix = 0.0;

				for (let ch = 0; ch < 16; ch++) {
					const channel = channels[ch];
					if (!channel?.sample || channel.step === 0) continue;

					const pcm = channel.sample.pcmData;
					const pos = channel.samplePos;
					const idx0 = Math.floor(pos);

					if (idx0 >= pcm.length) {
						if (channel.sample.info.hasLoop) {
							channel.samplePos = channel.sample.info.loopStart;
						} else {
							channel.step = 0;
							continue;
						}
					}

					const safeIdx0 = Math.min(idx0, pcm.length - 1);
					const safeIdx1 = Math.min(safeIdx0 + 1, pcm.length - 1);
					const frac = pos - safeIdx0;
					const sampleVal =
						(1.0 - frac) * (pcm[safeIdx0] ?? 0) + frac * (pcm[safeIdx1] ?? 0);

					const voiceOut = sampleVal * channel.volume;
					const pan = channel.panning;
					const leftGain = (1.0 - pan) * stereoSep + (1.0 - stereoSep) * 0.5;
					const rightGain = pan * stereoSep + (1.0 - stereoSep) * 0.5;

					leftMix += voiceOut * leftGain;
					rightMix += voiceOut * rightGain;

					channel.samplePos += channel.step;
				}

				leftOutput.push(Math.max(-1.0, Math.min(1.0, leftMix)));
				rightOutput.push(Math.max(-1.0, Math.min(1.0, rightMix)));
				totalFramesRendered++;

				if (totalFramesRendered >= maxTotalFrames) {
					break outerLoop;
				}
			}
		}
	}

	onProgress?.(0.9, "ENCODING_WAV");

	const frameCount = leftOutput.length;
	const leftInt16 = new Int32Array(frameCount);
	const rightInt16 = new Int32Array(frameCount);

	for (let i = 0; i < frameCount; i++) {
		leftInt16[i] = Math.round((leftOutput[i] ?? 0) * 32767);
		rightInt16[i] = Math.round((rightOutput[i] ?? 0) * 32767);
	}

	const wavBuffer = writeWav({
		sampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [leftInt16, rightInt16],
	});

	const durationSeconds = frameCount / sampleRate;

	const metadata: FarMetadata = {
		title: songTitle,
		version,
		channels: 16,
		numOrders: orders.length,
		numPatterns: patterns.length,
		numSamples: samples.length,
		message: message || undefined,
		samples: samples.map((s) => s.info),
		durationSeconds,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		wavBuffer,
		metadata,
	};
}
