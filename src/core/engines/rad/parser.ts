import { writeWav } from "../audio/wav";
import type {
	RadConversionOptions,
	RadConversionResult,
} from "./types";

interface OplInstrument {
	name: string;
	modMultiplier: number;
	modKsl: number;
	modLevel: number;
	modAttack: number;
	modDecay: number;
	modSustain: number;
	modRelease: number;
	modWave: number;
	carMultiplier: number;
	carKsl: number;
	carLevel: number;
	carAttack: number;
	carDecay: number;
	carSustain: number;
	carRelease: number;
	carWave: number;
	feedback: number;
	connection: number; // 0 = FM, 1 = additive
}

interface ChannelNote {
	note: number; // 1..96 (0 = none, 97 = note off)
	instrument: number; // 1..N
	volume: number; // 0..63
}

interface Pattern {
	rows: ChannelNote[][]; // 64 rows, each has 9 channels
}

interface ActiveVoice {
	instrument: OplInstrument;
	freq: number;
	phaseCar: number;
	phaseMod: number;
	envPhase: "attack" | "decay" | "sustain" | "release" | "off";
	envLevelCar: number;
	envLevelMod: number;
	volume: number;
	panning: number; // -1 to 1
}

function cleanAscii(bytes: Uint8Array): string {
	let str = "";
	for (let i = 0; i < bytes.length; i++) {
		const c = bytes[i] ?? 0;
		if (c === 0) break;
		if (c >= 32 && c <= 126) {
			str += String.fromCharCode(c);
		}
	}
	return str.trim();
}

/**
 * Parses a Reality Adlib Tracker (.rad) module and synthesizes 16-bit stereo WAV.
 */
