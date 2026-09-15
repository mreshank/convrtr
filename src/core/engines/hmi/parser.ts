import { writeWav } from "../audio/wav";
import type {
	HmiConversionOptions,
	HmiConversionResult,
	HmiMetadata,
} from "./types";

interface HmiNoteEvent {
	timeSeconds: number;
	durationSeconds: number;
	channel: number;
	note: number;
	velocity: number;
	patch: number;
	panning: number; // -1 (left) to 1 (right)
}

interface ActiveVoice {
	freq: number;
	velocity: number;
	patch: number;
	panning: number;
	startTime: number;
	duration: number;
	phase: number;
	envPhase: "attack" | "decay" | "sustain" | "release" | "off";
	envLevel: number;
}

function readVarLen(
	bytes: Uint8Array,
	offset: number,
): { value: number; bytesRead: number } {
	let value = 0;
	let bytesRead = 0;
	for (let i = 0; i < 4; i++) {
		if (offset + i >= bytes.length) break;
		const b = bytes[offset + i] ?? 0;
		bytesRead++;
		value = (value << 7) | (b & 0x7f);
		if ((b & 0x80) === 0) break;
	}
	return { value, bytesRead };
}

function parseAscii(bytes: Uint8Array, start: number, len: number): string {
	let str = "";
	for (let i = 0; i < len && start + i < bytes.length; i++) {
		const c = bytes[start + i] ?? 0;
		if (c === 0) break;
		str += String.fromCharCode(c);
	}
	return str.trim();
}

/**
 * Parses Human Machine Interfaces (HMI) MIDI files and synthesizes
 * multi-channel soundtrack audio into a 16-bit stereo linear PCM WAV.
 */
