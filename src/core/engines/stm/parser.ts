import { writeWav } from "../audio/wav";
import type {
	StmConversionOptions,
	StmConversionResult,
	StmMetadata,
	StmSampleInfo,
} from "./types";

interface InternalSample {
	info: StmSampleInfo;
	pcmData: Float32Array;
}

interface StmEvent {
	note: number; // 0..59 semitones (C0=0), 254 = cut, 255 = empty
	ins: number; // 0 = none, 1..31
	vol: number; // 0..64, 65 = empty
	eff: number; // 0..15
	param: number;
}

interface ChannelState {
	sample?: InternalSample;
	samplePos: number;
	rate: number; // current Hz
	volume: number; // 0..64
	targetRate: number; // portamento destination
	vibPos: number;
}

const NOTE_EMPTY = 255;
const NOTE_CUT = 254;
const VOL_EMPTY = 65;

/** Middle C in STM is C-2 (note 24); the sample's c5rate plays exactly there. */
function stmNoteRate(note: number, c5rate: number): number {
	return c5rate * 2 ** ((note - 24) / 12);
}

// 64-entry sine table for vibrato, -1..1.
const SINE = Array.from({ length: 64 }, (_, i) =>
	Math.sin((i / 64) * Math.PI * 2),
);

// ST2 tempo factor constants, indexed by ticks-per-row (per format doc).
const FACTOR_CONSTANTS = [140, 50, 25, 15, 10, 7, 6, 4, 3, 3, 2, 2, 2, 2, 1, 1];

function samplesPerTick(mixingRate: number, tpr: number, fac: number): number {
	const t = Math.max(1, Math.min(16, tpr));
	const constant = FACTOR_CONSTANTS[t] ?? 1;
	let spt = Math.floor(mixingRate / (50 - Math.floor((constant * fac) / 16)));
	if (spt <= 0) spt += 65536;
	return Math.max(1, spt);
}

function cleanAscii(bytes: Uint8Array): string {
	let end = 0;
	while (end < bytes.length && bytes[end] !== 0) end++;
	return new TextDecoder("ascii").decode(bytes.subarray(0, end)).trim();
}

function decodeEvent(
	bytes: Uint8Array,
	pos: { idx: number },
): { event: StmEvent; next: number } {
	let b0 = bytes[pos.idx++] ?? 0;
	let b1 = 0;
	let b2 = 0;
	let b3 = 0;
	if (b0 === 252) {
		return {
			event: { note: NOTE_EMPTY, ins: 0, vol: VOL_EMPTY, eff: 0, param: 0 },
			next: pos.idx,
		};
	}
	if (b0 === 253) {
		return {
			event: { note: NOTE_CUT, ins: 0, vol: VOL_EMPTY, eff: 0, param: 0 },
			next: pos.idx,
		};
	}
	if (b0 === 251) {
		b0 = 0;
	} else {
		b1 = bytes[pos.idx++] ?? 0;
		b2 = bytes[pos.idx++] ?? 0;
		b3 = bytes[pos.idx++] ?? 0;
	}
	let note: number;
	if (b0 === NOTE_EMPTY || b0 === NOTE_CUT) {
		note = b0;
	} else {
		note = (b0 >> 4) * 12 + (b0 & 0x0f);
	}
	return {
		event: {
			note,
			ins: b1 >> 3,
			vol: (b1 & 0x07) | ((b2 >> 4) << 3),
			eff: b2 & 0x0f,
			param: b3,
		},
		next: pos.idx,
	};
}

/**
 * Converts Scream Tracker 2 modules (`.stm`, type 2 with internal samples)
 * into 16-bit 44.1kHz stereo WAV audio.
 *
 * Implements the v2 format per the community spec (cs127, from ST2/OpenMPT
 * sources): 4 channels × 64 rows, compressed pattern events, 31 samples
 * with loops, compound tempo, and effects A–K/O (L/M/N were never
 * implemented in ST2 and are ignored, as ST2 itself does). Pitch slides use
 * MOD-equivalent scaling and portamento converges exponentially — musical
 * approximations of ST2's exact integer math, noted here rather than hidden.
 * ST2 is mono; output is dual-mono. Type 1 songs (external .sts samples)
 * and v1 files fail with specific errors.
 */
