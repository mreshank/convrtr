import type {
	ModConversionOptions,
	ModConversionResult,
	ModHeader,
	ModNote,
	ModPattern,
	ModSample,
} from "./types";

const PAULA_PAL_CLOCK = 3546895;

/**
 * Period to frequency conversion table for standard Amiga tuning.
 */
function periodToFrequency(period: number): number {
	if (period <= 0) return 0;
	return PAULA_PAL_CLOCK / (period * 2);
}

/**
 * Parses an Amiga ProTracker / SoundTracker (.mod) module file.
 */
export function parseMod(input: Uint8Array | ArrayBuffer): {
	header: ModHeader;
	patterns: ModPattern[];
} {
	const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (buffer.length < 1084) {
		throw new Error(
			`Invalid MOD file: size (${buffer.length} bytes) is smaller than the 1084-byte header.`,
		);
	}

	const decoder = new TextDecoder("ascii");

	// 0..19: Song title
	let title = decoder.decode(buffer.subarray(0, 20)).replace(/\0/g, "").trim();
	if (!title) title = "Untitled Module";

	// 20..949: 31 Sample headers (30 bytes each)
	const samples: ModSample[] = [];
	let ptr = 20;

	for (let i = 0; i < 31; i++) {
		const name = decoder
			.decode(buffer.subarray(ptr, ptr + 22))
			.replace(/\0/g, "")
			.trim();
		const lengthWords =
			((buffer[ptr + 22] ?? 0) << 8) | (buffer[ptr + 23] ?? 0);
		const length = lengthWords * 2;

		let finetune = (buffer[ptr + 24] ?? 0) & 0x0f;
		if (finetune & 0x08) finetune -= 16; // Signed nibble -8..+7

		const volume = Math.min(64, buffer[ptr + 25] ?? 0);
		const repeatOffsetWords =
			((buffer[ptr + 26] ?? 0) << 8) | (buffer[ptr + 27] ?? 0);
		const repeatLengthWords =
			((buffer[ptr + 28] ?? 0) << 8) | (buffer[ptr + 29] ?? 0);

		const repeatOffset = repeatOffsetWords * 2;
		const repeatLength = repeatLengthWords * 2;

		samples.push({
			name,
			length,
			finetune,
			volume,
			repeatOffset,
			repeatLength,
			data: new Int8Array(0), // Populated after patterns
		});

		ptr += 30;
	}

	// 950: Song length (1..128)
	const songLength = Math.max(1, Math.min(128, buffer[950] ?? 1));
	// 951: Restart position / CIA flag
	const restartPos = buffer[951] ?? 0;

	// 952..1079: Pattern order table (128 bytes)
	const patternTable: number[] = [];
	let maxPattern = 0;
	for (let i = 0; i < 128; i++) {
		const pat = buffer[952 + i] ?? 0;
		patternTable.push(pat);
		if (i < songLength && pat > maxPattern) {
			maxPattern = pat;
		}
	}

	// 1080..1083: Format tag
	const formatTag = decoder.decode(buffer.subarray(1080, 1084));
	let channels = 4;
	if (
		formatTag === "M.K." ||
		formatTag === "M!K!" ||
		formatTag === "FLT4" ||
		formatTag === "4CHN"
	) {
		channels = 4;
	} else if (formatTag === "2CHN") {
		channels = 2;
	} else if (formatTag === "6CHN") {
		channels = 6;
	} else if (
		formatTag === "8CHN" ||
		formatTag === "OCTA" ||
		formatTag === "CD81"
	) {
		channels = 8;
	}

	const numPatterns = maxPattern + 1;
	ptr = 1084;

	// Read pattern data
	const patterns: ModPattern[] = [];
	for (let p = 0; p < numPatterns; p++) {
		const rows: ModNote[][] = [];
		for (let r = 0; r < 64; r++) {
			const channelNotes: ModNote[] = [];
			for (let ch = 0; ch < channels; ch++) {
				if (ptr + 4 > buffer.length) {
					channelNotes.push({
						sampleNumber: 0,
						period: 0,
						effect: 0,
						param: 0,
					});
					continue;
				}

				const b0 = buffer[ptr] ?? 0;
				const b1 = buffer[ptr + 1] ?? 0;
				const b2 = buffer[ptr + 2] ?? 0;
				const b3 = buffer[ptr + 3] ?? 0;
				ptr += 4;

				const sampleNumber = ((b0 & 0xf0) >>> 4) | (b2 & 0xf0);
				const period = ((b0 & 0x0f) << 8) | b1;
				const effect = b2 & 0x0f;
				const param = b3;

				channelNotes.push({ sampleNumber, period, effect, param });
			}
			rows.push(channelNotes);
		}
		patterns.push({ rows });
	}

	// Read 8-bit signed PCM sample data
	for (let i = 0; i < 31; i++) {
		const s = samples[i];
		if (s && s.length > 0 && ptr < buffer.length) {
			const avail = Math.min(s.length, buffer.length - ptr);
			const sampleData = new Int8Array(avail);
			for (let j = 0; j < avail; j++) {
				const b = buffer[ptr + j] ?? 0;
				sampleData[j] = b > 127 ? b - 256 : b;
			}
			s.data = sampleData;
			ptr += avail;
		}
	}

	const header: ModHeader = {
		title,
		samples,
		songLength,
		restartPos,
		patternTable,
		formatTag,
		channels,
		numPatterns,
	};

	return { header, patterns };
}

