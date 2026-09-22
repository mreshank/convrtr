import { writeWav } from "../audio/wav";
import type {
	UltConversionOptions,
	UltConversionResult,
	UltMetadata,
	UltSampleInfo,
} from "./types";

interface InternalSample {
	info: UltSampleInfo;
	pcmData: Float32Array;
}

interface UltEvent {
	note: number; // 0 = none, else 1..96 (ULT note byte)
	ins: number;
	fx1: number; // 0..15, 0 = none
	p1: number;
	fx2: number;
	p2: number;
}

interface ChannelState {
	sample?: InternalSample;
	samplePos: number;
	dir: number; // pingpong direction
	rate: number;
	volume: number; // 0..64
	targetRate: number;
	pan: number; // 0..1
	vibPos: number;
	retrigCount: number;
	retrigRate: number;
}

const SINE = Array.from({ length: 64 }, (_, i) =>
	Math.sin((i / 64) * Math.PI * 2),
);

/** ULT note byte b (1..96) → MIDI-ish semitone; b=37 is middle C. */
function ultNoteRate(b: number, c5rate: number): number {
	return c5rate * 2 ** ((b + 23 - 60) / 12);
}

function cleanPadded(bytes: Uint8Array): string {
	let end = bytes.length;
	while (end > 0 && (bytes[end - 1] === 0 || bytes[end - 1] === 32)) end--;
	return new TextDecoder("ascii").decode(bytes.subarray(0, end)).trim();
}

/**
 * Converts UltraTracker modules (`.ult`, v1–v4) into 16-bit 44.1kHz WAV.
 *
 * Implements the format per OpenMPT's Load_ult.cpp: 48-byte MAS_UTrack_V00
 * header, 66/64-byte sample headers (8/16-bit, loops incl. pingpong,
 * doubled C5 rates), 256-entry orders (0xFF end, 0xFE skip), dual-command
 * pattern events with 0xFC repeats, and the translated effect set (arpeggio,
 * portamento, vibrato, tremolo, offset, volume slide, panning, volume,
 * pattern break, retrig, speed/tempo with the F00→6/125 postfix rule).
 * Obscure specials (backwards play, E8/EA/EB beyond volslide, EC/ED) are
 * ignored exactly where OpenMPT documents them as unhandled. Timing is
 * MOD-style ticks (speed rows, 2.5×tempo reference) — the musical
 * equivalent of ULT's IT-compat playback.
 */
