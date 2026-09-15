import { writeWav } from "../audio/wav";
import type {
	AmfConversionOptions,
	AmfConversionResult,
	AmfMetadata,
	AmfSampleInfo,
} from "./types";

interface InternalSample {
	info: AmfSampleInfo;
	pcm: Float32Array;
}

interface ChannelVoice {
	sample?: InternalSample;
	samplePos: number;
	step: number;
	volume: number;
	panning: number; // 0..1
}

function cleanAscii(bytes: Uint8Array): string {
	let end = 0;
	while (end < bytes.length && bytes[end] !== 0) {
		end++;
	}
	return new TextDecoder("ascii").decode(bytes.subarray(0, end)).trim();
}

/**
 * Calculates playback frequency for a given note (1..84) and base C2Spd.
 * Note 49 corresponds to Middle C (C-4).
 */
function noteToFrequency(note: number, c2Spd: number): number {
	const base = c2Spd > 0 ? c2Spd : 8363.0;
	return base * 2.0 ** ((note - 49) / 12.0);
}

/**
 * Converts Advanced Music Format / ASYLUM Music Format (.amf) tracker audio
 * into 16-bit 44.1kHz stereo WAV.
 */
export function convertAmfToWav(
	input: ArrayBuffer | Uint8Array,
	options: AmfConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): AmfConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 64) {
		throw new Error("Invalid AMF file: Header size is smaller than 64 bytes.");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Detect signature: "AMF" or "ASYLUM Music Format V1.0"
	let formatVersion = "AMF";
	let isAsylum = false;
	let title = "";
	let numSamples = 0;
	let numOrders = 0;
	let numPatterns = 0;
	let numChannels = 16;
	let ptr = 0;

	const sig3 = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0);
	const sigAsylum = new TextDecoder("ascii")
		.decode(bytes.subarray(0, Math.min(bytes.length, 32)))
		.replace(/\0.*$/, "");

	if (sigAsylum.startsWith("ASYLUM Music Format")) {
		isAsylum = true;
		formatVersion = "ASYLUM 1.0";
		title = cleanAscii(bytes.subarray(32, 64));
		numSamples = bytes[64] ?? 0;
		numPatterns = bytes[65] ?? 0;
		numOrders = bytes[66] ?? 0;
		numChannels = 8;
		ptr = 68;
	} else if (sig3 === "AMF") {
		const ver = bytes[3] ?? 10;
		formatVersion = `AMF v${ver}`;
		title = cleanAscii(bytes.subarray(4, 36));
		numSamples = bytes[36] ?? 0;
		numOrders = bytes[37] ?? 0;
		numPatterns = bytes[38] ?? 0;
		numChannels = Math.min(32, Math.max(1, bytes[39] ?? 16));
		ptr = 40;
	} else {
		throw new Error(
			`Invalid AMF file: Expected signature 'AMF' or 'ASYLUM Music Format', found '${sig3}'.`,
		);
	}

	if (numSamples < 0 || numSamples > 128) {
		numSamples = 0;
	}

	onProgress?.(0.15, "READ_ORDERS");

	// Read Order Table
	const orders: number[] = [];
	for (let i = 0; i < numOrders; i++) {
		if (ptr < bytes.length) {
			const ord = bytes[ptr++] ?? 0xff;
			if (ord !== 0xff && (numPatterns === 0 || ord < numPatterns + 64)) {
				orders.push(ord);
			}
		}
	}
	if (orders.length === 0) {
		orders.push(0);
	}

	onProgress?.(0.25, "READ_SAMPLES");

	// Read Sample Headers
	const samples: InternalSample[] = [];
	const sampleMetaList: AmfSampleInfo[] = [];

	for (let i = 0; i < numSamples; i++) {
		if (ptr + 40 > bytes.length) break;

		let sName = "";
		let sLen = 0;
		let sLoopStart = 0;
		let sLoopEnd = 0;
		let sC2Spd = 8363;
		let sVol = 64;

		if (isAsylum) {
			sName = cleanAscii(bytes.subarray(ptr, ptr + 22));
			ptr += 22;
			sLen = view.getUint32(ptr, true);
			ptr += 4;
			sLoopStart = view.getUint32(ptr, true);
			ptr += 4;
			sLoopEnd = view.getUint32(ptr, true);
			ptr += 4;
			sVol = bytes[ptr++] ?? 64;
		} else {
			const _sType = bytes[ptr++] ?? 0;
			sName = cleanAscii(bytes.subarray(ptr, ptr + 32));
			ptr += 32;
			sLen = view.getUint32(ptr, true);
			ptr += 4;
			sC2Spd = view.getUint16(ptr, true) || 8363;
			ptr += 2;
			sVol = Math.min(64, bytes[ptr++] ?? 64);
			sLoopStart = view.getUint32(ptr, true);
			ptr += 4;
			sLoopEnd = view.getUint32(ptr, true);
			ptr += 4;
		}

		// Clamp sanity limits
		if (sLen > 1024 * 1024) {
			sLen = 0;
		}
		const hasLoop = sLoopEnd > sLoopStart && sLoopEnd <= sLen;

		const info: AmfSampleInfo = {
			index: i + 1,
			name: sName || `Sample ${i + 1}`,
			length: sLen,
			volume: sVol,
			c2Spd: sC2Spd,
			loopStart: sLoopStart,
			loopEnd: sLoopEnd,
			hasLoop,
		};
		sampleMetaList.push(info);
		samples.push({
			info,
			pcm: new Float32Array(0),
		});
	}

	onProgress?.(0.4, "READ_PATTERNS");

	// Pattern Data Structure
	interface NoteEvent {
		note: number;
		instrument: number;
		volume: number;
	}

	// Matrix of patterns: patternIdx -> rowIdx (0..63) -> channelIdx (0..numChannels-1)
	const patterns: NoteEvent[][][] = [];
	const maxPatterns = Math.max(
		numPatterns,
		orders.reduce((m, o) => Math.max(m, o + 1), 1),
	);

	for (let p = 0; p < maxPatterns; p++) {
		const patternRows: NoteEvent[][] = [];
		for (let r = 0; r < 64; r++) {
			const rowChannels: NoteEvent[] = [];
			for (let c = 0; c < numChannels; c++) {
				let note = 0;
				let inst = 0;
				let vol = -1;

				if (ptr + 3 <= bytes.length) {
					const b0 = bytes[ptr++] ?? 0;
					const b1 = bytes[ptr++] ?? 0;
					const b2 = bytes[ptr++] ?? 0;

					note = b0;
					inst = b1;
					vol = b2 <= 64 ? b2 : -1;
				}
				rowChannels.push({ note, instrument: inst, volume: vol });
			}
			patternRows.push(rowChannels);
		}
		patterns.push(patternRows);
	}

	onProgress?.(0.6, "READ_SAMPLE_DATA");

	// Read Sample PCM Audio Data
	for (let i = 0; i < samples.length; i++) {
		const sample = samples[i];
		if (!sample) continue;
		const sLen = sample.info.length;
		if (sLen > 0 && ptr < bytes.length) {
			const rawPcm = bytes.subarray(ptr, Math.min(bytes.length, ptr + sLen));
			ptr += sLen;

			const floatPcm = new Float32Array(rawPcm.length);
			for (let s = 0; s < rawPcm.length; s++) {
				// Convert 8-bit signed PCM to -1.0 .. 1.0 float
				const val = (rawPcm[s] ?? 128) - 128;
				floatPcm[s] = val / 128.0;
			}
			sample.pcm = floatPcm;
		}
	}

	onProgress?.(0.7, "SYNTHESIZE_AUDIO");

	// Synthesis parameters
	const sampleRate = options.sampleRate ?? 44100;
	const stereoSep = Math.max(0, Math.min(1, options.stereoSeparation ?? 0.8));
	const maxDuration = Math.max(1, options.maxDurationSeconds ?? 120);

	// Estimate BPM / Speed: standard 125 BPM, 6 ticks/row
	const rowDurationSeconds = 60.0 / (125.0 * 4.0); // approx 0.12s per row
	const samplesPerRow = Math.floor(sampleRate * rowDurationSeconds);

	// Compute total audio length
	const totalRows = orders.length * 64;
	const totalSamples = Math.min(
		totalRows * samplesPerRow,
		maxDuration * sampleRate,
	);

	const leftBuffer = new Float32Array(totalSamples);
	const rightBuffer = new Float32Array(totalSamples);

	// Setup Channel States
	const channels: ChannelVoice[] = [];
	for (let c = 0; c < numChannels; c++) {
		// Alternate stereo panning: even channels left, odd channels right
		const panSide = c % 2 === 0 ? -1 : 1;
		const panVal = 0.5 + 0.5 * panSide * stereoSep;
		channels.push({
			samplePos: 0,
			step: 0,
			volume: 1.0,
			panning: panVal,
		});
	}

	let sampleCursor = 0;

	// Playback Order / Row Sequencing
	orderLoop: for (const ord of orders) {
		const pattern = patterns[ord] ?? patterns[0];
		if (!pattern) continue;

		for (let rowIdx = 0; rowIdx < 64; rowIdx++) {
			const row = pattern[rowIdx];
			if (!row) continue;

			// Trigger notes on this row
			for (let c = 0; c < numChannels; c++) {
				const ch = channels[c];
				const ev = row[c];
				if (!ch || !ev) continue;

				if (ev.instrument > 0 && ev.instrument <= samples.length) {
					const s = samples[ev.instrument - 1];
					if (s) {
						ch.sample = s;
						ch.samplePos = 0;
						if (ev.volume >= 0) {
							ch.volume = Math.min(1.0, ev.volume / 64.0);
						} else {
							ch.volume = Math.min(1.0, s.info.volume / 64.0);
						}
					}
				}

				if (ev.note > 0 && ev.note <= 84 && ch.sample) {
					const freq = noteToFrequency(ev.note, ch.sample.info.c2Spd);
					ch.step = freq / sampleRate;
				}
			}

			// Render audio for this row
			for (let s = 0; s < samplesPerRow; s++) {
				if (sampleCursor >= totalSamples) {
					break orderLoop;
				}

				let mixL = 0;
				let mixR = 0;

				for (let c = 0; c < numChannels; c++) {
					const ch = channels[c];
					if (!ch?.sample || ch.step <= 0) continue;

					const pcm = ch.sample.pcm;
					const pcmLen = pcm.length;
					if (pcmLen === 0) continue;

					const idx0 = Math.floor(ch.samplePos);
					const frac = ch.samplePos - idx0;
					const idx1 = idx0 + 1 < pcmLen ? idx0 + 1 : idx0;

					const sampleVal =
						((1 - frac) * (pcm[idx0] ?? 0) + frac * (pcm[idx1] ?? 0)) *
						ch.volume;

					// Stereo panning
					mixL += sampleVal * (1 - ch.panning);
					mixR += sampleVal * ch.panning;

					// Advance voice cursor
					ch.samplePos += ch.step;
					if (ch.sample.info.hasLoop) {
						const loopStart = ch.sample.info.loopStart;
						const loopEnd = ch.sample.info.loopEnd;
						if (ch.samplePos >= loopEnd) {
							ch.samplePos =
								loopStart +
								((ch.samplePos - loopStart) % (loopEnd - loopStart));
						}
					} else if (ch.samplePos >= pcmLen) {
						ch.sample = undefined;
					}
				}

				leftBuffer[sampleCursor] = mixL;
				rightBuffer[sampleCursor] = mixR;
				sampleCursor++;
			}
		}
	}

	onProgress?.(0.9, "ENCODE_WAV");

	// Encode to 16-bit PCM stereo WAV
	const numRenderedSamples = Math.max(1, sampleCursor);
	const leftInt = new Int32Array(numRenderedSamples);
	const rightInt = new Int32Array(numRenderedSamples);

	for (let i = 0; i < numRenderedSamples; i++) {
		const l = Math.max(-1.0, Math.min(1.0, leftBuffer[i] ?? 0));
		const r = Math.max(-1.0, Math.min(1.0, rightBuffer[i] ?? 0));

		leftInt[i] = Math.round(l * 32767);
		rightInt[i] = Math.round(r * 32767);
	}

	const wavBuffer = writeWav({
		sampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [leftInt, rightInt],
	});

	const metadata: AmfMetadata = {
		title: title || "Untitled AMF Module",
		formatVersion,
		channels: numChannels,
		numOrders: orders.length,
		numPatterns,
		numSamples,
		samples: sampleMetaList,
		durationSeconds: Math.round((numRenderedSamples / sampleRate) * 10) / 10,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		wavBuffer,
		metadata,
	};
}