export function convertHmiToWav(
	input: ArrayBuffer | Uint8Array,
	options: HmiConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): HmiConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 32) {
		throw new Error(
			"Invalid HMI file: File size is smaller than the minimum 32-byte header.",
		);
	}

	const magic = parseAscii(bytes, 0, 32);
	if (!magic.startsWith("HMI-MIDI") && !magic.startsWith("HMIMIDIP")) {
		throw new Error(
			`Invalid HMI file: Unrecognized signature '${magic.slice(0, 16)}'. Expected 'HMI-MIDIFILE0115' or 'HMI-MIDISONG0615'.`,
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Read track count and division from HMI header
	let trackCount = 1;
	let division = 120; // ticks per quarter note
	let tracksOffset = 32;

	if (bytes.length >= 0x40) {
		const possibleTracks = view.getUint32(0x30, true);
		if (possibleTracks > 0 && possibleTracks <= 128) {
			trackCount = possibleTracks;
		}
		const possibleDiv = view.getUint16(0x34, true);
		if (possibleDiv > 0 && possibleDiv < 10000) {
			division = possibleDiv;
		}
		const possibleOffset = view.getUint32(0x38, true);
		if (possibleOffset >= 32 && possibleOffset < bytes.length) {
			tracksOffset = possibleOffset;
		}
	}

	onProgress?.(0.2, "PARSE_TRACKS");

	const noteEvents: HmiNoteEvent[] = [];
	let bpm = options.tempo || 120;
	let secondsPerTick = 60 / (bpm * division);

	// Channel state tracking
	const channelPatches = new Uint8Array(16);
	const channelVolumes = new Float32Array(16).fill(0.8);
	const channelPans = new Float32Array(16).fill(0.0);

	// Parse track data
	let pos = tracksOffset;
	const trackEnd = bytes.length;

	// Active note on events waiting for note off
	interface PendingNote {
		startSeconds: number;
		velocity: number;
		patch: number;
		panning: number;
	}
	const pendingNotes = new Map<number, PendingNote>();

	while (pos < trackEnd) {
		// Check for track header or track chunk
		if (pos + 16 <= trackEnd) {
			const chunkHeader = parseAscii(bytes, pos, 12);
			if (
				chunkHeader.startsWith("HMI-TRACK") ||
				chunkHeader.startsWith("MTrk")
			) {
				pos += 16;
				continue;
			}
		}

		let currentTick = 0;
		let runningStatus = 0;

		while (pos < trackEnd) {
			const delta = readVarLen(bytes, pos);
			pos += delta.bytesRead;
			currentTick += delta.value;

			if (pos >= trackEnd) break;

			let status = bytes[pos] ?? 0;
			if ((status & 0x80) !== 0) {
				runningStatus = status;
				pos++;
			} else {
				status = runningStatus;
			}

			const eventType = status & 0xf0;
			const channel = status & 0x0f;

			if (status === 0xff) {
				// Meta event
				const metaType = bytes[pos++] ?? 0;
				const metaLen = readVarLen(bytes, pos);
				pos += metaLen.bytesRead;

				if (metaType === 0x51 && metaLen.value === 3 && pos + 3 <= trackEnd) {
					// Set tempo (microsec per quarter note)
					const us =
						((bytes[pos] ?? 0) << 16) |
						((bytes[pos + 1] ?? 0) << 8) |
						(bytes[pos + 2] ?? 0);
					if (us > 0) {
						bpm = Math.round(60000000 / us);
						secondsPerTick = 60 / (bpm * division);
					}
				} else if (metaType === 0x2f) {
					// End of track
					pos += metaLen.value;
					break;
				}
				pos += metaLen.value;
			} else if (status === 0xf0 || status === 0xf7) {
				// Sysex event
				const sysLen = readVarLen(bytes, pos);
				pos += sysLen.bytesRead + sysLen.value;
			} else if (eventType === 0x90) {
				// Note On
				const note = bytes[pos++] ?? 0;
				const vel = bytes[pos++] ?? 0;
				const noteKey = (channel << 8) | note;

				if (vel > 0) {
					pendingNotes.set(noteKey, {
						startSeconds: currentTick * secondsPerTick,
						velocity: vel / 127,
						patch: channelPatches[channel] ?? 0,
						panning: channelPans[channel] ?? 0,
					});
				} else {
					// Note On with velocity 0 is Note Off
					const pending = pendingNotes.get(noteKey);
					if (pending) {
						const dur = Math.max(
							0.05,
							currentTick * secondsPerTick - pending.startSeconds,
						);
						noteEvents.push({
							timeSeconds: pending.startSeconds,
							durationSeconds: dur,
							channel,
							note,
							velocity: pending.velocity,
							patch: pending.patch,
							panning: pending.panning,
						});
						pendingNotes.delete(noteKey);
					}
				}
			} else if (eventType === 0x80) {
				// Note Off
				const note = bytes[pos++] ?? 0;
				pos++; // skip velocity
				const noteKey = (channel << 8) | note;
				const pending = pendingNotes.get(noteKey);
				if (pending) {
					const dur = Math.max(
						0.05,
						currentTick * secondsPerTick - pending.startSeconds,
					);
					noteEvents.push({
						timeSeconds: pending.startSeconds,
						durationSeconds: dur,
						channel,
						note,
						velocity: pending.velocity,
						patch: pending.patch,
						panning: pending.panning,
					});
					pendingNotes.delete(noteKey);
				}
			} else if (eventType === 0xb0) {
				// Control change
				const cc = bytes[pos++] ?? 0;
				const val = bytes[pos++] ?? 0;
				if (cc === 7) {
					// Main volume
					channelVolumes[channel] = val / 127;
				} else if (cc === 10) {
					// Pan: 0 = left, 64 = center, 127 = right
					channelPans[channel] = (val - 64) / 64;
				}
			} else if (eventType === 0xc0) {
				// Program change
				const patch = bytes[pos++] ?? 0;
				channelPatches[channel] = patch;
			} else if (eventType === 0xd0) {
				pos++; // Channel pressure
			} else if (eventType === 0xe0) {
				pos += 2; // Pitch wheel
			} else {
				// Unknown status, advance to avoid infinite loop
				pos++;
			}
		}
	}

	// Flush any lingering pending notes
	for (const [key, pending] of pendingNotes.entries()) {
		const channel = (key >> 8) & 0x0f;
		const note = key & 0xff;
		noteEvents.push({
			timeSeconds: pending.startSeconds,
			durationSeconds: 0.5,
			channel,
			note,
			velocity: pending.velocity,
			patch: pending.patch,
			panning: pending.panning,
		});
	}

	// Calculate total duration
	let totalDuration = 1.0;
	for (const e of noteEvents) {
		const end = e.timeSeconds + e.durationSeconds;
		if (end > totalDuration) totalDuration = end;
	}
	// Limit duration to max 5 minutes for memory safety
	totalDuration = Math.min(totalDuration + 0.5, 300);

	onProgress?.(0.5, "SYNTHESIZE");

	const sampleRate = options.sampleRate || 44100;
	const totalSamples = Math.ceil(totalDuration * sampleRate);
	const samplesLeft = new Float32Array(totalSamples);
	const samplesRight = new Float32Array(totalSamples);

	// Sort events by time
	noteEvents.sort((a, b) => a.timeSeconds - b.timeSeconds);

	let eventIdx = 0;
	const activeVoices: ActiveVoice[] = [];

	for (let i = 0; i < totalSamples; i++) {
		const currentTime = i / sampleRate;

		// Trigger new notes
		while (
			eventIdx < noteEvents.length &&
			(noteEvents[eventIdx]?.timeSeconds ?? 0) <= currentTime
		) {
			const evt = noteEvents[eventIdx];
			if (evt) {
				const freq = 440 * 2 ** ((evt.note - 69) / 12);
				activeVoices.push({
					freq,
					velocity: evt.velocity,
					patch: evt.patch,
					panning: evt.panning,
					startTime: currentTime,
					duration: evt.durationSeconds,
					phase: 0,
					envPhase: "attack",
					envLevel: 0,
				});
			}
			eventIdx++;
		}

		let sampleL = 0;
		let sampleR = 0;

		// Process active voices
		for (let v = activeVoices.length - 1; v >= 0; v--) {
			const voice = activeVoices[v];
			if (!voice) continue;

			const age = currentTime - voice.startTime;
			if (age > voice.duration + 0.1) {
				activeVoices.splice(v, 1);
				continue;
			}

			// Simple ADSR envelope
			let env = 1.0;
			const attackTime = 0.02;
			const releaseTime = 0.1;
			if (age < attackTime) {
				env = age / attackTime;
			} else if (age > voice.duration) {
				env = Math.max(0, 1 - (age - voice.duration) / releaseTime);
			}

			// Wave synthesis: Fundamental + 2nd harmonic for brassy/synth game sound
			voice.phase += (2 * Math.PI * voice.freq) / sampleRate;
			if (voice.phase > 2 * Math.PI) voice.phase -= 2 * Math.PI;

			const s1 = Math.sin(voice.phase);
			const s2 = 0.4 * Math.sin(2 * voice.phase);
			const synthVal = (s1 + s2) * env * voice.velocity * 0.25;

			const panL = 0.5 * (1 - voice.panning);
			const panR = 0.5 * (1 + voice.panning);

			sampleL += synthVal * panL;
			sampleR += synthVal * panR;
		}

		// Clamp samples
		samplesLeft[i] = Math.max(-1, Math.min(1, sampleL));
		samplesRight[i] = Math.max(-1, Math.min(1, sampleR));
	}

	onProgress?.(0.9, "ENCODE_WAV");
	const leftPcm = new Int32Array(totalSamples);
	const rightPcm = new Int32Array(totalSamples);
	for (let i = 0; i < totalSamples; i++) {
		const l = samplesLeft[i] ?? 0;
		const r = samplesRight[i] ?? 0;
		leftPcm[i] = Math.max(-32768, Math.min(32767, Math.round(l * 32767)));
		rightPcm[i] = Math.max(-32768, Math.min(32767, Math.round(r * 32767)));
	}

	const wavBuffer = writeWav({
		sampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [leftPcm, rightPcm],
	});

	const metadata: HmiMetadata = {
		version: magic.slice(0, 16),
		trackCount,
		division,
		durationSeconds: Math.round(totalDuration * 10) / 10,
		sampleRate,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		wavBuffer,
		metadata,
	};
}
