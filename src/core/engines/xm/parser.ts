import type {
	XmConversionOptions,
	XmConversionResult,
	XmHeader,
	XmInstrument,
	XmMetadata,
	XmNote,
	XmPattern,
	XmSample,
} from "./types";

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
 * Parses and synthesizes a Triton FastTracker II Extended Module (.xm) file
 * into a universal 16-bit stereo linear PCM RIFF WAV audio file.
 */
export function convertXmToWav(
	input: Uint8Array | ArrayBuffer,
	options: XmConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): XmConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 336) {
		throw new Error(
			`Invalid XM file: File size (${bytes.length} bytes) is too small to contain an XM header.`,
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Verify "Extended Module: " signature (17 bytes)
	const sig = readAscii(bytes, 0, 17);
	if (!sig.startsWith("Extended Module")) {
		throw new Error("Invalid XM file: Missing 'Extended Module: ' signature.");
	}

	const title = readAscii(bytes, 17, 20) || "Untitled XM Module";
	const trackerName = readAscii(bytes, 38, 20) || "FastTracker II";
	const version = view.getUint16(58, true);
	const headerSize = view.getUint32(60, true);
	const songLength = view.getUint16(64, true);
	const restartPos = view.getUint16(66, true);
	const channels = Math.max(1, Math.min(32, view.getUint16(68, true)));
	const patternsCount = view.getUint16(70, true);
	const instrumentsCount = view.getUint16(72, true);
	const flags = view.getUint16(74, true);
	const defaultTempo = Math.max(1, view.getUint16(76, true) || 6);
	const defaultBpm = Math.max(32, view.getUint16(78, true) || 125);

	const patternOrder: number[] = [];
	for (let i = 0; i < songLength; i++) {
		patternOrder.push(bytes[80 + i] ?? 0);
	}

	const _header: XmHeader = {
		title,
		trackerName,
		version,
		songLength,
		restartPos,
		channels,
		patternsCount,
		instrumentsCount,
		flags,
		defaultTempo,
		defaultBpm,
		patternOrder,
	};

	let pos = 60 + headerSize;

	onProgress?.(0.15, "PARSE_PATTERNS");
	const patterns: XmPattern[] = [];

	for (let p = 0; p < patternsCount; p++) {
		if (pos + 9 > bytes.length) break;

		const patHeaderLen = view.getUint32(pos, true);
		const numRows = view.getUint16(pos + 5, true) || 64;
		const packedDataSize = view.getUint16(pos + 7, true);
		pos += patHeaderLen;

		const rows: XmNote[][] = [];

		if (packedDataSize === 0) {
			// Empty pattern
			for (let r = 0; r < numRows; r++) {
				const rowNotes: XmNote[] = [];
				for (let c = 0; c < channels; c++) {
					rowNotes.push({
						note: 0,
						instrument: 0,
						volume: 0,
						effectType: 0,
						effectParam: 0,
					});
				}
				rows.push(rowNotes);
			}
		} else {
			const endPacked = Math.min(pos + packedDataSize, bytes.length);

			for (let r = 0; r < numRows; r++) {
				const rowNotes: XmNote[] = [];

				for (let c = 0; c < channels; c++) {
					if (pos >= endPacked) {
						rowNotes.push({
							note: 0,
							instrument: 0,
							volume: 0,
							effectType: 0,
							effectParam: 0,
						});
						continue;
					}

					let note = 0;
					let instrument = 0;
					let volume = 0;
					let effectType = 0;
					let effectParam = 0;

					const b = bytes[pos++] ?? 0;

					if (b & 0x80) {
						if (b & 0x01) note = bytes[pos++] ?? 0;
						if (b & 0x02) instrument = bytes[pos++] ?? 0;
						if (b & 0x04) volume = bytes[pos++] ?? 0;
						if (b & 0x08) effectType = bytes[pos++] ?? 0;
						if (b & 0x10) effectParam = bytes[pos++] ?? 0;
					} else {
						note = b;
						instrument = bytes[pos++] ?? 0;
						volume = bytes[pos++] ?? 0;
						effectType = bytes[pos++] ?? 0;
						effectParam = bytes[pos++] ?? 0;
					}

					rowNotes.push({ note, instrument, volume, effectType, effectParam });
				}

				rows.push(rowNotes);
			}

			pos = endPacked;
		}

		patterns.push({ rows });
	}

	onProgress?.(0.35, "PARSE_INSTRUMENTS");
	const instruments: XmInstrument[] = [];

	for (let instIdx = 0; instIdx < instrumentsCount; instIdx++) {
		if (pos + 29 > bytes.length) break;

		const instHeaderSize = view.getUint32(pos, true);
		const instName = readAscii(bytes, pos + 4, 22);
		const numSamples = view.getUint16(pos + 27, true);

		if (numSamples === 0) {
			instruments.push({
				name: instName,
				samples: [],
				sampleMapping: new Array(96).fill(0),
			});
			pos += instHeaderSize;
			continue;
		}

		const sampleMapping: number[] = [];
		for (let k = 0; k < 96; k++) {
			sampleMapping.push(bytes[pos + 33 + k] ?? 0);
		}

		pos += instHeaderSize;

		// Read sample headers
		const sampleHeaders: Array<{
			name: string;
			length: number;
			loopStart: number;
			loopLength: number;
			volume: number;
			finetune: number;
			type: number;
			panning: number;
			relativeNote: number;
		}> = [];

		for (let s = 0; s < numSamples; s++) {
			if (pos + 40 > bytes.length) break;

			const sLength = view.getUint32(pos, true);
			const sLoopStart = view.getUint32(pos + 4, true);
			const sLoopLength = view.getUint32(pos + 8, true);
			const sVol = bytes[pos + 12] ?? 64;
			const sFinetune = view.getInt8(pos + 13);
			const sType = bytes[pos + 14] ?? 0;
			const sPan = bytes[pos + 15] ?? 128;
			const sRelNote = view.getInt8(pos + 16);
			const sName = readAscii(bytes, pos + 18, 22);

			sampleHeaders.push({
				name: sName,
				length: sLength,
				loopStart: sLoopStart,
				loopLength: sLoopLength,
				volume: sVol,
				finetune: sFinetune,
				type: sType,
				panning: sPan,
				relativeNote: sRelNote,
			});

			pos += 40;
		}

		// Read sample delta PCM data
		const samples: XmSample[] = [];

		for (let s = 0; s < numSamples; s++) {
			const sh = sampleHeaders[s];
			if (!sh) continue;

			const is16Bit = (sh.type & 0x10) !== 0;
			const sampleCount = is16Bit ? Math.floor(sh.length / 2) : sh.length;
			const pcm = new Int16Array(sampleCount);

			if (is16Bit) {
				let accum = 0;
				for (let i = 0; i < sampleCount; i++) {
					if (pos + 2 > bytes.length) break;
					const delta = view.getInt16(pos, true);
					pos += 2;
					accum = (accum + delta) | 0;
					accum = Math.max(-32768, Math.min(32767, accum));
					pcm[i] = accum;
				}
			} else {
				let accum = 0;
				for (let i = 0; i < sampleCount; i++) {
					if (pos >= bytes.length) break;
					const delta = view.getInt8(pos++);
					accum = (accum + delta) | 0;
					accum = Math.max(-128, Math.min(127, accum));
					pcm[i] = accum * 256;
				}
			}

			samples.push({
				name: sh.name,
				length: sampleCount,
				loopStart: is16Bit ? Math.floor(sh.loopStart / 2) : sh.loopStart,
				loopLength: is16Bit ? Math.floor(sh.loopLength / 2) : sh.loopLength,
				volume: sh.volume,
				finetune: sh.finetune,
				type: sh.type,
				panning: sh.panning,
				relativeNote: sh.relativeNote,
				data: pcm,
			});
		}

		instruments.push({
			name: instName,
			samples,
			sampleMapping,
		});
	}

	onProgress?.(0.55, "SYNTHESIZING_AUDIO");

	const sampleRate = Number(options.sampleRate) || 44100;
	const maxDurationSeconds = Math.max(
		5,
		Math.min(600, Number(options.maxDurationSeconds) || 180),
	);
	const maxSamples = sampleRate * maxDurationSeconds;
	const stereoSep =
		typeof options.stereoSeparation === "number"
			? options.stereoSeparation
			: 0.7;

	// Mixer state per channel
	interface ChannelState {
		currentSample?: XmSample;
		samplePos: number;
		step: number;
		volume: number; // 0..64
		panning: number; // 0..255
		note: number;
	}

	const channelStates: ChannelState[] = [];
	for (let c = 0; c < channels; c++) {
		// Alternate stereo panning based on channel index
		const panVal =
			c % 2 === 0
				? Math.round(128 - 120 * stereoSep)
				: Math.round(128 + 120 * stereoSep);
		channelStates.push({
			samplePos: 0,
			step: 0,
			volume: 0,
			panning: Math.max(0, Math.min(255, panVal)),
			note: 0,
		});
	}

	const leftOut: number[] = [];
	const rightOut: number[] = [];

	let currentTempo = defaultTempo;
	let currentBpm = defaultBpm;

	function calculateStep(note: number, sample: XmSample): number {
		const realNote = note + sample.relativeNote;
		// FastTracker II linear frequency formula
		const period =
			10 * 12 * 16 * 4 - realNote * 16 * 4 - Math.round(sample.finetune / 2);
		const freq = 8363 * 2 ** ((6 * 12 * 16 * 4 - period) / (12 * 16 * 4));
		return freq / sampleRate;
	}

	// Play order table patterns
	orderLoop: for (let orderIdx = 0; orderIdx < songLength; orderIdx++) {
		const patIdx = patternOrder[orderIdx] ?? 0;
		const pattern = patterns[patIdx];
		if (!pattern) continue;

		for (let rowIdx = 0; rowIdx < pattern.rows.length; rowIdx++) {
			if (leftOut.length >= maxSamples) break orderLoop;

			const row = pattern.rows[rowIdx];

			// Process notes for this row
			for (let c = 0; c < channels; c++) {
				const cell = row?.[c];
				const ch = channelStates[c];
				if (!cell || !ch) continue;

				if (cell.instrument > 0) {
					const inst = instruments[cell.instrument - 1];
					if (inst && inst.samples.length > 0) {
						const sampleIdx =
							inst.sampleMapping[cell.note > 0 ? cell.note - 1 : 0] ?? 0;
						ch.currentSample = inst.samples[sampleIdx] ?? inst.samples[0];
						if (ch.currentSample) {
							ch.volume = ch.currentSample.volume;
						}
					}
				}

				if (cell.volume >= 0x10 && cell.volume <= 0x50) {
					ch.volume = cell.volume - 0x10;
				}

				if (cell.note > 0 && cell.note <= 96) {
					ch.note = cell.note;
					if (ch.currentSample) {
						ch.samplePos = 0;
						ch.step = calculateStep(cell.note, ch.currentSample);
					}
				} else if (cell.note === 97) {
					// Key off
					ch.volume = 0;
				}

				// Global tempo and speed effects
				if (cell.effectType === 0x0f) {
					if (cell.effectParam <= 0x1f && cell.effectParam > 0) {
						currentTempo = cell.effectParam;
					} else if (cell.effectParam >= 0x20) {
						currentBpm = cell.effectParam;
					}
				}
			}

			// Render audio frames for this row: ticks * framesPerTick
			const framesPerTick = Math.round((sampleRate * 2.5) / currentBpm);
			const totalFramesThisRow = currentTempo * framesPerTick;

			for (let f = 0; f < totalFramesThisRow; f++) {
				if (leftOut.length >= maxSamples) break orderLoop;

				let mixL = 0;
				let mixR = 0;

				for (let c = 0; c < channels; c++) {
					const ch = channelStates[c];
					const smp = ch?.currentSample;
					if (!ch || !smp || ch.volume <= 0 || ch.step <= 0) continue;

					const idx = Math.floor(ch.samplePos);
					if (idx >= smp.length) {
						// Loop handling
						if ((smp.type & 0x03) !== 0 && smp.loopLength > 2) {
							ch.samplePos =
								smp.loopStart +
								((ch.samplePos - smp.loopStart) % smp.loopLength);
						} else {
							continue;
						}
					}

					const curSample = smp.data[Math.floor(ch.samplePos)] ?? 0;
					const sampleScaled = (curSample * (ch.volume / 64)) / channels;

					const pan = ch.panning / 255;
					mixL += sampleScaled * (1 - pan);
					mixR += sampleScaled * pan;

					ch.samplePos += ch.step;
				}

				leftOut.push(Math.max(-32768, Math.min(32767, Math.round(mixL))));
				rightOut.push(Math.max(-32768, Math.min(32767, Math.round(mixR))));
			}
		}
	}

	onProgress?.(0.85, "BUILD_WAV");

	const sampleCount = leftOut.length;
	const numChannels = 2;
	const bitsPerSample = 16;
	const blockAlign = numChannels * (bitsPerSample / 8);
	const byteRate = sampleRate * blockAlign;
	const dataBytesLen = sampleCount * blockAlign;
	const wavTotalLen = 44 + dataBytesLen;

	const wavBuffer = new Uint8Array(wavTotalLen);
	const wavView = new DataView(wavBuffer.buffer);

	// "RIFF"
	wavBuffer[0] = 0x52;
	wavBuffer[1] = 0x49;
	wavBuffer[2] = 0x46;
	wavBuffer[3] = 0x46;
	wavView.setUint32(4, wavTotalLen - 8, true);

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
	wavView.setUint32(40, dataBytesLen, true);

	let outPos = 44;
	for (let i = 0; i < sampleCount; i++) {
		wavView.setInt16(outPos, leftOut[i] ?? 0, true);
		wavView.setInt16(outPos + 2, rightOut[i] ?? 0, true);
		outPos += 4;
	}

	const durationSeconds =
		sampleRate > 0 ? Math.round((sampleCount / sampleRate) * 10) / 10 : 0;

	const metadata: XmMetadata = {
		title,
		trackerName,
		channels,
		patternsCount,
		instrumentsCount,
		durationSeconds,
		sampleRate,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		wavBuffer,
	};
}