export function convertUltToWav(
	input: ArrayBuffer | Uint8Array,
	options: UltConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): UltConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 48) {
		throw new Error("Invalid ULT file: smaller than the 48-byte header.");
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const sig = new TextDecoder("ascii").decode(bytes.subarray(0, 14));
	if (sig !== "MAS_UTrack_V00") {
		throw new Error(
			`Invalid ULT file: bad signature (expected MAS_UTrack_V00).`,
		);
	}
	const version = bytes[14] ?? 0;
	if (version < 0x31 || version > 0x34) {
		throw new Error(`Unsupported ULT version (expected '1'..'4').`);
	}
	const title = cleanPadded(bytes.subarray(15, 47)) || "Untitled ULT";
	const messageLength = bytes[47] ?? 0;
	let off = 48 + messageLength * 32;

	const numSamples = bytes[off] ?? 0;
	off += 1;
	if (numSamples < 1 || numSamples > 99) {
		throw new Error(
			`Invalid ULT sample count (${numSamples}). Expected 1..99.`,
		);
	}

	const internalSamples: InternalSample[] = [];
	const sampleInfos: UltSampleInfo[] = [];
	for (let s = 0; s < numSamples; s++) {
		const hdrLen = version >= 0x34 ? 66 : 64;
		if (off + hdrLen > bytes.length) {
			throw new Error("Truncated ULT sample header.");
		}
		const name = cleanPadded(bytes.subarray(off, off + 32));
		const loopStart = view.getUint32(off + 44, true);
		const loopEnd = view.getUint32(off + 48, true);
		const sizeStart = view.getUint32(off + 52, true);
		const sizeEnd = view.getUint32(off + 56, true);
		const volume = bytes[off + 60] ?? 64;
		const flags = bytes[off + 61] ?? 0;
		let speed: number;
		let finetune = 0;
		if (version >= 0x34) {
			speed = view.getUint16(off + 62, true);
			finetune = view.getInt16(off + 64, true);
		} else {
			speed = 8363;
			finetune = view.getInt16(off + 62, true);
		}
		const is16 = (flags & 4) !== 0;
		const looped = (flags & 8) !== 0;
		const pingpong = (flags & 16) !== 0;
		off += hdrLen;

		const byteLen = sizeEnd > sizeStart ? sizeEnd - sizeStart : 0;
		const frameCount = is16 ? Math.floor(byteLen / 2) : byteLen;
		const info: UltSampleInfo = {
			name: name || `Sample ${s + 1}`,
			length: frameCount,
			loopStart: is16 ? Math.floor(loopStart / 2) : loopStart,
			loopEnd: is16 ? Math.floor(loopEnd / 2) : loopEnd,
			looped: looped && loopEnd > loopStart,
			pingpong,
			bits: is16 ? 16 : 8,
			volume,
			c5rate: Math.round(speed * 2 * 2 ** (finetune / (12 * 32768))),
		};
		sampleInfos.push(info);
		internalSamples.push({
			info,
			pcmData: new Float32Array(0),
			dataOff: 0,
		} as unknown as InternalSample & { dataOff: number });
		(internalSamples[s] as unknown as { dataOff: number }).dataOff = -1;
	}

	// Orders: 256 bytes, 0xFF end, 0xFE skip.
	const orders: number[] = [];
	for (let i = 0; i < 256 && off + i < bytes.length; i++) {
		const o = bytes[off + i] ?? 0xff;
		if (o === 0xff) break;
		if (o === 0xfe) continue;
		orders.push(o);
	}
	off += 256;
	if (orders.length === 0) {
		throw new Error("ULT order list is empty: nothing to play.");
	}

	if (off + 2 > bytes.length)
		throw new Error("Truncated ULT channel/pattern counts.");
	const numChannels = (bytes[off] ?? 0) + 1;
	off += 1;
	const numPatterns = (bytes[off] ?? 0) + 1;
	off += 1;
	if (numChannels < 1 || numChannels > 32) {
		throw new Error(
			`Invalid ULT channel count (${numChannels}). Expected 1..32.`,
		);
	}
	if (numPatterns < 1 || numPatterns > 256) {
		throw new Error(`Invalid ULT pattern count (${numPatterns}).`);
	}

	const pans: number[] = [];
	for (let ch = 0; ch < numChannels; ch++) {
		if (off >= bytes.length) throw new Error("Truncated ULT pan table.");
		const pb = bytes[off++] ?? 0;
		pans.push(
			version >= 0x33
				? (((pb & 0x0f) << 4) + 8) / 255
				: ch % 2 === 1
					? 192 / 255
					: 64 / 255,
		);
	}

	// Patterns: per channel per pattern, 0xFC-prefixed repeats, 64 rows.
	const patterns: UltEvent[][][] = [];
	for (let pat = 0; pat < numPatterns; pat++) {
		patterns.push([]);
	}
	for (let ch = 0; ch < numChannels; ch++) {
		for (let pat = 0; pat < numPatterns; pat++) {
			const rows: UltEvent[][] = patterns[pat] as UltEvent[][];
			while (rows.length < 64) rows.push([]);
			let row = 0;
			while (row < 64 && off < bytes.length) {
				let repeat = 1;
				let b = bytes[off++] ?? 0;
				if (b === 0xfc) {
					repeat = bytes[off++] ?? 1;
					b = bytes[off++] ?? 0;
				}
				if (off + 4 > bytes.length) break;
				const ins = bytes[off++] ?? 0;
				const cmd = bytes[off++] ?? 0;
				const para1 = bytes[off++] ?? 0;
				const para2 = bytes[off++] ?? 0;
				const ev = translateUltEvent(b, ins, cmd, para1, para2, version);
				repeat = Math.min(repeat, 64 - row);
				if (repeat === 0) break;
				for (let r = 0; r < repeat && row < 64; r++, row++) {
					(rows[row] as UltEvent[])[ch] = { ...ev };
				}
			}
		}
	}
	// Normalize rows to full channel width.
	for (const pat of patterns) {
		for (const row of pat) {
			while (row.length < numChannels) {
				row.push({ note: 0, ins: 0, fx1: 0, p1: 0, fx2: 0, p2: 0 });
			}
		}
	}

	// Sample data, appended in sample order.
	for (const smp of internalSamples) {
		const st = smp as unknown as { dataOff: number };
		const frames = smp.info.length;
		if (frames <= 0) continue;
		const is16 = smp.info.bits === 16;
		const need = frames * (is16 ? 2 : 1);
		if (off + need > bytes.length) continue;
		const pcm = new Float32Array(frames);
		if (is16) {
			for (let i = 0; i < frames; i++) {
				pcm[i] = view.getInt16(off + i * 2, true) / 32768;
			}
		} else {
			// Signed 8-bit PCM (ULT stores signed, unlike STM's song path).
			for (let i = 0; i < frames; i++) {
				const b = bytes[off + i] ?? 0;
				pcm[i] = (b > 127 ? b - 256 : b) / 128;
			}
		}
		off += need;
		smp.pcmData = pcm;
		st.dataOff = 0;
	}

	onProgress?.(0.35, "RENDER");

	const targetSampleRate = options.sampleRate ?? 44100;
	const maxFrames = targetSampleRate * 300;
	const left = new Int32Array(maxFrames);
	const right = new Int32Array(maxFrames);
	let currentFrame = 0;

	const channels: ChannelState[] = Array.from(
		{ length: numChannels },
		(_, i) => ({
			samplePos: 0,
			dir: 1,
			rate: 0,
			volume: 0,
			targetRate: 0,
			pan: pans[i] ?? 0.5,
			vibPos: 0,
			retrigCount: 0,
			retrigRate: 0,
		}),
	);

	let speed = 6;
	let tempo = 125;
	let orderIdx = 0;
	let songDone = false;

	const spt = (): number =>
		Math.max(1, Math.floor((targetSampleRate * 2.5) / Math.max(20, tempo)));

	const triggerNote = (state: ChannelState, ev: UltEvent): void => {
		if (ev.ins > 0 && ev.ins <= internalSamples.length) {
			const smp = internalSamples[ev.ins - 1];
			if (smp && smp.pcmData.length > 0) {
				state.sample = smp;
				state.samplePos = 0;
				state.dir = 1;
				if (ev.note === 0) {
					state.volume = Math.min(64, Math.round((smp.info.volume / 255) * 64));
					state.rate = ultNoteRate(37, smp.info.c5rate);
					state.targetRate = state.rate;
					return;
				}
			}
		}
		if (
			ev.note >= 1 &&
			ev.note <= 96 &&
			state.sample &&
			state.sample.pcmData.length > 0
		) {
			state.samplePos = 0;
			state.dir = 1;
			state.rate = ultNoteRate(ev.note, state.sample.info.c5rate);
			state.targetRate = state.rate;
			state.volume = Math.min(
				64,
				Math.round((state.sample.info.volume / 255) * 64),
			);
			state.vibPos = 0;
			state.retrigCount = 0;
		}
	};

	while (!songDone && orderIdx < orders.length && currentFrame < maxFrames) {
		const patIdx = orders[orderIdx];
		if (patIdx === undefined || patIdx >= patterns.length) {
			orderIdx++;
			continue;
		}
		const pattern = patterns[patIdx];
		if (!pattern) {
			orderIdx++;
			continue;
		}
		let breakRow: number | null = null;
		for (let row = 0; row < 64 && currentFrame < maxFrames; row++) {
			const rowEvents = pattern[row];
			if (!rowEvents) continue;

			for (let ch = 0; ch < numChannels; ch++) {
				const ev = rowEvents[ch];
				const state = channels[ch];
				if (!ev || !state) continue;
				triggerNote(state, ev);
				applyCommands(state, ev, true);
				if (ev.fx1 === 13 || ev.fx2 === 13) {
					const p = ev.fx1 === 13 ? ev.p1 : ev.p2;
					breakRow = 10 * ((p >> 4) & 0xf) + (p & 0xf);
				}
				if (ev.fx1 === 15 || ev.fx2 === 15) {
					const p = ev.fx1 === 15 ? ev.p1 : ev.p2;
					if (p === 0) {
						speed = 6;
						tempo = 125;
					} else if (p <= 0x2f) {
						speed = Math.max(1, p);
					} else {
						tempo = p;
					}
				}
			}

			const ticks = Math.max(1, speed);
			for (let tick = 0; tick < ticks && currentFrame < maxFrames; tick++) {
				for (let ch = 0; ch < numChannels; ch++) {
					const ev = rowEvents[ch];
					const state = channels[ch];
					if (!ev || !state?.sample || state.rate <= 0) continue;
					applyCommands(state, ev, tick === 0);
					if (state.retrigRate > 0) {
						state.retrigCount++;
						if (state.retrigCount >= state.retrigRate) {
							state.retrigCount = 0;
							state.samplePos = 0;
							state.dir = 1;
						}
					}
				}
				const frames = spt();
				for (let f = 0; f < frames && currentFrame < maxFrames; f++) {
					let mixL = 0;
					let mixR = 0;
					for (let ch = 0; ch < numChannels; ch++) {
						const ev = rowEvents[ch];
						const state = channels[ch];
						if (!ev || !state?.sample || state.rate <= 0) continue;
						let vol = state.volume;
						vol = applyFrameFx(state, ev, vol, tick);
						let rate = state.rate * vibNow(state, ev);
						rate = applyArp(ev, tick, rate);
						const step = rate / targetSampleRate;
						const smp = state.sample;
						let idx = Math.floor(state.samplePos);
						if (idx >= smp.pcmData.length) {
							if (smp.info.looped && smp.info.loopEnd > smp.info.loopStart) {
								if (smp.info.pingpong) {
									state.dir = -1;
									state.samplePos = smp.info.loopEnd - 1;
								} else {
									state.samplePos = smp.info.loopStart;
								}
								idx = Math.floor(state.samplePos);
							} else {
								state.rate = 0;
								continue;
							}
						}
						if (smp.info.pingpong && smp.info.looped) {
							if (state.samplePos >= smp.info.loopEnd) {
								state.dir = -1;
								state.samplePos = smp.info.loopEnd - 1;
							} else if (state.samplePos < smp.info.loopStart) {
								state.dir = 1;
								state.samplePos = smp.info.loopStart;
							}
						}
						mixL += (smp.pcmData[idx] ?? 0) * (vol / 64) * (1 - state.pan);
						mixR += (smp.pcmData[idx] ?? 0) * (vol / 64) * state.pan;
						state.samplePos += step * state.dir;
					}
					left[currentFrame] = Math.round(
						Math.max(-1, Math.min(1, mixL * 0.5)) * 32767,
					);
					right[currentFrame] = Math.round(
						Math.max(-1, Math.min(1, mixR * 0.5)) * 32767,
					);
					currentFrame++;
				}
			}
			if (breakRow !== null) {
				row = breakRow - 1; // jump within pattern (row++ lands on target)
				if (row < -1) row = -1;
				if (row >= 63) break;
				breakRow = null;
			}
		}
		orderIdx++;
		if (orderIdx >= orders.length) songDone = true;
	}

	onProgress?.(0.9, "ENCODE_WAV");
	const finalFrames = Math.max(targetSampleRate, currentFrame);
	const wavBuffer = writeWav({
		sampleRate: targetSampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [left.subarray(0, finalFrames), right.subarray(0, finalFrames)],
	});

	const metadata: UltMetadata = {
		title,
		version: String.fromCharCode(version),
		numSamples,
		numChannels,
		numPatterns,
		samples: sampleInfos,
		durationSeconds: currentFrame / targetSampleRate,
	};

	onProgress?.(1.0, "COMPLETE");
	return { metadata, wavBytes: new Uint8Array(wavBuffer) };

	function applyCommands(
		state: ChannelState,
		ev: UltEvent,
		first: boolean,
	): void {
		for (const [fx, p] of [
			[ev.fx1, ev.p1],
			[ev.fx2, ev.p2],
		] as const) {
			if (fx === 0 || fx === 10) continue; // arp handled at render; J index differs
			applyCommand(state, fx, p, first);
		}
	}

	function applyCommand(
		state: ChannelState,
		fx: number,
		p: number,
		first: boolean,
	): void {
		const hi = (p >> 4) & 0xf;
		const lo = p & 0xf;
		switch (fx) {
			case 1:
			case 2: {
				const dir = fx === 1 ? 1 : -1;
				state.rate *= 2 ** ((dir * p) / (12 * 64));
				break;
			}
			case 3: {
				// Tone portamento toward last note: exponential approach.
				if (state.targetRate > 0 && state.rate > 0) {
					state.rate += (state.targetRate - state.rate) * Math.min(1, p / 64);
				}
				break;
			}
			case 4: {
				state.vibPos = (state.vibPos + 1) % 64;
				break;
			}
			case 7: {
				// Tremolo position advances; depth applied at render.
				state.vibPos = (state.vibPos + 1) % 64;
				break;
			}
			case 9: {
				// Offset: jump into the sample once, at trigger tick only.
				if (first && state.sample && p > 0) {
					state.samplePos = Math.min(p * 4, state.sample.pcmData.length - 1);
				}
				break;
			}
			case 10: {
				state.volume = Math.max(0, Math.min(64, state.volume + hi - lo));
				break;
			}
			case 11: {
				state.pan = Math.max(0, Math.min(1, ((hi << 4) | lo) / 255));
				break;
			}
			case 12: {
				state.volume = Math.max(0, Math.min(64, Math.round((p / 255) * 64)));
				break;
			}
			case 14: {
				// E special subset.
				const sub = hi;
				if (sub === 9) {
					state.retrigCount = 0;
					state.retrigRate = Math.max(1, lo);
				} else if (sub === 10 || sub === 11) {
					state.volume = Math.max(
						0,
						Math.min(64, state.volume + (sub === 10 ? lo : -lo)),
					);
				} else if (sub === 12) {
					state.rate = 0; // EC: note cut
				}
				// ED (note delay) has no row-deferred trigger model here: ignored.
				break;
			}
			default:
				break;
		}
	}

	function vibNow(state: ChannelState, ev: UltEvent): number {
		const fx = ev.fx1 === 4 ? ev.fx1 : ev.fx2 === 4 ? ev.fx2 : -1;
		if (fx !== 4 || state.rate <= 0) return 1;
		return 2 ** ((SINE[state.vibPos % 64] ?? 0) / 16 / 12);
	}

	function applyArp(ev: UltEvent, tick: number, rate: number): number {
		const arpParam = ev.fx1 === 0 ? ev.p1 : ev.fx2 === 0 ? ev.p2 : 0;
		if (arpParam === 0) return rate;
		const steps = [0, (arpParam >> 4) & 0xf, arpParam & 0xf];
		return rate * 2 ** ((steps[tick % 3] ?? 0) / 12);
	}

	function applyFrameFx(
		state: ChannelState,
		ev: UltEvent,
		vol: number,
		tick: number,
	): number {
		let v = vol;
		// Tremolo gate (row-tick based).
		const hasTrem = ev.fx1 === 7 || ev.fx2 === 7;
		if (hasTrem) {
			const depth = 8;
			v *= 1 - ((((SINE[state.vibPos % 64] ?? 0) + 1) / 2) * depth) / 64;
		}
		void tick;
		return Math.max(0, Math.min(64, v));
	}
}

