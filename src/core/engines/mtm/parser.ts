import { writeWav } from "../audio/wav";
import type { MtmConversionOptions, MtmConversionResult } from "./types";

interface MtmSample {
	name: string;
	length: number;
	loopStart: number;
	loopEnd: number;
	volume: number; // 0..64
	pcm: Int8Array;
}

interface ActiveVoice {
	sample: MtmSample;
	samplePos: number;
	step: number;
	volume: number; // 0..1
	panning: number; // -1 to 1
}

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
 * Calculates period for note index (1..96 where 25 is C-3).
 */
function noteToPeriod(note: number): number {
	if (note < 1) return 0;
	const semitoneDiff = note - 25;
	const period = Math.round(428 * 2 ** (-semitoneDiff / 12));
	return Math.max(50, Math.min(6000, period));
}

/**
 * Converts MultiTracker Module (.mtm) 32-channel tracker into 16-bit stereo WAV.
 */
export function convertMtmToWav(
	input: ArrayBuffer | Uint8Array,
	options: MtmConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): MtmConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 66) {
		throw new Error(
			"Invalid MTM file: Buffer too small for MultiTracker header.",
		);
	}

	const magic = String.fromCharCode(
		bytes[0] ?? 0,
		bytes[1] ?? 0,
		bytes[2] ?? 0,
	);
	const version = bytes[3] ?? 0;

	if (magic !== "MTM" || version !== 0x10) {
		throw new Error("Invalid MTM file: Missing 'MTM\\x10' format signature.");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	const title = cleanAscii(bytes.subarray(4, 24)) || "MultiTracker Song";
	const numTracks = view.getUint16(24, true);
	const lastPattern = bytes[26] ?? 0;
	const lastOrder = bytes[27] ?? 0;
	const commentLen = view.getUint16(28, true);
	const numSamples = bytes[30] ?? 0;
	const numChannels = Math.max(1, Math.min(32, bytes[33] ?? 8));

	const panTable: number[] = [];
	for (let c = 0; c < 32; c++) {
		const rawPan = bytes[34 + c] ?? 7; // 0..15 range
		// Map 0..15 to -1..1 range
		panTable.push((rawPan - 7.5) / 7.5);
	}

	onProgress?.(0.15, "PARSE_SAMPLES");

	let offset = 66;
	const samples: MtmSample[] = [];

	for (let i = 0; i < numSamples; i++) {
		if (offset + 37 > bytes.length) break;

		const sName =
			cleanAscii(bytes.subarray(offset, offset + 22)) || `Sample ${i + 1}`;
		const sLength = view.getUint32(offset + 22, true);
		const loopStart = view.getUint32(offset + 26, true);
		const loopEnd = view.getUint32(offset + 30, true);
		const volume = Math.min(64, bytes[offset + 35] ?? 64);

		samples.push({
			name: sName,
			length: sLength,
			loopStart,
			loopEnd: loopEnd > loopStart ? loopEnd : 0,
			volume,
			pcm: new Int8Array(0),
		});

		offset += 37;
	}

	onProgress?.(0.25, "PARSE_ORDERS");

	// Order table (128 bytes)
	const orderCount = lastOrder + 1;
	const orderList: number[] = [];
	for (let i = 0; i < orderCount && offset + i < bytes.length; i++) {
		orderList.push(bytes[offset + i] ?? 0);
	}
	offset += 128;

	// Track data: numTracks tracks (1-indexed, track 0 is silence)
	// Each track has 64 rows * 3 bytes = 192 bytes
	const tracks: Array<Array<{ note: number; sample: number }>> = [[]]; // track 0 empty

	for (let t = 0; t < numTracks; t++) {
		const trackRows: Array<{ note: number; sample: number }> = [];
		for (let r = 0; r < 64; r++) {
			const cellOffset = offset + r * 3;
			if (cellOffset + 3 <= bytes.length) {
				const b0 = bytes[cellOffset] ?? 0;
				const b1 = bytes[cellOffset + 1] ?? 0;

				const note = b0 >> 2;
				const sample = ((b0 & 0x03) << 4) | (b1 >> 4);
				trackRows.push({ note, sample });
			} else {
				trackRows.push({ note: 0, sample: 0 });
			}
		}
		tracks.push(trackRows);
		offset += 192;
	}

	// Pattern data: (lastPattern + 1) patterns, each having 32 track numbers (uint16 LE)
	const numPatterns = lastPattern + 1;
	const patterns: number[][] = []; // pattern -> 32 channel track indices

	for (let p = 0; p < numPatterns; p++) {
		const patTracks: number[] = [];
		for (let c = 0; c < 32; c++) {
			if (offset + 2 <= bytes.length) {
				patTracks.push(view.getUint16(offset, true));
				offset += 2;
			} else {
				patTracks.push(0);
			}
		}
		patterns.push(patTracks);
	}

	// Skip comments
	offset += commentLen;

	// Read sample PCM data
	onProgress?.(0.4, "LOAD_AUDIO_DATA");
	for (const smp of samples) {
		if (smp.length > 0 && offset < bytes.length) {
			const take = Math.min(smp.length, bytes.length - offset);
			const raw = bytes.subarray(offset, offset + take);
			const pcm = new Int8Array(take);
			// In MTM, 8-bit samples are unsigned (0..255)
			for (let i = 0; i < take; i++) {
				pcm[i] = (raw[i] ?? 128) - 128;
			}
			smp.pcm = pcm;
			offset += take;
		}
	}

	onProgress?.(0.5, "MIX_AUDIO");

	const sampleRate = options.sampleRate ?? 44100;
	const stereoSep =
		Math.max(0, Math.min(100, options.stereoSeparation ?? 70)) / 100;

	const speed = 6;
	const bpm = 125;
	const rowSeconds = speed * (2.5 / bpm);
	const rowSamples = Math.floor(rowSeconds * sampleRate);

	const totalRows = Math.max(1, orderList.length) * 64;
	const totalSamples = Math.max(sampleRate, totalRows * rowSamples);
	const durationSeconds = totalSamples / sampleRate;

	const leftSamples = new Int32Array(totalSamples);
	const rightSamples = new Int32Array(totalSamples);

	const voices: (ActiveVoice | null)[] = Array(numChannels).fill(null);
	let sampleCursor = 0;

	for (let ordIdx = 0; ordIdx < orderList.length; ordIdx++) {
		const patIdx = orderList[ordIdx] ?? 0;
		const patTrackMap = patterns[patIdx] ?? patterns[0];

		for (let rowIdx = 0; rowIdx < 64; rowIdx++) {
			// Trigger notes for this row
			if (patTrackMap) {
				for (let ch = 0; ch < numChannels; ch++) {
					const trackIdx = patTrackMap[ch] ?? 0;
					const track = tracks[trackIdx];
					if (track) {
						const cell = track[rowIdx];
						if (cell && cell.note > 0) {
							const smpIdx = cell.sample > 0 ? cell.sample - 1 : 0;
							const smp = samples[smpIdx];
							if (smp && smp.pcm.length > 0) {
								const period = noteToPeriod(cell.note);
								if (period > 0) {
									const freq = 3546895 / period;
									const step = freq / sampleRate;
									const basePan = panTable[ch] ?? 0;
									voices[ch] = {
										sample: smp,
										samplePos: 0,
										step,
										volume: smp.volume / 64,
										panning: basePan * stereoSep,
									};
								}
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
								: smp.loopEnd > smp.loopStart
									? (pcm[smp.loopStart] ?? 0)
									: 0;
						sampleVal = (v0 + (v1 - v0) * frac) / 128.0;
					}

					voice.samplePos += voice.step;
					if (voice.samplePos >= pcm.length) {
						const loopLen = smp.loopEnd - smp.loopStart;
						if (loopLen > 2) {
							voice.samplePos =
								smp.loopStart + ((voice.samplePos - smp.loopStart) % loopLen);
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
			title,
			numTracks,
			numPatterns,
			numOrders: orderList.length,
			numSamples: samples.length,
			numChannels,
			durationSeconds,
		},
	};
}
