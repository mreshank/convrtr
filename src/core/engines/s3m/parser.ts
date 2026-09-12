import type {
	S3mConversionOptions,
	S3mConversionResult,
	S3mMetadata,
} from "./types";

interface S3mSample {
	name: string;
	length: number;
	loopStart: number;
	loopEnd: number;
	isLooped: boolean;
	volume: number;
	c4spd: number;
	data: Int16Array;
}

interface S3mCell {
	channel: number;
	note: number;
	instrument: number;
	volume: number;
	command: number;
	param: number;
}

interface ChannelState {
	sample?: S3mSample;
	samplePos: number;
	step: number;
	volume: number;
	panning: number; // 0 (left) to 1 (right)
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
	const slice = bytes.subarray(offset, offset + length);
	let s = "";
	for (let i = 0; i < slice.length; i++) {
		const b = slice[i] ?? 0;
		if (b === 0) break;
		if (b >= 32 && b <= 126) s += String.fromCharCode(b);
	}
	return s.trim();
}

/**
 * Converts a Future Crew Scream Tracker 3 (.s3m) module into a standard 16-bit stereo WAV.
 */
export function convertS3mToWav(
	input: Uint8Array | ArrayBuffer,
	options: S3mConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): S3mConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 96) {
		throw new Error(
			`Invalid S3M file: File size (${bytes.length} bytes) is too small to contain an S3M header.`,
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Check magic signature "SCRM" at offset 0x2C (44)
	const magic = readAscii(bytes, 0x2c, 4);
	if (magic !== "SCRM") {
		throw new Error(
			"Invalid S3M file: Missing 'SCRM' magic signature at offset 0x2C.",
		);
	}

	const title = readAscii(bytes, 0, 28) || "Untitled S3M Module";
	const ordNum = view.getUint16(0x20, true);
	const insNum = view.getUint16(0x22, true);
	const patNum = view.getUint16(0x24, true);
	const cwtv = view.getUint16(0x28, true);
	const ffi = view.getUint16(0x2a, true);

	const initialSpeed = Math.max(1, bytes[0x31] || 6);
	const initialTempo = Math.max(32, bytes[0x32] || 125);
	const masterVol = bytes[0x33] || 64;
	const isStereo = (masterVol & 0x80) !== 0 || true; // Modern renderers default to stereo

	onProgress?.(0.15, "LOAD_INSTRUMENTS");

	// Orders array
	const orderList: number[] = [];
	for (let i = 0; i < ordNum; i++) {
		const ord = bytes[0x60 + i] ?? 255;
		if (ord < 254) {
			orderList.push(ord);
		}
	}

	// Parapointers
	const ptrOffset = 0x60 + ordNum;
	const insParapointers: number[] = [];
	for (let i = 0; i < insNum; i++) {
		insParapointers.push(view.getUint16(ptrOffset + i * 2, true));
	}

	const patParapointers: number[] = [];
	const patPtrOffset = ptrOffset + insNum * 2;
	for (let i = 0; i < patNum; i++) {
		patParapointers.push(view.getUint16(patPtrOffset + i * 2, true));
	}

	// Load samples / instruments
	const samples: S3mSample[] = [];
	for (let i = 0; i < insNum; i++) {
		const para = insParapointers[i] ?? 0;
		if (para === 0) continue;
		const offset = para * 16;
		if (offset + 0x50 > bytes.length) continue;

		const type = bytes[offset] ?? 0;
		if (type !== 1) {
			// Type 1 = sample instrument
			continue;
		}

		const sampleName = readAscii(bytes, offset + 0x30, 28);
		const memSeg =
			(bytes[offset + 0x0d] ?? 0) |
			((bytes[offset + 0x0e] ?? 0) << 8) |
			((bytes[offset + 0x0f] ?? 0) << 16);
		const length = view.getUint32(offset + 0x10, true);
		const loopStart = view.getUint32(offset + 0x14, true);
		const loopEnd = view.getUint32(offset + 0x18, true);
		const vol = Math.min(64, bytes[offset + 0x1c] ?? 64);
		const flags = bytes[offset + 0x1f] ?? 0;
		const isLooped = (flags & 0x01) !== 0 && loopEnd > loopStart;
		const is16Bit = (flags & 0x04) !== 0;
		const c4spd = Math.max(1000, view.getUint32(offset + 0x20, true) || 8363);

		const dataOffset = memSeg * 16;
		const pcmData = new Int16Array(length);

		if (dataOffset + length <= bytes.length) {
			if (is16Bit && dataOffset + length * 2 <= bytes.length) {
				for (let s = 0; s < length; s++) {
					pcmData[s] = view.getInt16(dataOffset + s * 2, true);
				}
			} else {
				for (let s = 0; s < length; s++) {
					const raw = bytes[dataOffset + s] ?? 128;
					// S3M format version 1: unsigned (0..255). Version 2: signed (-128..127) or unsigned depending on ffi
					const sample8 = ffi === 1 ? raw - 128 : raw < 128 ? raw : raw - 256;
					pcmData[s] = sample8 * 256;
				}
			}
		}

		samples.push({
			name: sampleName,
			length,
			loopStart,
			loopEnd,
			isLooped,
			volume: vol,
			c4spd,
			data: pcmData,
		});
	}

	onProgress?.(0.3, "UNPACK_PATTERNS");

	// Unpack patterns: 64 rows per pattern, up to 32 channels
	const unpackedPatterns: S3mCell[][][] = []; // [patternIdx][row][channelCell]

	for (let p = 0; p < patNum; p++) {
		const para = patParapointers[p] ?? 0;
		const patRows: S3mCell[][] = Array.from({ length: 64 }, () => []);

		if (para > 0) {
			const offset = para * 16;
			if (offset + 2 <= bytes.length) {
				const packedLen = view.getUint16(offset, true);
				let pos = offset + 2;
				const end = Math.min(bytes.length, offset + 2 + packedLen);
				let row = 0;

				while (row < 64 && pos < end) {
					const b = bytes[pos++] ?? 0;
					if (b === 0) {
						// End of row
						row++;
						continue;
					}

					const channel = b & 31;
					let note = 255;
					let instrument = 0;
					let volume = 255;
					let command = 0;
					let param = 0;

					if ((b & 32) !== 0 && pos + 1 < end) {
						note = bytes[pos++] ?? 255;
						instrument = bytes[pos++] ?? 0;
					}

					if ((b & 64) !== 0 && pos < end) {
						volume = bytes[pos++] ?? 255;
					}

					if ((b & 128) !== 0 && pos + 1 < end) {
						command = bytes[pos++] ?? 0;
						param = bytes[pos++] ?? 0;
					}

					patRows[row]?.push({
						channel,
						note,
						instrument,
						volume,
						command,
						param,
					});
				}
			}
		}

		unpackedPatterns.push(patRows);
	}

	onProgress?.(0.5, "SYNTHESIZE_AUDIO");

	const sampleRate = options.sampleRate ?? 44100;
	const maxSeconds = options.maxDurationSec ?? 180;
	const maxSamples = sampleRate * maxSeconds;
	const panSeparation = options.panningSeparation ?? 0.7;
	const overallGain = options.gain ?? 1.0;

	// 32 channels state
	const channels: ChannelState[] = Array.from({ length: 32 }, (_, i) => ({
		samplePos: 0,
		step: 0,
		volume: 0,
		panning:
			i % 2 === 0 ? 0.5 - panSeparation * 0.4 : 0.5 + panSeparation * 0.4,
	}));

	let currentSpeed = initialSpeed;
	let currentTempo = initialTempo;

	const leftOut: number[] = [];
	const rightOut: number[] = [];

	// Render order list
	orderLoop: for (const patIdx of orderList) {
		const pat = unpackedPatterns[patIdx];
		if (!pat) continue;

		for (let rowIdx = 0; rowIdx < 64; rowIdx++) {
			const cells = pat[rowIdx] ?? [];

			for (const cell of cells) {
				const ch = channels[cell.channel];
				if (!ch) continue;

				if (cell.instrument > 0 && cell.instrument <= samples.length) {
					ch.sample = samples[cell.instrument - 1];
					if (ch.sample) {
						ch.volume = ch.sample.volume;
					}
				}

				if (cell.volume <= 64) {
					ch.volume = cell.volume;
				}

				if (cell.note < 254 && cell.note > 0) {
					const octave = (cell.note >> 4) & 0x0f;
					const semitone = cell.note & 0x0f;
					const noteIndex = octave * 12 + semitone;

					if (ch.sample) {
						ch.samplePos = 0;
						// Middle C (C-4) is note 48
						const freq = ch.sample.c4spd * 2 ** ((noteIndex - 48) / 12);
						ch.step = freq / sampleRate;
					}
				} else if (cell.note === 254) {
					// Note cut
					ch.volume = 0;
				}

				// Effect commands
				if (cell.command === 1 && cell.param > 0) {
					// A: Set speed
					currentSpeed = cell.param;
				} else if (cell.command === 20 && cell.param >= 32) {
					// T: Set tempo BPM
					currentTempo = cell.param;
				}
			}

			// Render frames for this row
			const framesPerTick = Math.max(
				1,
				Math.round((sampleRate * 2.5) / currentTempo),
			);
			const totalFrames = currentSpeed * framesPerTick;

			for (let f = 0; f < totalFrames; f++) {
				if (leftOut.length >= maxSamples) break orderLoop;

				let mixL = 0;
				let mixR = 0;

				for (let c = 0; c < 32; c++) {
					const ch = channels[c];
					const smp = ch?.sample;
					if (!ch || !smp || ch.volume <= 0 || ch.step <= 0) continue;

					const idx = Math.floor(ch.samplePos);
					if (idx >= smp.length) {
						if (smp.isLooped && smp.loopEnd > smp.loopStart) {
							const loopLen = smp.loopEnd - smp.loopStart;
							ch.samplePos =
								smp.loopStart + ((ch.samplePos - smp.loopStart) % loopLen);
						} else {
							continue;
						}
					}

					const sampleVal = smp.data[Math.floor(ch.samplePos)] ?? 0;
					const scaled = (sampleVal * (ch.volume / 64) * overallGain) / 8; // Normalize across channels

					if (isStereo) {
						mixL += scaled * (1 - ch.panning);
						mixR += scaled * ch.panning;
					} else {
						mixL += scaled * 0.5;
						mixR += scaled * 0.5;
					}

					ch.samplePos += ch.step;
				}

				leftOut.push(Math.max(-32768, Math.min(32767, Math.round(mixL))));
				rightOut.push(Math.max(-32768, Math.min(32767, Math.round(mixR))));
			}
		}
	}

	onProgress?.(0.85, "BUILD_WAV");

	// Wrap in standard 16-bit stereo WAV
	const sampleCount = leftOut.length;
	const numChannels = 2;
	const bitsPerSample = 16;
	const blockAlign = numChannels * (bitsPerSample / 8);
	const byteRate = sampleRate * blockAlign;
	const dataLen = sampleCount * blockAlign;
	const totalWavLen = 44 + dataLen;

	const wavBuffer = new Uint8Array(totalWavLen);
	const wavView = new DataView(wavBuffer.buffer);

	// "RIFF"
	wavBuffer[0] = 0x52;
	wavBuffer[1] = 0x49;
	wavBuffer[2] = 0x46;
	wavBuffer[3] = 0x46;
	wavView.setUint32(4, totalWavLen - 8, true);

	// "WAVE"
	wavBuffer[8] = 0x57;
	wavBuffer[9] = 0x41;
	wavBuffer[10] = 0x56;
	wavBuffer[11] = 0x45;

	// "fmt "
	wavBuffer[12] = 0x66;
	wavBuffer[13] = 0x6d;
	wavBuffer[14] = 0x74;
	wavBuffer[15] = 0x20;
	wavView.setUint32(16, 16, true);
	wavView.setUint16(20, 1, true); // Linear PCM
	wavView.setUint16(22, numChannels, true);
	wavView.setUint32(24, sampleRate, true);
	wavView.setUint32(28, byteRate, true);
	wavView.setUint16(32, blockAlign, true);
	wavView.setUint16(34, bitsPerSample, true);

	// "data"
	wavBuffer[36] = 0x64;
	wavBuffer[37] = 0x61;
	wavBuffer[38] = 0x74;
	wavBuffer[39] = 0x61;
	wavView.setUint32(40, dataLen, true);

	let outPos = 44;
	for (let i = 0; i < sampleCount; i++) {
		wavView.setInt16(outPos, leftOut[i] ?? 0, true);
		wavView.setInt16(outPos + 2, rightOut[i] ?? 0, true);
		outPos += 4;
	}

	onProgress?.(1.0, "COMPLETE");

	const metadata: S3mMetadata = {
		title,
		trackerVersion: cwtv,
		channelCount: 32,
		orderCount: orderList.length,
		patternCount: patNum,
		instrumentCount: samples.length,
		durationSec: Math.round((sampleCount / sampleRate) * 100) / 100,
		sampleRate,
	};

	return {
		wavBytes: wavBuffer,
		metadata,
	};
}