/**
 * Creates a standard 44-byte RIFF WAV header for 16-bit stereo PCM.
 */
function createWavHeader(
	numSamples: number,
	sampleRate: number,
	channels = 2,
): Uint8Array {
	const bytesPerSample = 2; // 16-bit
	const blockAlign = channels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = numSamples * blockAlign;
	const bufferSize = 44 + dataSize;

	const header = new Uint8Array(44);
	const view = new DataView(header.buffer);

	// "RIFF"
	header[0] = 0x52;
	header[1] = 0x49;
	header[2] = 0x46;
	header[3] = 0x46;
	view.setUint32(4, bufferSize - 8, true);
	// "WAVE"
	header[8] = 0x57;
	header[9] = 0x41;
	header[10] = 0x56;
	header[11] = 0x45;
	// "fmt "
	header[12] = 0x66;
	header[13] = 0x6d;
	header[14] = 0x74;
	header[15] = 0x20;
	view.setUint32(16, 16, true); // Subchunk1Size
	view.setUint16(20, 1, true); // PCM = 1
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true); // BitsPerSample
	// "data"
	header[36] = 0x64;
	header[37] = 0x61;
	header[38] = 0x74;
	header[39] = 0x61;
	view.setUint32(40, dataSize, true);

	return header;
}

interface ChannelState {
	sampleIdx: number; // 0..30 (-1 if none)
	samplePos: number;
	period: number;
	volume: number; // 0..64
	portamentoTarget: number;
	portamentoSpeed: number;
}

/**
 * Renders an Amiga ProTracker / SoundTracker MOD into a 16-bit stereo 44.1kHz WAV.
 */
