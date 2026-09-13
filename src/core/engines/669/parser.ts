import { writeWav } from "../audio/wav";
import type {
	SixSixNineConversionOptions,
	SixSixNineConversionResult,
	SixSixNineMetadata,
	SixSixNineSampleInfo,
} from "./types";

interface InternalSample {
	info: SixSixNineSampleInfo;
	pcmData: Float32Array;
}

interface ChannelState {
	sample?: InternalSample;
	samplePos: number;
	step: number;
	volume: number;
	panning: number; // 0..1
}

/**
 * 669 note tuning frequencies.
 * Note values 0..47 map to octave 2 to 5.
 * Middle C (C-4, note 24) is approximately 8363 Hz.
 */
function get669Frequency(note: number): number {
	const middleC = 8363.0;
	// 12 semitones per octave, note 24 is C-4
	return middleC * Math.pow(2.0, (note - 24) / 12.0);
}

function cleanAscii(bytes: Uint8Array): string {
	let end = 0;
	while (end < bytes.length && bytes[end] !== 0) {
		end++;
	}
	return new TextDecoder("ascii").decode(bytes.subarray(0, end)).trim();
}

/**
 * Converts Composer 669 and UNIS 669 (.669) 8-channel tracker files into
 * 16-bit 44.1kHz stereo WAV audio.
 */