function translateUltEvent(
	b: number,
	ins: number,
	cmd: number,
	para1: number,
	para2: number,
	version: number,
): UltEvent {
	const ev: UltEvent = {
		note: b > 0 && b < 97 ? b : 0,
		ins,
		fx1: 0,
		p1: 0,
		fx2: 0,
		p2: 0,
	};
	const t1 = translateCmd(cmd & 0x0f, para1, version);
	const t2 = translateCmd(cmd >> 4, para2, version);
	// Second command wins ties (OpenMPT: don't overthink shared slots).
	ev.fx2 = t2[0];
	ev.p2 = t2[1];
	ev.fx1 = t1[0];
	ev.p1 = t1[1];
	if (t1[0] === t2[0] && t1[0] !== 0) ev.fx2 = 0;
	return ev;
}

function translateCmd(
	e: number,
	param: number,
	version: number,
): [number, number] {
	const p = param;
	switch (e) {
		case 0x00:
			return p === 0 || version < 0x33 ? [0, 0] : [0, p]; // arp (internal code 0)
		case 0x01:
			return [1, p];
		case 0x02:
			return [2, p];
		case 0x03:
			return [3, p];
		case 0x04:
			return [4, p];
		case 0x05:
			if ((p & 0x0f) === 0x02 || (p & 0xf0) === 0x20) return [9, 0x9f];
			if (((p & 0x0f) === 0x0c || (p & 0xf0) === 0xc0) && version >= 0x33)
				return [16, 0];
			return [0, 0];
		case 0x06:
			return [0, 0];
		case 0x07:
			return version < 0x34 ? [0, 0] : [7, p];
		case 0x08:
			return [0, 0];
		case 0x09:
			return [9, p];
		case 0x0a:
			return (p & 0xf0) !== 0 ? [10, p & 0xf0] : [10, p];
		case 0x0b:
			return [11, (p & 0x0f) * 0x11];
		case 0x0c:
			return [12, p];
		case 0x0d:
			return [13, p];
		case 0x0e: {
			const sub = (p >> 4) & 0xf;
			const lo = p & 0xf;
			if (sub === 0x01) return [1, 0xf0 | lo];
			if (sub === 0x02) return [2, 0xf0 | lo];
			if (sub === 0x08 && version >= 0x34) return [14, 0x60 | lo];
			if (sub === 0x09) return [14, 0x90 | lo];
			if (sub === 0x0a) return [14, 0xa0 | lo];
			if (sub === 0x0b) return [14, 0xb0 | lo];
			if (sub === 0x0c || sub === 0x0d) return [14, 0xc0 | lo];
			return [14, p];
		}
		case 0x0f:
			return [15, p];
		default:
			return [0, 0];
	}
}