export function convertRadToWav(
	input: ArrayBuffer | Uint8Array,
	options: RadConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): RadConversionResult {
	onProgress?.(0.05, "READ_HEADER");

	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 32) {
		throw new Error(
			"Invalid RAD file: Buffer too small for Reality Adlib Tracker header.",
		);
	}

	const sig = cleanAscii(bytes.subarray(0, 16));
	const isRadV1 =
		sig.startsWith("RAD by REALITY") || sig.startsWith("RAD by Reality");
	const isRadV2 = bytes[0] === 0x52 && bytes[1] === 0x41 && bytes[2] === 0x44; // "RAD"

	if (!isRadV1 && !isRadV2) {
		throw new Error(
			"Invalid RAD file: Missing 'RAD by REALITY' format signature.",
		);
	}

	const version = bytes[16] ?? 0x10;
	const defaultSpeed = Math.max(1, bytes[17] ?? 6);
	const numInstruments = Math.min(64, Math.max(1, bytes[18] ?? 1));

	let offset = 19;
	const instruments: OplInstrument[] = [];

	// Parse instruments
	for (let i = 0; i < numInstruments && offset + 12 <= bytes.length; i++) {
		const mod1 = bytes[offset] ?? 0;
		const mod2 = bytes[offset + 1] ?? 0;
		const mod3 = bytes[offset + 2] ?? 0;
		const mod4 = bytes[offset + 3] ?? 0;
		const modWave = bytes[offset + 4] ?? 0;

		const car1 = bytes[offset + 5] ?? 0;
		const car2 = bytes[offset + 6] ?? 0;
		const car3 = bytes[offset + 7] ?? 0;
		const car4 = bytes[offset + 8] ?? 0;
		const carWave = bytes[offset + 9] ?? 0;

		const connFb = bytes[offset + 10] ?? 0;

		// Instrument name if present
		let name = `Instrument ${i + 1}`;
		offset += 11;
		if (offset + 16 <= bytes.length && bytes[offset] !== 0) {
			const rawName = cleanAscii(bytes.subarray(offset, offset + 16));
			if (rawName) name = rawName;
			offset += 16;
		}

		instruments.push({
			name,
			modMultiplier: Math.max(0.5, mod1 & 0x0f),
			modKsl: (mod2 >> 6) & 3,
			modLevel: 63 - (mod2 & 0x3f),
			modAttack: Math.max(1, (mod3 >> 4) & 0x0f),
			modDecay: Math.max(1, mod3 & 0x0f),
			modSustain: 15 - ((mod4 >> 4) & 0x0f),
			modRelease: Math.max(1, mod4 & 0x0f),
			modWave: modWave & 7,
			carMultiplier: Math.max(0.5, car1 & 0x0f),
			carKsl: (car2 >> 6) & 3,
			carLevel: 63 - (car2 & 0x3f),
			carAttack: Math.max(1, (car3 >> 4) & 0x0f),
			carDecay: Math.max(1, car3 & 0x0f),
			carSustain: 15 - ((car4 >> 4) & 0x0f),
			carRelease: Math.max(1, car4 & 0x0f),
			carWave: carWave & 7,
			feedback: (connFb >> 1) & 7,
			connection: connFb & 1,
		});
	}

	onProgress?.(0.2, "READ_PATTERNS");

	// Read order list
	const numOrders = Math.max(1, bytes[offset] ?? 1);
	offset++;

	const orders: number[] = [];
	for (let i = 0; i < numOrders && offset < bytes.length; i++) {
		orders.push(bytes[offset++] ?? 0);
	}

	const maxPatternIndex = Math.max(0, ...orders);
	const numPatterns = maxPatternIndex + 1;
	const patterns: Pattern[] = [];

	// Parse pattern data (9 channels, 64 rows per pattern)
	for (let p = 0; p < numPatterns; p++) {
		const rows: ChannelNote[][] = [];
		for (let r = 0; r < 64; r++) {
			const rowChannels: ChannelNote[] = [];
			for (let c = 0; c < 9; c++) {
				rowChannels.push({ note: 0, instrument: 0, volume: 64 });
			}
			rows.push(rowChannels);
		}

		// Read packed pattern events if remaining buffer allows
		if (offset < bytes.length) {
			let row = 0;
			while (row < 64 && offset < bytes.length) {
				const event = bytes[offset++] ?? 0;
				if (event === 0) {
					// End of row
					row++;
					continue;
				}

				const ch = event & 0x0f;
				if (ch < 9) {
					let note = 0;
					let inst = 0;
					let vol = 64;

					if (event & 0x80) {
						// Note present
						note = bytes[offset++] ?? 0;
					}
					if (event & 0x40) {
						// Instrument present
						inst = bytes[offset++] ?? 0;
					}
					if (event & 0x20) {
						// Volume or effect present
						vol = bytes[offset++] ?? 64;
					}

					const currentRow = rows[row];
					if (currentRow?.[ch]) {
						currentRow[ch] = { note, instrument: inst, volume: vol };
					}
				}
			}
		}

		patterns.push({ rows });
	}

	onProgress?.(0.4, "SYNTHESIZE_OPL2");

	const sampleRate = options.sampleRate ?? 44100;
	const stereoSep =
		Math.max(0, Math.min(100, options.stereoSeparation ?? 70)) / 100;
	const bpm = 125;
	const speed = defaultSpeed;

	// Calculate timing: 1 tick = (2.5 / bpm) seconds; 1 row = speed * (2.5 / bpm)
	const tickSeconds = 2.5 / bpm;
	const rowSeconds = speed * tickSeconds;
	const rowSamples = Math.floor(rowSeconds * sampleRate);

	// Estimate song length
	const totalRows = orders.length * 64;
	const totalSamples = totalRows * rowSamples;
	const durationSeconds = totalSamples / sampleRate;

	const leftSamples = new Int32Array(totalSamples);
	const rightSamples = new Int32Array(totalSamples);

	// Setup 9 OPL2 channel voices
	const voices: (ActiveVoice | null)[] = Array(9).fill(null);

	// Channel panning across stereo field (-stereoSep to +stereoSep)
	const channelPan = [
		-stereoSep * 0.8,
		stereoSep * 0.8,
		-stereoSep * 0.5,
		stereoSep * 0.5,
		0,
		-stereoSep * 0.3,
		stereoSep * 0.3,
		-stereoSep * 0.7,
		stereoSep * 0.7,
	];

	let sampleCursor = 0;

	for (let ordIdx = 0; ordIdx < orders.length; ordIdx++) {
		onProgress?.(
			0.4 + (0.5 * ordIdx) / orders.length,
			`SYNTH_ORDER_${ordIdx + 1}`,
		);

		const patIdx = orders[ordIdx] ?? 0;
		const pattern = patterns[patIdx] ?? patterns[0];
		if (!pattern) continue;

		for (let rowIdx = 0; rowIdx < 64; rowIdx++) {
			const rowData = pattern.rows[rowIdx] ?? [];

			// Process row triggers
			for (let ch = 0; ch < 9; ch++) {
				const cell = rowData[ch];
				if (!cell) continue;

				if (cell.note > 0) {
					if (cell.note === 97) {
						// Note off / release
						const voice = voices[ch];
						if (voice) voice.envPhase = "release";
					} else {
						// Note on
						const instIndex = cell.instrument > 0 ? cell.instrument - 1 : 0;
						const inst = instruments[instIndex] ?? instruments[0];
						if (inst) {
							// MIDI note 0..96 to Hz (C-0 = 16.35 Hz to B-7 = 3951 Hz)
							const midiPitch = Math.min(108, Math.max(12, cell.note + 12));
							const freq = 440 * 2 ** ((midiPitch - 69) / 12);

							voices[ch] = {
								instrument: inst,
								freq,
								phaseCar: 0,
								phaseMod: 0,
								envPhase: "attack",
								envLevelCar: 0.05,
								envLevelMod: 0.05,
								volume: Math.min(1, Math.max(0, cell.volume / 64)),
								panning: channelPan[ch] ?? 0,
							};
						}
					}
				}
			}

			// Render audio samples for this row
			for (let s = 0; s < rowSamples; s++) {
				if (sampleCursor >= totalSamples) break;

				let mixL = 0;
				let mixR = 0;

				for (let ch = 0; ch < 9; ch++) {
					const voice = voices[ch];
					if (!voice || voice.envPhase === "off") continue;

					const inst = voice.instrument;

					// ADSR envelope step
					if (voice.envPhase === "attack") {
						const attackRate = 0.005 * (inst.carAttack / 15 + 0.1);
						voice.envLevelCar = Math.min(1.0, voice.envLevelCar + attackRate);
						voice.envLevelMod = Math.min(
							1.0,
							voice.envLevelMod + attackRate * 1.2,
						);
						if (voice.envLevelCar >= 1.0) {
							voice.envPhase = "decay";
						}
					} else if (voice.envPhase === "decay") {
						const decayRate = 0.0008 * (inst.carDecay / 15 + 0.1);
						const susLevel = inst.carSustain / 15;
						voice.envLevelCar = Math.max(
							susLevel,
							voice.envLevelCar - decayRate,
						);
						voice.envLevelMod = Math.max(
							susLevel,
							voice.envLevelMod - decayRate,
						);
						if (voice.envLevelCar <= susLevel) {
							voice.envPhase = "sustain";
						}
					} else if (voice.envPhase === "release") {
						const relRate = 0.002 * (inst.carRelease / 15 + 0.1);
						voice.envLevelCar = Math.max(0, voice.envLevelCar - relRate);
						voice.envLevelMod = Math.max(0, voice.envLevelMod - relRate);
						if (voice.envLevelCar <= 0) {
							voice.envPhase = "off";
							continue;
						}
					}

					// OPL2 2-Operator FM equation
					const freqMod = voice.freq * inst.modMultiplier;
					const freqCar = voice.freq * inst.carMultiplier;

					voice.phaseMod += (2 * Math.PI * freqMod) / sampleRate;
					if (voice.phaseMod > 2 * Math.PI) voice.phaseMod -= 2 * Math.PI;

					const modOut =
						Math.sin(voice.phaseMod) *
						voice.envLevelMod *
						(inst.modLevel / 63) *
						(1 + inst.feedback * 0.5);

					const carModulation = inst.connection === 0 ? modOut * 2.0 : 0;
					voice.phaseCar += (2 * Math.PI * freqCar) / sampleRate;
					if (voice.phaseCar > 2 * Math.PI) voice.phaseCar -= 2 * Math.PI;

					let sampleVal = 0;
					if (inst.connection === 0) {
						// FM mode: modulator modulates carrier phase
						sampleVal =
							Math.sin(voice.phaseCar + carModulation) * voice.envLevelCar;
					} else {
						// Additive mode: modulator + carrier
						sampleVal =
							(Math.sin(voice.phaseCar) * voice.envLevelCar +
								Math.sin(voice.phaseMod) * voice.envLevelMod * 0.5) *
							0.7;
					}

					const chAmp = sampleVal * voice.volume * (inst.carLevel / 63);

					const panL = 0.5 * (1 - voice.panning);
					const panR = 0.5 * (1 + voice.panning);

					mixL += chAmp * panL;
					mixR += chAmp * panR;
				}

				// Soft clipping into 16-bit range
				const outL = Math.max(-1, Math.min(1, mixL * 0.5));
				const outR = Math.max(-1, Math.min(1, mixR * 0.5));

				leftSamples[sampleCursor] = Math.floor(outL * 32767);
				rightSamples[sampleCursor] = Math.floor(outR * 32767);

				sampleCursor++;
			}
		}
	}

	onProgress?.(0.95, "ENCODE_WAV");

	const wavBuffer = writeWav({
		sampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [leftSamples, rightSamples],
	});

	onProgress?.(1.0, "COMPLETE");

	return {
		wavBuffer,
		metadata: {
			title: sig,
			version,
			numInstruments,
			numPatterns,
			numOrders,
			speed,
			bpm,
			durationSeconds,
		},
	};
}