export function convertModToWav(
	input: Uint8Array | ArrayBuffer,
	options: ModConversionOptions = {},
): ModConversionResult {
	const { header, patterns } = parseMod(input);
	const sampleRate = options.sampleRate ?? 44100;
	const maxDuration = options.maxDurationSeconds ?? 180;
	const maxTotalSamples = Math.floor(maxDuration * sampleRate);
	const separation = options.stereoSeparation ?? 0.65; // Balanced stereo

	// Calculate channel panning gains
	// Standard Amiga: channels 0, 3 left; channels 1, 2 right
	const leftGains = new Float32Array(header.channels);
	const rightGains = new Float32Array(header.channels);
	for (let ch = 0; ch < header.channels; ch++) {
		const isLeft = ch % 4 === 0 || ch % 4 === 3;
		if (isLeft) {
			leftGains[ch] = 0.5 + 0.5 * separation;
			rightGains[ch] = 0.5 - 0.5 * separation;
		} else {
			leftGains[ch] = 0.5 - 0.5 * separation;
			rightGains[ch] = 0.5 + 0.5 * separation;
		}
	}

	// Channel states
	const channels: ChannelState[] = [];
	for (let i = 0; i < header.channels; i++) {
		channels.push({
			sampleIdx: -1,
			samplePos: 0,
			period: 0,
			volume: 0,
			portamentoTarget: 0,
			portamentoSpeed: 0,
		});
	}

	let speed = 6; // Default ticks per row
	let bpm = 125; // Default BPM
	const audioChunks: Int16Array[] = [];
	let totalRenderedSamples = 0;

	// Loop detection
	const visitedRows = new Set<string>();
	let orderIdx = 0;
	let row = 0;
	let jumpToOrder: number | null = null;
	let jumpToRow: number | null = null;

	while (
		orderIdx < header.songLength &&
		totalRenderedSamples < maxTotalSamples
	) {
		const patIdx = header.patternTable[orderIdx] ?? 0;
		const pattern = patterns[patIdx];

		if (!pattern) break;

		const rowKey = `${orderIdx}:${row}`;
		if (visitedRows.has(rowKey)) {
			// Module has looped back
			break;
		}
		visitedRows.add(rowKey);

		const channelNotes = pattern.rows[row] ?? [];
		jumpToOrder = null;
		jumpToRow = null;

		// Process notes for this row
		for (let ch = 0; ch < header.channels; ch++) {
			const note = channelNotes[ch];
			if (!note) continue;
			const cState = channels[ch];
			if (!cState) continue;

			if (note.sampleNumber > 0 && note.sampleNumber <= 31) {
				const sIdx = note.sampleNumber - 1;
				const smp = header.samples[sIdx];
				if (smp) {
					cState.sampleIdx = sIdx;
					cState.volume = smp.volume;
				}
			}

			if (note.period > 0) {
				if (note.effect === 0x03) {
					// Tone Portamento
					cState.portamentoTarget = note.period;
					if (note.param > 0) cState.portamentoSpeed = note.param;
				} else {
					cState.period = note.period;
					cState.samplePos = 0;
				}
			}

			// Immediate row effects
			switch (note.effect) {
				case 0x0c: // Set volume
					cState.volume = Math.min(64, note.param);
					break;
				case 0x0b: // Position jump
					jumpToOrder = note.param;
					jumpToRow = 0;
					break;
				case 0x0d: // Pattern break
					jumpToOrder = orderIdx + 1;
					// Param is BCD row number
					jumpToRow = (note.param >> 4) * 10 + (note.param & 0x0f);
					break;
				case 0x0f: // Set speed or tempo
					if (note.param <= 32 && note.param > 0) {
						speed = note.param;
					} else if (note.param > 32) {
						bpm = note.param;
					}
					break;
			}
		}

		// Render ticks for this row
		const samplesPerTick = Math.max(
			1,
			Math.round((sampleRate * 2.5) / Math.max(32, bpm)),
		);

		for (let tick = 0; tick < speed; tick++) {
			if (totalRenderedSamples >= maxTotalSamples) break;

			// Handle tick effects (Portamento, Arpeggio)
			if (tick > 0) {
				for (let ch = 0; ch < header.channels; ch++) {
					const note = channelNotes[ch];
					if (!note) continue;
					const cState = channels[ch];
					if (!cState) continue;

					if (note.effect === 0x01) {
						// Portamento Up (frequency up, period down)
						cState.period = Math.max(113, cState.period - note.param);
					} else if (note.effect === 0x02) {
						// Portamento Down (frequency down, period up)
						cState.period = Math.min(856, cState.period + note.param);
					} else if (note.effect === 0x03 && cState.portamentoTarget > 0) {
						// Tone Portamento
						if (cState.period < cState.portamentoTarget) {
							cState.period = Math.min(
								cState.portamentoTarget,
								cState.period + cState.portamentoSpeed,
							);
						} else if (cState.period > cState.portamentoTarget) {
							cState.period = Math.max(
								cState.portamentoTarget,
								cState.period - cState.portamentoSpeed,
							);
						}
					}
				}
			}

			// Render tick audio buffer (interleaved stereo 16-bit)
			const tickAudio = new Int16Array(samplesPerTick * 2);

			for (let s = 0; s < samplesPerTick; s++) {
				let sumL = 0;
				let sumR = 0;

				for (let ch = 0; ch < header.channels; ch++) {
					const cState = channels[ch];
					if (!cState || cState.sampleIdx < 0 || cState.period <= 0) continue;

					const smp = header.samples[cState.sampleIdx];
					if (!smp || smp.data.length === 0) continue;

					const freq = periodToFrequency(cState.period);
					const step = freq / sampleRate;

					const posInt = Math.floor(cState.samplePos);
					if (posInt < smp.data.length) {
						const rawVal = (smp.data[posInt] ?? 0) / 128.0; // Normalized -1.0 .. 1.0
						const amp = rawVal * (cState.volume / 64.0);

						sumL += amp * (leftGains[ch] ?? 0.5);
						sumR += amp * (rightGains[ch] ?? 0.5);
					}

					// Advance sample position
					cState.samplePos += step;

					// Loop handling
					if (smp.repeatLength > 2) {
						const loopEnd = smp.repeatOffset + smp.repeatLength;
						if (cState.samplePos >= loopEnd) {
							cState.samplePos =
								smp.repeatOffset +
								((cState.samplePos - smp.repeatOffset) % smp.repeatLength);
						}
					} else if (cState.samplePos >= smp.length) {
						cState.sampleIdx = -1; // Finished
					}
				}

				// Soft clamp into 16-bit signed range
				const sL = Math.max(-32768, Math.min(32767, Math.round(sumL * 16384)));
				const sR = Math.max(-32768, Math.min(32767, Math.round(sumR * 16384)));

				tickAudio[s * 2] = sL;
				tickAudio[s * 2 + 1] = sR;
			}

			audioChunks.push(tickAudio);
			totalRenderedSamples += samplesPerTick;
		}

		// Advance song position
		if (jumpToOrder !== null) {
			orderIdx = jumpToOrder;
			row = jumpToRow ?? 0;
		} else {
			row++;
			if (row >= 64) {
				row = 0;
				orderIdx++;
			}
		}
	}

	// Assemble final RIFF WAV
	const wavHeader = createWavHeader(totalRenderedSamples, sampleRate, 2);
	const wavBuffer = new Uint8Array(wavHeader.length + totalRenderedSamples * 4);
	wavBuffer.set(wavHeader, 0);

	let offset = 44;
	for (const chunk of audioChunks) {
		const chunkBytes = new Uint8Array(
			chunk.buffer,
			chunk.byteOffset,
			chunk.byteLength,
		);
		wavBuffer.set(chunkBytes, offset);
		offset += chunkBytes.length;
	}

	const durationSeconds = totalRenderedSamples / sampleRate;

	return {
		wavBuffer,
		title: header.title,
		channels: header.channels,
		durationSeconds,
		sampleRate,
		songLength: header.songLength,
	};
}
