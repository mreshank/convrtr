import { writeWav } from "../audio/wav";
import type { OktConversionOptions, OktConversionResult } from "./types";

interface SampleHeader {
	name: string;
	length: number;
	loopStart: number;
	loopLength: number;
	volume: number; // 0..64
	pcm: Int8Array;
}

interface PatternRowCell {
	note: number; // 0 = none, 1..96
	sample: number; // 0 = none, 1..36
	command: number;
	param: number;
}

interface ActiveVoice {
	sample: SampleHeader;
	samplePos: number;
	step: number;
	volume: number; // 0..1
	panning: number; // -1 to 1
}

const AMIGA_PAL_CLOCK = 3546895;

function cleanAscii(bytes: Uint8Array): string {
	let str = "";
	for (let i = 0; i < bytes.length; i++) {
		const c = bytes[i] ?? 0;
		if (c === 0) break;
		if (c >= 32 && c <= 126) {
			str += String.fromCharCode(c);
		}
	}
	return str.trim();
}

/**
 * Calculates Amiga period for note index (1..96 where 25 is C-3).
 */
function noteToPeriod(note: number): number {
	if (note < 1) return 0;
	// C-3 (note 25) = period 428 in PAL
	const semitoneDiff = note - 25;
	const period = Math.round(428 * 2 ** (-semitoneDiff / 12));
	return Math.max(50, Math.min(6000, period));
}

/**
 * Parses an Amiga Oktalyzer (.okt) module and renders 16-bit stereo WAV.
 */
