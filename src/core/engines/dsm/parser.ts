import { writeWav } from "../audio/wav";
import type {
	DsmConversionResult,
	DsmMetadata,
	DsmToWavOptions,
} from "./types";

interface InternalSample {
	name: string;
	length: number;
	loopStart: number;
	loopEnd: number;
	looped: boolean;
	c2Spd: number;
	volume: number; // 0..1
	pcm: Float32Array;
}

interface ChannelVoice {
	sample?: InternalSample;
	samplePos: number;
	step: number;
	volume: number;
	panning: number; // 0..1
}

interface PatternCell {
	note: number; // 0 = empty, 1..84
	instrument: number; // 0 = none, 1..64
	volume: number; // 0..64, 255 = none
}

function cleanAscii(bytes: Uint8Array): string {
	let end = 0;
	while (end < bytes.length && bytes[end] !== 0) {
		end++;
	}
	return new TextDecoder("ascii").decode(bytes.subarray(0, end)).trim();
}

function noteToFrequency(note: number, c2Spd: number): number {
	const base = c2Spd > 0 ? c2Spd : 8363.0;
	return base * 2.0 ** ((note - 49) / 12.0);
}

export function convertDsmToWav(
	input: ArrayBuffer | Uint8Array,
	options: DsmToWavOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): DsmConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 32) {
		throw new Error("Invalid DSM file: File size is smaller than 32 bytes.");
	}

	const sigRiff = String.fromCharCode(
		bytes[0] ?? 0,
		bytes[1] ?? 0,
		bytes[2] ?? 0,
		bytes[3] ?? 0,
	);
	const sigDsm = String.fromCharCode(
		bytes[8] ?? 0,
		bytes[9] ?? 0,
		bytes[10] ?? 0,
		bytes[11] ?? 0,
	);

	if (sigRiff !== "RIFF" || sigDsm !== "DSMF") {
		throw new Error("Invalid DSM file: Missing 'RIFF' and 'DSMF' signatures.");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	let title = "";
	let numChannels = 8;
	let numOrders = 1;
	let _numSamples = 0;
	let numPatterns = 0;
	let masterSpeed = 6;
	let masterBpm = 125;
	let orderList: number[] = [0];

	const samples: InternalSample[] = [];
	const patterns: Map<number, PatternCell[][]> = new Map();

	// Parse RIFF chunks
	let offset = 12;
	while (offset + 8 <= bytes.length) {
		const chunkId = String.fromCharCode(
			bytes[offset] ?? 0,
			bytes[offset + 1] ?? 0,
			bytes[offset + 2] ?? 0,
			bytes[offset + 3] ?? 0,
		);
		const chunkSize = view.getUint32(offset + 4, true);
		const chunkStart = offset + 8;
		const chunkEnd = Math.min(bytes.length, chunkStart + chunkSize);

		if (chunkId === "SONG" && chunkSize >= 32) {
			title = cleanAscii(
				bytes.subarray(chunkStart, Math.min(chunkEnd, chunkStart + 32)),
			);

			if (chunkSize >= 48) {
				numOrders = view.getUint16(chunkStart + 40, true) || 1;
				_numSamples = view.getUint16(chunkStart + 42, true);
				numPatterns = view.getUint16(chunkStart + 44, true);
				numChannels = Math.max(
					1,
					Math.min(16, view.getUint16(chunkStart + 46, true) || 8),
				);
				masterSpeed = bytes[chunkStart + 49] || 6;
				masterBpm = bytes[chunkStart + 50] || 125;

				const orderStart = chunkStart + 68;
				if (orderStart < chunkEnd) {
					orderList = [];
					const count = Math.min(numOrders, chunkEnd - orderStart);
					for (let i = 0; i < count; i++) {
						orderList.push(bytes[orderStart + i] ?? 0);
					}
				}
			}
		} else if (chunkId === "INST" && chunkSize >= 36) {
			const sName = cleanAscii(
				bytes.subarray(chunkStart, Math.min(chunkEnd, chunkStart + 32)),
			);
			const flags = chunkSize >= 38 ? view.getUint16(chunkStart + 34, true) : 0;
			const volByte = chunkSize >= 39 ? (bytes[chunkStart + 36] ?? 64) : 64;
			const sLength =
				chunkSize >= 44 ? view.getUint32(chunkStart + 38, true) : 0;
			const lStart =
				chunkSize >= 48 ? view.getUint32(chunkStart + 42, true) : 0;
			const lEnd = chunkSize >= 52 ? view.getUint32(chunkStart + 46, true) : 0;
			const c2Spd =
				chunkSize >= 56 ? view.getUint32(chunkStart + 50, true) : 8363;

			const isLooped = (flags & 1) !== 0 && lEnd > lStart;
			const pcmStart = chunkStart + 56;
			const validLen = Math.min(sLength, Math.max(0, chunkEnd - pcmStart));

			const pcm = new Float32Array(validLen);
			for (let i = 0; i < validLen; i++) {
				const b = bytes[pcmStart + i] ?? 128;
				// Signed or unsigned 8-bit PCM
				const signed = (flags & 2) !== 0;
				if (signed) {
					pcm[i] = (b >= 128 ? b - 256 : b) / 128.0;
				} else {
					pcm[i] = (b - 128) / 128.0;
				}
			}

			samples.push({
				name: sName,
				length: validLen,
				loopStart: Math.min(lStart, validLen),
				loopEnd: Math.min(lEnd, validLen),
				looped: isLooped,
				c2Spd: c2Spd > 0 ? c2Spd : 8363,
				volume: Math.min(1.0, Math.max(0.0, volByte / 64.0)),
				pcm,
			});
		} else if (chunkId === "PATT" && chunkSize >= 4) {
			const pIdx = view.getUint16(chunkStart, true);
			const numRows = Math.min(
				128,
				Math.max(1, view.getUint16(chunkStart + 2, true) || 64),
			);

			const matrix: PatternCell[][] = [];
			for (let r = 0; r < numRows; r++) {
				const row: PatternCell[] = [];
				for (let c = 0; c < numChannels; c++) {
					row.push({ note: 0, instrument: 0, volume: 255 });
				}
				matrix.push(row);
			}

			// Simple event stream unpacking
			let pPtr = chunkStart + 4;
			let row = 0;
			while (pPtr < chunkEnd && row < numRows) {
				const flag = bytes[pPtr++] ?? 0;
				if (flag === 0) {
					row++;
					continue;
				}
				const ch = (flag & 0x0f) % numChannels;
				let note = 0;
				let inst = 0;
				let vol = 255;

				if (flag & 0x80 && pPtr < chunkEnd) {
					note = bytes[pPtr++] ?? 0;
				}
				if (flag & 0x40 && pPtr < chunkEnd) {
					inst = bytes[pPtr++] ?? 0;
				}
				if (flag & 0x20 && pPtr < chunkEnd) {
					vol = bytes[pPtr++] ?? 255;
				}

				const cell = matrix[row]?.[ch];
				if (cell) {
					if (note > 0) cell.note = note;
					if (inst > 0) cell.instrument = inst;
					if (vol !== 255) cell.volume = vol;
				}
			}

			patterns.set(pIdx, matrix);
		}

		offset += 8 + chunkSize + (chunkSize & 1);
	}

	onProgress?.(0.2, "SYNTHESIZE_AUDIO");

	const sampleRate = options.sampleRate ?? 44100;
	const maxSeconds = options.maxDurationSeconds ?? 180;
	const stereoSep = (options.stereoSeparation ?? 75) / 100;

	// Prepare channel voices
	const voices: ChannelVoice[] = [];
	for (let ch = 0; ch < numChannels; ch++) {
		// Standard tracker channel panning (L, R, R, L...)
		let pan =
			ch % 4 === 1 || ch % 4 === 2
				? 0.5 + stereoSep * 0.5
				: 0.5 - stereoSep * 0.5;
		pan = Math.max(0, Math.min(1, pan));
		voices.push({
			samplePos: 0,
			step: 0,
			volume: 0,
			panning: pan,
		});
	}

	const leftSamples: number[] = [];
	const rightSamples: number[] = [];
	const maxTotalSamples = Math.floor(sampleRate * maxSeconds);

	const currentSpeed = Math.max(1, masterSpeed);
	const currentBpm = Math.max(32, masterBpm);
	const samplesPerTick = Math.floor((sampleRate * 2.5) / currentBpm);

	const ordersToPlay = orderList.length > 0 ? orderList : [0];

	outerLoop: for (let oIdx = 0; oIdx < ordersToPlay.length; oIdx++) {
		const patIdx = ordersToPlay[oIdx] ?? 0;
		if (patIdx === 255) break;

		const pattern = patterns.get(patIdx);
		const rowsCount = pattern ? pattern.length : 64;

		for (let rowIdx = 0; rowIdx < rowsCount; rowIdx++) {
			// Trigger row notes
			if (pattern) {
				const row = pattern[rowIdx];
				if (row) {
					for (let ch = 0; ch < numChannels; ch++) {
						const cell = row[ch];
						if (!cell) continue;
						const voice = voices[ch];
						if (!voice) continue;

						if (cell.instrument > 0 && cell.instrument <= samples.length) {
							voice.sample = samples[cell.instrument - 1];
						}

						if (cell.volume !== 255 && cell.volume <= 64) {
							voice.volume = cell.volume / 64.0;
						} else if (cell.note > 0 && voice.sample) {
							voice.volume = voice.sample.volume;
						}

						if (cell.note > 0 && cell.note <= 84 && voice.sample) {
							const freq = noteToFrequency(cell.note, voice.sample.c2Spd);
							voice.step = freq / sampleRate;
							voice.samplePos = 0;
						}
					}
				}
			}

			// Render ticks for this row
			for (let tick = 0; tick < currentSpeed; tick++) {
				for (let s = 0; s < samplesPerTick; s++) {
					if (leftSamples.length >= maxTotalSamples) break outerLoop;

					let mixL = 0;
					let mixR = 0;

					for (let ch = 0; ch < numChannels; ch++) {
						const voice = voices[ch];
						if (!voice?.sample || voice.step <= 0 || voice.volume <= 0)
							continue;

						const smp = voice.sample;
						const posInt = Math.floor(voice.samplePos);
						const frac = voice.samplePos - posInt;

						let val = 0;
						if (posInt < smp.length) {
							const v0 = smp.pcm[posInt] ?? 0;
							const v1 =
								posInt + 1 < smp.length
									? (smp.pcm[posInt + 1] ?? 0)
									: smp.looped
										? (smp.pcm[smp.loopStart] ?? 0)
										: 0;
							val = v0 + frac * (v1 - v0);
						}

						const amp = val * voice.volume * 0.25;
						mixL += amp * (1.0 - voice.panning);
						mixR += amp * voice.panning;

						voice.samplePos += voice.step;
						if (smp.looped && voice.samplePos >= smp.loopEnd) {
							const loopSpan = smp.loopEnd - smp.loopStart;
							if (loopSpan > 0) {
								voice.samplePos =
									smp.loopStart +
									((voice.samplePos - smp.loopStart) % loopSpan);
							} else {
								voice.sample = undefined;
							}
						} else if (!smp.looped && voice.samplePos >= smp.length) {
							voice.sample = undefined;
						}
					}

					// Soft limiter clamp
					mixL = Math.max(-1.0, Math.min(1.0, mixL));
					mixR = Math.max(-1.0, Math.min(1.0, mixR));

					leftSamples.push(mixL);
					rightSamples.push(mixR);
				}
			}

			if (rowIdx % 16 === 0) {
				onProgress?.(0.2 + 0.6 * (rowIdx / rowsCount), "SYNTHESIZE_AUDIO");
			}
		}
	}

	onProgress?.(0.85, "ENCODE_WAV");

	// Ensure at least 0.5 second of audio
	const minSamples = Math.floor(sampleRate * 0.5);
	while (leftSamples.length < minSamples) {
		leftSamples.push(0);
		rightSamples.push(0);
	}

	// Convert to 16-bit PCM integer samples
	const count = leftSamples.length;
	const leftInt = new Int32Array(count);
	const rightInt = new Int32Array(count);

	for (let i = 0; i < count; i++) {
		const l = Math.max(-1.0, Math.min(1.0, leftSamples[i] ?? 0));
		const r = Math.max(-1.0, Math.min(1.0, rightSamples[i] ?? 0));
		leftInt[i] = Math.round(l * 32767);
		rightInt[i] = Math.round(r * 32767);
	}

	const wavBuffer = writeWav({
		sampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [leftInt, rightInt],
	});

	onProgress?.(1.0, "COMPLETE");

	const durationSeconds = leftSamples.length / sampleRate;

	const metadata: DsmMetadata = {
		title: title || "Untitled DSM Track",
		numChannels,
		numOrders: ordersToPlay.length,
		numPatterns,
		numSamples: samples.length,
		durationSeconds,
	};

	return {
		wavBuffer,
		metadata,
	};
}