export function convert669ToWav(
	input: ArrayBuffer | Uint8Array,
	options: SixSixNineConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): SixSixNineConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 495) {
		throw new Error(
			"Invalid 669 file: Buffer size is smaller than the 495-byte 669 file header.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// 1. Check Magic: "if" (0x69, 0x66) or "JN" (0x4A, 0x4E)
	const m0 = String.fromCharCode(bytes[0]!);
	const m1 = String.fromCharCode(bytes[1]!);
	const magicStr = `${m0}${m1}`;
	if (magicStr !== "if" && magicStr !== "JN") {
		throw new Error(
			`Invalid 669 file: Expected magic 'if' or 'JN', received '${magicStr}'.`,
		);
	}
	const magic = magicStr as "if" | "JN";

	// 2. Song Message (108 bytes, 3 lines of 36 chars, starting at byte 2)
	const msgBytes = bytes.subarray(2, 110);
	const line1 = cleanAscii(msgBytes.subarray(0, 36));
	const line2 = cleanAscii(msgBytes.subarray(36, 72));
	const line3 = cleanAscii(msgBytes.subarray(72, 108));

	const title = line1 || "Untitled 669";
	const artistMessage = [line1, line2, line3].filter((l) => l.length > 0);

	// Header fields at offsets 108, 109, 110
	const numSamples = bytes[108]!;
	const numPatterns = bytes[109]!;
	const loopOrder = bytes[110]!;

	if (numSamples < 1 || numSamples > 64) {
		throw new Error(
			`Invalid 669 sample count (${numSamples}). Expected between 1 and 64 samples.`,
		);
	}
	if (numPatterns < 1 || numPatterns > 128) {
		throw new Error(
			`Invalid 669 pattern count (${numPatterns}). Expected between 1 and 128 patterns.`,
		);
	}

	// Order table (128 bytes at 111..238)
	const orders: number[] = [];
	for (let i = 0; i < 128; i++) {
		const ord = bytes[111 + i]!;
		if (ord < 128 && ord < numPatterns) {
			orders.push(ord);
		} else if (ord === 0xff) {
			break;
		}
	}

	// Tempo table (128 bytes at 239..366)
	const tempos: number[] = [];
	for (let i = 0; i < 128; i++) {
		tempos.push(bytes[239 + i]!);
	}

	// P-Break table (128 bytes at 367..494)
	const pbreaks: number[] = [];
	for (let i = 0; i < 128; i++) {
		pbreaks.push(bytes[367 + i]!);
	}

	onProgress?.(0.2, "READ_SAMPLES");

	// 3. Read Sample Headers (each 25 bytes, starting at byte 495)
	let ptr = 495;
	const sampleInfos: SixSixNineSampleInfo[] = [];

	for (let s = 0; s < numSamples; s++) {
		if (ptr + 25 > bytes.length) break;

		let fnEnd = ptr;
		while (fnEnd < ptr + 13 && bytes[fnEnd] !== 0) fnEnd++;
		const fileName =
			new TextDecoder("ascii")
				.decode(bytes.subarray(ptr, fnEnd))
				.trim() || `Sample ${s + 1}`;

		const length = view.getUint32(ptr + 13, true);
		const loopStart = view.getUint32(ptr + 17, true);
		const loopEnd = view.getUint32(ptr + 21, true);

		const hasLoop = loopEnd > loopStart && loopEnd <= length && loopEnd < 0xfffff;

		sampleInfos.push({
			index: s + 1,
			fileName,
			length,
			loopStart,
			loopEnd: hasLoop ? loopEnd : 0,
			loop: hasLoop,
		});

		ptr += 25;
	}

	onProgress?.(0.35, "READ_PATTERNS");

	// 4. Locate Pattern Data
	// Each pattern has 64 rows, 8 channels, 3 bytes per channel cell = 64 * 8 * 3 = 1536 bytes
	const patternSize = 64 * 8 * 3;
	const patternDataStart = ptr;
	ptr += numPatterns * patternSize;

	// 5. Read Sample Waveforms
	// Following all patterns, 8-bit unsigned PCM data is stored sequentially
	onProgress?.(0.5, "LOAD_PCM");

	const internalSamples: InternalSample[] = [];
	for (const sInfo of sampleInfos) {
		const sLen = sInfo.length;
		if (ptr + sLen <= bytes.length && sLen > 0) {
			const rawPcm = bytes.subarray(ptr, ptr + sLen);
			const pcmFloats = new Float32Array(sLen);
			for (let i = 0; i < sLen; i++) {
				// 669 uses 8-bit unsigned PCM (0..255, 128 = silence)
				pcmFloats[i] = (rawPcm[i]! - 128) / 128.0;
			}
			internalSamples.push({
				info: sInfo,
				pcmData: pcmFloats,
			});
			ptr += sLen;
		} else {
			internalSamples.push({
				info: sInfo,
				pcmData: new Float32Array(0),
			});
		}
	}

	onProgress?.(0.65, "SYNTHESIS");

	// 6. Audio Synthesis
	const targetSampleRate = options.sampleRate ?? 44100;
	const maxDuration = Math.min(options.maxDurationSeconds ?? 180, 600);

	// 8-channel stereo panning (standard tracker alternating stereo: L, R, L, R...)
	const channelPans = [0.25, 0.75, 0.3, 0.7, 0.25, 0.75, 0.35, 0.65];
	const channels: ChannelState[] = [];
	for (let ch = 0; ch < 8; ch++) {
		channels.push({
			samplePos: 0,
			step: 0,
			volume: 1.0,
			panning: channelPans[ch] ?? 0.5,
		});
	}

	const patternsToPlay = orders.length > 0 ? orders : [0];
	const maxTotalFrames = targetSampleRate * maxDuration;
	const leftChannel = new Int32Array(maxTotalFrames);
	const rightChannel = new Int32Array(maxTotalFrames);

	let currentFrame = 0;

	for (let ordIdx = 0; ordIdx < patternsToPlay.length; ordIdx++) {
		if (currentFrame >= maxTotalFrames) break;

		const patIdx = patternsToPlay[ordIdx]!;
		const tempoVal = tempos[ordIdx] || 78;
		const maxRow = Math.min(63, pbreaks[ordIdx] ?? 63);

		// In 669, tempo converts to tick speed:
		// Base sample rate ~44100. Standard 669 tick rate is controlled by timer
		const samplesPerRow = Math.max(
			100,
			Math.floor((targetSampleRate * 12) / Math.max(10, tempoVal)),
		);

		const patOffset = patternDataStart + patIdx * patternSize;

		for (let row = 0; row <= maxRow; row++) {
			if (currentFrame >= maxTotalFrames) break;

			// Parse 8 channel events for this row
			const rowOffset = patOffset + row * (8 * 3);

			if (rowOffset + 24 <= bytes.length) {
				for (let ch = 0; ch < 8; ch++) {
					const cellOffset = rowOffset + ch * 3;
					const b0 = bytes[cellOffset]!;
					const b1 = bytes[cellOffset + 1]!;

					const rawNote = (b0 >> 2) & 0x3f;
					const inst = ((b0 & 0x03) << 4) | ((b1 >> 4) & 0x0f);
					const vol = b1 & 0x0f;

					const state = channels[ch];
					if (state) {
						// Note trigger
						if (rawNote < 48 && inst > 0 && inst <= internalSamples.length) {
							const smp = internalSamples[inst - 1];
							if (smp && smp.pcmData.length > 0) {
								state.sample = smp;
								state.samplePos = 0;
								const freq = get669Frequency(rawNote);
								state.step = freq / targetSampleRate;
								state.volume = vol > 0 ? vol / 15.0 : 1.0;
							}
						} else if (vol > 0) {
							state.volume = vol / 15.0;
						}
					}
				}
			}

			// Render audio frames for this row
			const rowEndFrame = Math.min(currentFrame + samplesPerRow, maxTotalFrames);
			while (currentFrame < rowEndFrame) {
				let mixL = 0;
				let mixR = 0;

				for (let ch = 0; ch < 8; ch++) {
					const state = channels[ch];
					if (!state?.sample || state.step === 0) continue;

					const smp = state.sample;
					const idx = Math.floor(state.samplePos);

					if (idx >= smp.pcmData.length) {
						if (smp.info.loop && smp.info.loopEnd > smp.info.loopStart) {
							state.samplePos = smp.info.loopStart;
						} else {
							state.step = 0;
							continue;
						}
					}

					const sVal = smp.pcmData[idx] ?? 0;
					const pan = state.panning;
					const vol = state.volume;

					mixL += sVal * vol * (1.0 - pan);
					mixR += sVal * vol * pan;

					state.samplePos += state.step;
				}

				// Clamp and write 16-bit PCM
				const clampedL = Math.max(-1.0, Math.min(1.0, mixL));
				const clampedR = Math.max(-1.0, Math.min(1.0, mixR));

				leftChannel[currentFrame] = Math.round(clampedL * 32767);
				rightChannel[currentFrame] = Math.round(clampedR * 32767);

				currentFrame++;
			}
		}
	}

	onProgress?.(0.9, "ENCODE_WAV");

	// Slice channels to actual rendered frame count
	const finalFrames = Math.max(targetSampleRate, currentFrame);
	const renderedL = leftChannel.subarray(0, finalFrames);
	const renderedR = rightChannel.subarray(0, finalFrames);

	const wavBuffer = writeWav({
		sampleRate: targetSampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [renderedL, renderedR],
	});

	onProgress?.(1.0, "COMPLETE");

	const metadata: SixSixNineMetadata = {
		title,
		artistMessage,
		magic,
		numSamples,
		numPatterns,
		loopOrder,
		samples: sampleInfos,
		durationSeconds: finalFrames / targetSampleRate,
	};

	return {
		metadata,
		wavBytes: new Uint8Array(wavBuffer),
	};
}
