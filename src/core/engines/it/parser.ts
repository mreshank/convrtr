import type {
	ItConversionOptions,
	ItConversionResult,
	ItMetadata,
	ItPattern,
	ItPatternCell,
	ItSample,
} from "./types";

interface ChannelState {
	sample?: ItSample;
	samplePos: number;
	step: number;
	volume: number;
	panning: number; // 0 (far left) to 1 (far right)
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
 * Converts an Impulse Tracker (.it) module into a standard 16-bit stereo WAV.
 */
export function convertItToWav(
	input: Uint8Array | ArrayBuffer,
	options: ItConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): ItConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 192) {
		throw new Error(
			`Invalid IT file: File size (${bytes.length} bytes) is too small to contain an Impulse Tracker header.`,
		);
	}

	// Magic signature "IMPM" at offset 0
	const magic = readAscii(bytes, 0, 4);
	if (magic !== "IMPM") {
		throw new Error(
			"Invalid IT file: Missing 'IMPM' magic signature at offset 0.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const title = readAscii(bytes, 4, 26) || "Untitled IT Module";

	const ordNum = view.getUint16(0x20, true);
	const insNum = view.getUint16(0x22, true);
	const smpNum = view.getUint16(0x24, true);
	const patNum = view.getUint16(0x26, true);

	const initialGV = Math.min(128, Math.max(0, bytes[0x30] ?? 128));
	const initialMV = Math.min(128, Math.max(0, bytes[0x31] ?? 48));
	const initialSpeed = Math.max(1, bytes[0x32] || 6);
	const initialTempo = Math.max(32, bytes[0x33] || 125);

	// Channel initial pan and volume
	const channelPan: number[] = [];
	const channelVol: number[] = [];
	for (let i = 0; i < 64; i++) {
		const p = bytes[0x40 + i] ?? 32;
		if (p & 128) {
			channelPan.push(-1); // disabled
		} else {
			channelPan.push(Math.min(64, p) / 64); // 0..1
		}
		const v = bytes[0x80 + i] ?? 64;
		channelVol.push(Math.min(64, v) / 64);
	}

	// Read orders starting at offset 0xC0 (192)
	let offset = 0xc0;
	const orders: number[] = [];
	for (let i = 0; i < ordNum; i++) {
		if (offset < bytes.length) {
			const ord = bytes[offset++];
			if (ord !== undefined && ord < 254 && ord < patNum) {
				orders.push(ord);
			}
		}
	}

	// Read instrument offsets (4 bytes each)
	offset += insNum * 4;

	// Read sample offsets (4 bytes each)
	const sampleOffsets: number[] = [];
	for (let i = 0; i < smpNum; i++) {
		if (offset + 4 <= bytes.length) {
			sampleOffsets.push(view.getUint32(offset, true));
			offset += 4;
		}
	}

	// Read pattern offsets (4 bytes each)
	const patternOffsets: number[] = [];
	for (let i = 0; i < patNum; i++) {
		if (offset + 4 <= bytes.length) {
			patternOffsets.push(view.getUint32(offset, true));
			offset += 4;
		}
	}

	// Unpack samples
	onProgress?.(0.2, "UNPACK_SAMPLES");
	const samples: ItSample[] = [];
	for (let s = 0; s < sampleOffsets.length; s++) {
		const sOff = sampleOffsets[s] ?? 0;
		if (sOff === 0 || sOff + 0x50 > bytes.length) {
			continue;
		}

		const sMagic = readAscii(bytes, sOff, 4);
		if (sMagic !== "IMPS") {
			continue;
		}

		const sView = new DataView(
			bytes.buffer,
			bytes.byteOffset + sOff,
			Math.min(0x50, bytes.length - sOff),
		);
		const sFilename = readAscii(bytes, sOff + 4, 12);
		const gvS = bytes[sOff + 0x11] ?? 64;
		const sFlags = bytes[sOff + 0x12] ?? 0;
		const defVol = bytes[sOff + 0x13] ?? 64;
		const sName = readAscii(bytes, sOff + 0x14, 26);
		const cvt = bytes[sOff + 0x2e] ?? 0;
		const dfP = bytes[sOff + 0x2f] ?? 0x20;

		const sLength = sView.getUint32(0x30, true);
		const loopStart = sView.getUint32(0x34, true);
		const loopEnd = sView.getUint32(0x38, true);
		const c5Speed = sView.getUint32(0x3c, true) || 8363;
		const sampleDataPointer = sView.getUint32(0x48, true);

		const is16Bit = (sFlags & 2) !== 0;
		const hasLoop = (sFlags & 16) !== 0 && loopEnd > loopStart;
		const isSigned = (cvt & 1) !== 0;
		const isDelta = (cvt & 4) !== 0;

		// Read sample PCM data
		const sampleData = new Int16Array(sLength);
		if (
			(sFlags & 1) !== 0 &&
			sampleDataPointer > 0 &&
			sampleDataPointer < bytes.length
		) {
			let p = sampleDataPointer;
			if (is16Bit) {
				let last = 0;
				for (let i = 0; i < sLength && p + 1 < bytes.length; i++) {
					let val = view.getInt16(p, true);
					p += 2;
					if (isDelta) {
						last = (last + val) | 0;
						val = last;
					}
					sampleData[i] = val;
				}
			} else {
				let last = 0;
				for (let i = 0; i < sLength && p < bytes.length; i++) {
					const raw = bytes[p++] ?? 0;
					let val = isSigned ? (raw > 127 ? raw - 256 : raw) : raw - 128;
					if (isDelta) {
						last = (last + val) | 0;
						val = last;
					}
					sampleData[i] = Math.max(-32768, Math.min(32767, val << 8));
				}
			}
		}

		samples.push({
			name: sName || sFilename || `Sample ${s + 1}`,
			filename: sFilename,
			length: sLength,
			loopStart,
			loopEnd,
			c5Speed,
			volume: Math.min(64, defVol),
			globalVolume: Math.min(64, gvS),
			panning: (dfP & 128) !== 0 ? (dfP & 63) / 64 : 0.5,
			is16Bit,
			isStereo: false,
			hasLoop,
			data: sampleData,
		});
	}

	// Unpack patterns
	onProgress?.(0.35, "UNPACK_PATTERNS");
	const patterns: ItPattern[] = [];
	for (let pIdx = 0; pIdx < patternOffsets.length; pIdx++) {
		const pOff = patternOffsets[pIdx] ?? 0;
		if (pOff === 0 || pOff + 8 > bytes.length) {
			patterns.push({ rows: 64, data: [] });
			continue;
		}

		const pView = new DataView(
			bytes.buffer,
			bytes.byteOffset + pOff,
			Math.min(8, bytes.length - pOff),
		);
		const patLength = pView.getUint16(0, true);
		const rowsCount = pView.getUint16(2, true);

		const patRows: Map<number, ItPatternCell>[] = [];
		for (let r = 0; r < rowsCount; r++) {
			patRows.push(new Map());
		}

		const pEnd = Math.min(bytes.length, pOff + 8 + patLength);
		let pPtr = pOff + 8;

		const lastMask = new Uint8Array(64);
		const lastNote = new Uint8Array(64);
		const lastSample = new Uint8Array(64);
		const lastVol = new Uint8Array(64);
		const lastCmd = new Uint8Array(64);
		const lastParam = new Uint8Array(64);

		let curRow = 0;
		while (pPtr < pEnd && curRow < rowsCount) {
			const b = bytes[pPtr++] ?? 0;
			if (b === 0) {
				curRow++;
				continue;
			}

			const ch = (b - 1) & 63;
			let mask = lastMask[ch] ?? 0;
			if (b & 128) {
				mask = bytes[pPtr++] ?? 0;
				lastMask[ch] = mask;
			}

			const cell: ItPatternCell = {};

			if (mask & 1) {
				const n = bytes[pPtr++] ?? 0;
				lastNote[ch] = n;
				cell.note = n;
			}
			if (mask & 2) {
				const sNum = bytes[pPtr++] ?? 0;
				lastSample[ch] = sNum;
				cell.sample = sNum;
			}
			if (mask & 4) {
				const v = bytes[pPtr++] ?? 0;
				lastVol[ch] = v;
				cell.volume = v;
			}
			if (mask & 8) {
				const cmd = bytes[pPtr++] ?? 0;
				const param = bytes[pPtr++] ?? 0;
				lastCmd[ch] = cmd;
				lastParam[ch] = param;
				cell.command = cmd;
				cell.param = param;
			}

			if (mask & 16) {
				cell.note = lastNote[ch];
			}
			if (mask & 32) {
				cell.sample = lastSample[ch];
			}
			if (mask & 64) {
				cell.volume = lastVol[ch];
			}

			if (curRow < rowsCount) {
				const rowMap = patRows[curRow];
				if (rowMap) {
					rowMap.set(ch, cell);
				}
			}
		}

		patterns.push({ rows: rowsCount, data: patRows });
	}

	// Synthesize Audio to 16-bit linear PCM stereo WAV
	onProgress?.(0.5, "SYNTHESIZING_AUDIO");
	const sampleRate = options.sampleRate || 44100;
	const maxDuration = options.maxDurationSec || 180;
	const maxFrames = Math.floor(sampleRate * maxDuration);
	const gain = options.gain ?? 1.0;

	const channels: ChannelState[] = [];
	for (let ch = 0; ch < 64; ch++) {
		const pan = channelPan[ch] ?? 0.5;
		channels.push({
			samplePos: 0,
			step: 0,
			volume: channelVol[ch] ?? 1.0,
			panning: pan < 0 ? 0.5 : pan,
		});
	}

	const leftOut: number[] = [];
	const rightOut: number[] = [];

	let currentSpeed = initialSpeed;
	let currentTempo = initialTempo;
	let globalVolume = initialGV / 128;
	const mixVolume = initialMV / 128;

	let totalFramesRendered = 0;
	const ordersToPlay = orders.length > 0 ? orders : [0];

	for (
		let orderIdx = 0;
		orderIdx < ordersToPlay.length && totalFramesRendered < maxFrames;
		orderIdx++
	) {
		const patIdx = ordersToPlay[orderIdx] ?? 0;
		const pattern = patterns[patIdx];
		if (!pattern || pattern.rows === 0) continue;

		for (
			let row = 0;
			row < pattern.rows && totalFramesRendered < maxFrames;
			row++
		) {
			const rowData = pattern.data[row];

			// Process row note triggers
			if (rowData) {
				for (const [ch, cell] of rowData.entries()) {
					const state = channels[ch];
					if (!state) continue;

					if (cell.sample && cell.sample > 0 && cell.sample <= samples.length) {
						state.sample = samples[cell.sample - 1];
					}

					if (cell.volume !== undefined) {
						if (cell.volume <= 64) {
							state.volume = cell.volume / 64;
						} else if (cell.volume >= 128 && cell.volume <= 192) {
							state.panning = (cell.volume - 128) / 64;
						}
					}

					// Process note trigger
					if (cell.note !== undefined && cell.note < 120 && state.sample) {
						const semitones = cell.note - 60; // 60 is C-5
						const freq = state.sample.c5Speed * 2 ** (semitones / 12);
						state.step = freq / sampleRate;
						state.samplePos = 0;
					} else if (cell.note === 254) {
						// Note cut
						state.step = 0;
					}

					// Commands: A (speed), T (tempo), V (global volume)
					if (cell.command === 1 && cell.param) {
						// Speed
						currentSpeed = Math.max(1, cell.param);
					} else if (cell.command === 20 && cell.param) {
						// Tempo
						currentTempo = Math.max(32, cell.param);
					} else if (cell.command === 22 && cell.param !== undefined) {
						// Global volume
						globalVolume = Math.min(128, cell.param) / 128;
					}
				}
			}

			// Render ticks for this row
			const samplesPerTick = Math.floor((sampleRate * 2.5) / currentTempo);
			const rowFrames = samplesPerTick * currentSpeed;

			for (let f = 0; f < rowFrames && totalFramesRendered < maxFrames; f++) {
				let leftSum = 0;
				let rightSum = 0;

				for (let ch = 0; ch < 64; ch++) {
					const state = channels[ch];
					if (!state?.sample || state.step === 0) continue;

					const smp = state.sample;
					const idx = Math.floor(state.samplePos);

					if (idx < smp.length) {
						const sampleVal = smp.data[idx] ?? 0;
						const chVol =
							state.volume *
							(smp.volume / 64) *
							(smp.globalVolume / 64) *
							globalVolume *
							mixVolume;
						const lGain = Math.cos(state.panning * (Math.PI / 2)) * chVol;
						const rGain = Math.sin(state.panning * (Math.PI / 2)) * chVol;

						leftSum += sampleVal * lGain;
						rightSum += sampleVal * rGain;

						state.samplePos += state.step;
						if (smp.hasLoop && state.samplePos >= smp.loopEnd) {
							const loopSpan = smp.loopEnd - smp.loopStart;
							if (loopSpan > 0) {
								state.samplePos =
									smp.loopStart +
									((state.samplePos - smp.loopStart) % loopSpan);
							} else {
								state.step = 0;
							}
						} else if (!smp.hasLoop && state.samplePos >= smp.length) {
							state.step = 0;
						}
					} else {
						state.step = 0;
					}
				}

				leftOut.push(Math.max(-32768, Math.min(32767, leftSum * gain)));
				rightOut.push(Math.max(-32768, Math.min(32767, rightSum * gain)));
				totalFramesRendered++;
			}
		}
	}

	onProgress?.(0.9, "ENCODE_WAV");
	const numFrames = leftOut.length;
	const wavBytes = createWavFile(leftOut, rightOut, sampleRate, numFrames);

	onProgress?.(1.0, "COMPLETE");
	const metadata: ItMetadata = {
		title,
		channelCount: 64,
		orderCount: orders.length,
		patternCount: patterns.length,
		sampleCount: samples.length,
		instrumentCount: insNum,
		durationSec: numFrames / sampleRate,
		sampleRate,
	};

	return {
		wavBytes,
		metadata,
	};
}

function createWavFile(
	left: number[],
	right: number[],
	sampleRate: number,
	numFrames: number,
): Uint8Array {
	const dataSize = numFrames * 4; // 2 channels * 16-bit (2 bytes)
	const fileSize = 44 + dataSize;
	const buffer = new Uint8Array(fileSize);
	const view = new DataView(buffer.buffer);

	// "RIFF"
	buffer[0] = 0x52;
	buffer[1] = 0x49;
	buffer[2] = 0x46;
	buffer[3] = 0x46;
	view.setUint32(4, fileSize - 8, true);

	// "WAVE"
	buffer[8] = 0x57;
	buffer[9] = 0x41;
	buffer[10] = 0x56;
	buffer[11] = 0x45;

	// "fmt "
	buffer[12] = 0x66;
	buffer[13] = 0x6d;
	buffer[14] = 0x74;
	buffer[15] = 0x20;
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
	view.setUint16(22, 2, true); // NumChannels (2 = stereo)
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 4, true); // ByteRate
	view.setUint16(32, 4, true); // BlockAlign (2 channels * 2 bytes)
	view.setUint16(34, 16, true); // BitsPerSample (16-bit)

	// "data"
	buffer[36] = 0x64;
	buffer[37] = 0x61;
	buffer[38] = 0x74;
	buffer[39] = 0x61;
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < numFrames; i++) {
		const l = left[i] ?? 0;
		const r = right[i] ?? 0;
		view.setInt16(offset, l, true);
		view.setInt16(offset + 2, r, true);
		offset += 4;
	}

	return buffer;
}