export function convertOktToWav(
	input: ArrayBuffer | Uint8Array,
	options: OktConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): OktConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 32) {
		throw new Error("Invalid OKT file: Buffer too small for Oktalyzer header.");
	}

	const magic = String.fromCharCode(
		bytes[0] ?? 0,
		bytes[1] ?? 0,
		bytes[2] ?? 0,
		bytes[3] ?? 0,
		bytes[4] ?? 0,
		bytes[5] ?? 0,
		bytes[6] ?? 0,
		bytes[7] ?? 0,
	);

	if (magic !== "OKTASONG") {
		throw new Error("Invalid OKT file: Missing 'OKTASONG' format signature.");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	let numChannels = 8;
	let speed = 6;
	let numPatterns = 0;
	let orderList: number[] = [0];

	const sampleHeaders: SampleHeader[] = [];
	const patterns: PatternRowCell[][][] = []; // pattern -> row (64) -> channel (8)

	let offset = 8;

	// Parse IFF-style chunks
	while (offset + 8 <= bytes.length) {
		const chunkId = String.fromCharCode(
			bytes[offset] ?? 0,
			bytes[offset + 1] ?? 0,
			bytes[offset + 2] ?? 0,
			bytes[offset + 3] ?? 0,
		);
		const chunkSize = view.getUint32(offset + 4, false); // Big endian
		const chunkStart = offset + 8;
		const chunkEnd = Math.min(bytes.length, chunkStart + chunkSize);

		if (chunkId === "CMOD" && chunkSize >= 8) {
			// Channel modes: count number of active channels
			let nonZero = 0;
			for (let c = 0; c < 8 && chunkStart + c < chunkEnd; c++) {
				if ((bytes[chunkStart + c] ?? 0) > 0) nonZero++;
			}
			numChannels = nonZero > 4 ? 8 : 4;
		} else if (chunkId === "SAMP") {
			// Sample headers (32 bytes each: 20 name, 4 length, 2 loopstart, 2 looplen, 2 vol, 2 mode)
			const numSmp = Math.floor(chunkSize / 32);
			for (let i = 0; i < numSmp; i++) {
				const sOffset = chunkStart + i * 32;
				if (sOffset + 32 > chunkEnd) break;

				const name =
					cleanAscii(bytes.subarray(sOffset, sOffset + 20)) ||
					`Sample ${i + 1}`;
				const length = view.getUint32(sOffset + 20, false);
				const loopStart = view.getUint16(sOffset + 24, false);
				const loopLength = view.getUint16(sOffset + 26, false);
				const volume = Math.min(64, view.getUint16(sOffset + 28, false) || 64);

				sampleHeaders.push({
					name,
					length,
					loopStart,
					loopLength: loopLength > 2 ? loopLength : 0,
					volume,
					pcm: new Int8Array(0),
				});
			}
		} else if (chunkId === "SPEE" && chunkSize >= 2) {
			speed = Math.max(1, view.getUint16(chunkStart, false));
		} else if (chunkId === "SLEN" && chunkSize >= 2) {
			// Song length in orders
			const numOrders = view.getUint16(chunkStart, false);
			if (numOrders > 0)
				orderList = Array.from({ length: numOrders }, (_, i) => i);
		} else if (chunkId === "PLEN" && chunkSize >= 2) {
			numPatterns = view.getUint16(chunkStart, false);
		} else if (chunkId === "PATT") {
			// Order lookup table
			const count = Math.floor(chunkSize / 2);
			const newOrders: number[] = [];
			for (let i = 0; i < count; i++) {
				newOrders.push(view.getUint16(chunkStart + i * 2, false));
			}
			if (newOrders.length > 0) orderList = newOrders;
		} else if (chunkId === "PBOD") {
			// Pattern bodies (64 rows per pattern, numChannels * 4 bytes per row)
			const rowBytes = numChannels * 4;
			const patBytes = 64 * rowBytes;
			const totalPats = Math.floor(chunkSize / patBytes);

			for (let p = 0; p < totalPats; p++) {
				const pOffset = chunkStart + p * patBytes;
				const rows: PatternRowCell[][] = [];

				for (let r = 0; r < 64; r++) {
					const rOffset = pOffset + r * rowBytes;
					const channels: PatternRowCell[] = [];

					for (let c = 0; c < numChannels; c++) {
						const cellOffset = rOffset + c * 4;
						if (cellOffset + 4 <= bytes.length) {
							const note = bytes[cellOffset] ?? 0;
							const sample = bytes[cellOffset + 1] ?? 0;
							const command = bytes[cellOffset + 2] ?? 0;
							const param = bytes[cellOffset + 3] ?? 0;
							channels.push({ note, sample, command, param });
						} else {
							channels.push({ note: 0, sample: 0, command: 0, param: 0 });
						}
					}
					rows.push(channels);
				}
				patterns.push(rows);
			}
		} else if (chunkId === "SBOD") {
			// Sample audio data: split sequentially among sample headers
			let smpOffset = chunkStart;
			for (const smp of sampleHeaders) {
				if (smp.length > 0 && smpOffset < chunkEnd) {
					const take = Math.min(smp.length, chunkEnd - smpOffset);
					const raw = bytes.subarray(smpOffset, smpOffset + take);
					smp.pcm = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
					smpOffset += take;
				}
			}
		}

		offset += 8 + chunkSize;
		if (chunkSize % 2 !== 0) offset++; // IFF chunk padding
	}

	onProgress?.(0.35, "PREPARE_MIXER");

	const sampleRate = options.sampleRate ?? 44100;
	const stereoSep =
		Math.max(0, Math.min(100, options.stereoSeparation ?? 80)) / 100;

	// Classic Amiga Paula 8-channel panning
	// Left: 0, 3, 4, 7; Right: 1, 2, 5, 6
	const channelPan = [
		-stereoSep,
		stereoSep,
		stereoSep,
		-stereoSep,
		-stereoSep * 0.7,
		stereoSep * 0.7,
		stereoSep * 0.7,
		-stereoSep * 0.7,
	];

	// Timing: 1 tick = (2.5 / 125) seconds = 0.02s; 1 row = speed * 0.02s
	const bpm = 125;
	const rowSeconds = speed * (2.5 / bpm);
	const rowSamples = Math.floor(rowSeconds * sampleRate);

	const totalRows = orderList.length * 64;
	const totalSamples = Math.max(sampleRate, totalRows * rowSamples);
	const durationSeconds = totalSamples / sampleRate;

	const leftSamples = new Int32Array(totalSamples);
	const rightSamples = new Int32Array(totalSamples);

	const voices: (ActiveVoice | null)[] = Array(numChannels).fill(null);
	let sampleCursor = 0;

	onProgress?.(0.5, "MIX_AUDIO");

	for (let ordIdx = 0; ordIdx < orderList.length; ordIdx++) {
		const patIdx = orderList[ordIdx] ?? 0;
		const pattern = patterns[patIdx] ?? patterns[0];

		for (let rowIdx = 0; rowIdx < 64; rowIdx++) {
			const rowData = pattern ? pattern[rowIdx] : undefined;

			// Trigger notes
			if (rowData) {
				for (let ch = 0; ch < numChannels; ch++) {
					const cell = rowData[ch];
					if (!cell) continue;

					if (cell.note > 0) {
						const smpIdx = cell.sample > 0 ? cell.sample - 1 : 0;
						const smp = sampleHeaders[smpIdx];
						if (smp && smp.pcm.length > 0) {
							const period = noteToPeriod(cell.note);
							if (period > 0) {
								const freq = AMIGA_PAL_CLOCK / period;
								const step = freq / sampleRate;
								voices[ch] = {
									sample: smp,
									samplePos: 0,
									step,
									volume: smp.volume / 64,
									panning: channelPan[ch] ?? 0,
								};
							}
						}
					}
				}
			}

			// Render audio samples for this row
			for (let s = 0; s < rowSamples; s++) {
				if (sampleCursor >= totalSamples) break;

				let mixL = 0;
				let mixR = 0;

				for (let ch = 0; ch < numChannels; ch++) {
					const voice = voices[ch];
					if (!voice || voice.step <= 0) continue;

					const smp = voice.sample;
					const pcm = smp.pcm;
					const posInt = Math.floor(voice.samplePos);
					const frac = voice.samplePos - posInt;

					let sampleVal = 0;
					if (posInt < pcm.length) {
						const v0 = pcm[posInt] ?? 0;
						const v1 =
							posInt + 1 < pcm.length
								? (pcm[posInt + 1] ?? 0)
								: smp.loopLength > 0
									? (pcm[smp.loopStart] ?? 0)
									: 0;
						sampleVal = (v0 + (v1 - v0) * frac) / 128.0;
					}

					voice.samplePos += voice.step;
					if (voice.samplePos >= pcm.length) {
						if (smp.loopLength > 2) {
							voice.samplePos =
								smp.loopStart +
								((voice.samplePos - smp.loopStart) % smp.loopLength);
						} else {
							voices[ch] = null;
						}
					}

					const amp = sampleVal * voice.volume;
					const panL = 0.5 * (1 - voice.panning);
					const panR = 0.5 * (1 + voice.panning);

					mixL += amp * panL;
					mixR += amp * panR;
				}

				// Soft clip to 16-bit range
				const outL = Math.max(-1, Math.min(1, mixL * 0.7));
				const outR = Math.max(-1, Math.min(1, mixR * 0.7));

				leftSamples[sampleCursor] = Math.floor(outL * 32767);
				rightSamples[sampleCursor] = Math.floor(outR * 32767);

				sampleCursor++;
			}
		}
	}

	onProgress?.(0.9, "ENCODE_WAV");

	const wavBuffer = writeWav({
		sampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [leftSamples, rightSamples],
	});

	onProgress?.(1.0, "COMPLETE");

	return {
		wavBuffer,
		metadata: {
			title: "Oktalyzer Song",
			numChannels,
			numSamples: sampleHeaders.length,
			numPatterns: patterns.length || numPatterns,
			numOrders: orderList.length,
			speed,
			durationSeconds,
		},
	};
}