export function convertStmToWav(
	input: ArrayBuffer | Uint8Array,
	options: StmConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): StmConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 0x410) {
		throw new Error(
			"Invalid STM file: smaller than the v2 header + sample table.",
		);
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	const title = cleanAscii(bytes.subarray(0, 20)) || "Untitled STM";
	const programId = cleanAscii(bytes.subarray(0x14, 0x1c)) || "unknown";
	const fileType = bytes[0x1d] ?? 0;
	const major = bytes[0x1e] ?? 0;
	const minor = bytes[0x1f] ?? 0;

	if (major !== 2) {
		throw new Error(
			`Unsupported STM version ${major}.${minor}: only Scream Tracker 2 modules (v2.x) convert.`,
		);
	}
	if (fileType !== 2) {
		throw new Error(
			"This is an STS song: its samples live in external files, not in this one. Only type-2 STM modules (internal samples) convert.",
		);
	}

	const versionString = `2.${minor}`;
	const hexTempo = minor >= 21;
	const is23 = minor === 3 || minor >= 30;
	const defaultC5Rate = is23 ? 8192 : 8448;

	const tempoByte = bytes[0x20] ?? 6;
	const numPatterns = bytes[0x21] ?? 0;
	let globalVolume = bytes[0x22] ?? 64;
	if (globalVolume === 0 || globalVolume > 64) globalVolume = 64;

	if (numPatterns < 1 || numPatterns > 98) {
		throw new Error(
			`Invalid STM pattern count (${numPatterns}). Expected 1..98.`,
		);
	}

	// Sample headers: 31 × 32 bytes at 0x30.
	const internalSamples: InternalSample[] = [];
	const sampleInfos: StmSampleInfo[] = [];
	for (let s = 0; s < 31; s++) {
		const base = 0x30 + s * 32;
		const name =
			cleanAscii(bytes.subarray(base, base + 13)) || `Sample ${s + 1}`;
		const posPara = view.getUint16(base + 0x0e, true);
		const length = view.getUint16(base + 0x10, true);
		const loopStart = view.getUint16(base + 0x12, true);
		const loopEnd = view.getUint16(base + 0x14, true);
		const defVol = Math.min(64, bytes[base + 0x16] ?? 64);
		let c5rate = view.getUint16(base + 0x18, true);
		if (c5rate === 0) c5rate = defaultC5Rate;
		const dataOff = posPara * 16;
		const looped = loopEnd > loopStart && loopEnd !== 0xffff && length > 0;
		const info: StmSampleInfo = {
			name,
			length,
			loopStart,
			loopEnd,
			looped,
			defaultVolume: defVol,
			middleCRate: c5rate,
		};
		sampleInfos.push(info);
		if (length > 0 && dataOff + length <= bytes.length) {
			const pcm = new Float32Array(length);
			for (let i = 0; i < length; i++) {
				const signed = (bytes[dataOff + i] ?? 0) - 128;
				pcm[i] = signed / 128;
			}
			internalSamples.push({ info, pcmData: pcm });
		} else {
			internalSamples.push({ info, pcmData: new Float32Array(0) });
		}
	}

	// Order list at 0x410 (128 bytes; 64 in the rare v2.00 layout — read up to 128 safely).
	const orders: number[] = [];
	const orderLen = Math.min(128, bytes.length - 0x410);
	for (let i = 0; i < orderLen; i++) {
		const ord = bytes[0x410 + i] ?? 99;
		if (ord === 98 || ord === 99) break;
		if (ord < numPatterns) orders.push(ord);
	}
	if (orders.length === 0) {
		throw new Error("STM order list is empty: nothing to play.");
	}

	// Patterns follow the order list; variable-length due to event compression.
	let patCursor = 0x410 + (minor === 0 ? 64 : 128);
	const patterns: StmEvent[][][] = [];
	for (let p = 0; p < numPatterns && patCursor < bytes.length; p++) {
		const pattern: StmEvent[][] = [];
		for (let row = 0; row < 64; row++) {
			const rowEvents: StmEvent[] = [];
			for (let ch = 0; ch < 4; ch++) {
				if (patCursor >= bytes.length) {
					rowEvents.push({
						note: NOTE_EMPTY,
						ins: 0,
						vol: VOL_EMPTY,
						eff: 0,
						param: 0,
					});
					continue;
				}
				const pos = { idx: patCursor };
				const { event, next } = decodeEvent(bytes, pos);
				patCursor = next;
				const fixed = { ...event };
				if (fixed.eff === 1) {
					// Effect A: pre-2.21 decimal compound → hex compound.
					if (!hexTempo)
						fixed.param = ((fixed.param / 10) | 0) * 16 + (fixed.param % 10);
				}
				// Gate version-locked effects to their versions.
				if (fixed.eff === 10 && minor < 24) fixed.eff = 0; // J is v2.24+
				if ((fixed.eff === 11 || fixed.eff === 15) && !is23) fixed.eff = 0; // K/O are v2.3+
				rowEvents.push(fixed);
			}
			pattern.push(rowEvents);
		}
		patterns.push(pattern);
	}

	onProgress?.(0.3, "RENDER");

	const targetSampleRate = options.sampleRate ?? 44100;
	const maxFrames = targetSampleRate * 300;
	const left = new Int32Array(maxFrames);
	const right = new Int32Array(maxFrames);
	let currentFrame = 0;

	const channels: ChannelState[] = Array.from({ length: 4 }, () => ({
		samplePos: 0,
		rate: 0,
		volume: 0,
		targetRate: 0,
		vibPos: 0,
	}));

	let tempo = tempoByte;
	const tempoParts = (t: number): [number, number] =>
		hexTempo ? [(t >> 4) & 0xf, t & 0xf] : [Math.floor(t / 10), t % 10];
	let pendingTempo: number | null = null;
	let nextOrderOverride: number | null = null;

	const gv = globalVolume / 64;
	let orderIdx = 0;
	let songDone = false;

	const triggerNote = (state: ChannelState, ev: StmEvent): void => {
		if (ev.eff === 1) pendingTempo = ev.param; // A: takes effect next row
		if (ev.ins > 0 && ev.ins <= internalSamples.length) {
			const smp = internalSamples[ev.ins - 1];
			if (smp && smp.pcmData.length > 0) {
				state.sample = smp;
				state.samplePos = 0;
				// ST2.3 quirk: instrument alone restarts the sample.
				if (ev.note === NOTE_EMPTY || ev.note === NOTE_CUT) {
					state.volume = smp.info.defaultVolume;
					state.rate = stmNoteRate(24, smp.info.middleCRate);
					state.targetRate = state.rate;
					return;
				}
			}
		}
		if (ev.note === NOTE_CUT) {
			state.volume = 0;
			state.rate = 0;
			return;
		}
		if (
			ev.note !== NOTE_EMPTY &&
			state.sample &&
			state.sample.pcmData.length > 0
		) {
			state.samplePos = 0;
			state.rate = stmNoteRate(ev.note, state.sample.info.middleCRate);
			state.targetRate = state.rate;
			state.volume =
				ev.vol !== VOL_EMPTY ? ev.vol : state.sample.info.defaultVolume;
			state.vibPos = 0;
		} else if (ev.vol !== VOL_EMPTY) {
			state.volume = ev.vol;
		}
	};

	const applyTickEffect = (state: ChannelState, ev: StmEvent): void => {
		const p = ev.param;
		const hi = (p >> 4) & 0xf;
		const lo = p & 0xf;
		switch (ev.eff) {
			case 4: {
				// D: volume slide (no fine slides in ST2).
				state.volume = Math.max(0, Math.min(64, state.volume + hi - lo));
				break;
			}
			case 5:
			case 6: {
				// E/F: pitch slide, MOD-equivalent param/64 semitones per tick.
				const dir = ev.eff === 5 ? -1 : 1;
				state.rate *= 2 ** ((dir * p) / (12 * 64));
				break;
			}
			case 7: {
				// G: portamento toward the last triggered note.
				if (state.targetRate > 0 && state.rate > 0) {
					const step = Math.max(1, p * 2);
					if (state.rate < state.targetRate)
						state.rate = Math.min(state.targetRate, state.rate + step);
					else state.rate = Math.max(state.targetRate, state.rate - step);
				}
				break;
			}
			case 8: {
				// H: vibrato (ST3-style depth; pre-2.3 doubled depth ignored).
				state.vibPos = (state.vibPos + hi) % 64;
				break;
			}
			case 9: {
				// I: tremor — evaluated at render time from the row tick; nothing stored.
				break;
			}
			case 10: {
				// J: arpeggio — evaluated at render time; nothing stored.
				break;
			}
			case 11:
			case 15: {
				// K/O: volume slide + vibrato/portamento.
				state.volume = Math.max(0, Math.min(64, state.volume + hi - lo));
				if (ev.eff === 11) state.vibPos = (state.vibPos + hi) % 64;
				else if (state.targetRate > 0 && state.rate > 0) {
					const step = Math.max(1, p * 2);
					if (state.rate < state.targetRate)
						state.rate = Math.min(state.targetRate, state.rate + step);
					else state.rate = Math.max(state.targetRate, state.rate - step);
				}
				break;
			}
			default:
				break;
		}
	};

	const vibOffset = (state: ChannelState, ev: StmEvent): number => {
		if (ev.eff !== 8 && ev.eff !== 11) return 1;
		const depth = (ev.param & 0xf) / 16; // peak semitones (ST3-scale approximation)
		return 2 ** (((SINE[state.vibPos % 64] ?? 0) * depth) / 12);
	};

	while (!songDone && orderIdx < orders.length && currentFrame < maxFrames) {
		const patIdx = orders[orderIdx];
		if (patIdx === undefined) break;
		const pattern = patterns[patIdx];
		if (!pattern) {
			orderIdx++;
			continue;
		}
		if (pendingTempo !== null) {
			tempo = pendingTempo;
			pendingTempo = null;
		}
		const [tprRaw, facRaw] = tempoParts(tempo);
		let tpr = Math.max(1, tprRaw);
		let fac = Math.min(15, facRaw);

		let breakToNext = false;
		for (
			let row = 0;
			row < 64 && !breakToNext && currentFrame < maxFrames;
			row++
		) {
			if (pendingTempo !== null) {
				tempo = pendingTempo;
				pendingTempo = null;
				const [ntpr, nfac] = tempoParts(tempo);
				tpr = Math.max(1, ntpr);
				fac = Math.min(15, nfac);
			}
			const spt = samplesPerTick(targetSampleRate, tpr, fac);
			const rowEvents = pattern[row];
			if (!rowEvents) continue;

			for (let ch = 0; ch < 4; ch++) {
				const ev = rowEvents[ch];
				const state = channels[ch];
				if (!ev || !state) continue;
				triggerNote(state, ev);
				if (ev.eff === 2) {
					nextOrderOverride = ev.param; // B: override only, no jump
				} else if (ev.eff === 3) {
					breakToNext = true; // C: break (param ignored in ST2)
				}
			}

			for (let tick = 0; tick < tpr && currentFrame < maxFrames; tick++) {
				// Tick effects (slides, vibrato position) advance once per tick…
				for (let ch = 0; ch < 4; ch++) {
					const ev = rowEvents[ch];
					const state = channels[ch];
					if (!ev || !state?.sample || state.rate <= 0) continue;
					if (tick > 0) applyTickEffect(state, ev);
				}
				// …then spt sample frames render at the tick's state.
				for (let f = 0; f < spt && currentFrame < maxFrames; f++) {
					let mix = 0;
					for (let ch = 0; ch < 4; ch++) {
						const ev = rowEvents[ch];
						const state = channels[ch];
						if (!ev || !state?.sample || state.rate <= 0) continue;

						let vol = state.volume;
						if (ev.eff === 9) {
							const hi = (ev.param >> 4) & 0xf;
							const lo = ev.param & 0xf;
							const cycle = hi + 1 + lo + 1;
							if (tick % cycle >= hi + 1) vol = 0;
						}
						let rate = state.rate * vibOffset(state, ev);
						if (ev.eff === 10) {
							const arp =
								[0, (ev.param >> 4) & 0xf, ev.param & 0xf][tick % 3] ?? 0;
							rate *= 2 ** (arp / 12);
						}
						const step = rate / targetSampleRate;
						const smp = state.sample;
						let idx = Math.floor(state.samplePos);
						if (idx >= smp.pcmData.length) {
							if (smp.info.looped && smp.info.loopEnd > smp.info.loopStart) {
								state.samplePos = smp.info.loopStart;
								idx = Math.floor(state.samplePos);
							} else {
								state.rate = 0;
								continue;
							}
						}
						mix += (smp.pcmData[idx] ?? 0) * (vol / 64) * gv;
						state.samplePos += step;
					}
					const clamped = Math.max(-1, Math.min(1, mix * 0.5));
					left[currentFrame] = Math.round(clamped * 32767);
					right[currentFrame] = Math.round(clamped * 32767);
					currentFrame++;
				}
				onProgress?.(0.3 + 0.5 * (currentFrame / maxFrames), "RENDER");
			}
		}

		if (breakToNext) {
			orderIdx = nextOrderOverride ?? orderIdx + 1;
			nextOrderOverride = null;
		} else {
			orderIdx = nextOrderOverride ?? orderIdx + 1;
			nextOrderOverride = null;
		}
		if (orderIdx >= orders.length) songDone = true;
	}

	onProgress?.(0.85, "ENCODE_WAV");
	const finalFrames = Math.max(targetSampleRate, currentFrame);
	const wavBuffer = writeWav({
		sampleRate: targetSampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [left.subarray(0, finalFrames), right.subarray(0, finalFrames)],
	});

	const metadata: StmMetadata = {
		title,
		programId,
		version: versionString,
		fileType,
		tempoByte: tempo,
		numPatterns,
		globalVolume,
		numSamples: 31,
		samples: sampleInfos,
		durationSeconds: currentFrame / targetSampleRate,
	};

	onProgress?.(1.0, "COMPLETE");
	return { metadata, wavBytes: new Uint8Array(wavBuffer) };
}
