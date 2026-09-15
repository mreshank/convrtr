import { writeWav } from "../audio/wav";
import type {
	ImfConversionOptions,
	ImfConversionResult,
	ImfMetadata,
} from "./types";

interface OplChannel {
	freq: number;
	block: number;
	fnum: number;
	keyOn: boolean;
	feedback: number;
	connection: number;
	phaseMod: number;
	phaseCar: number;
	prevModOut: number;
	output: number;
	panning: number; // -1 to 1
}

const OPERATOR_OFFSETS = [0x00, 0x01, 0x02, 0x08, 0x09, 0x0a, 0x10, 0x11, 0x12];

/**
 * Yamaha YM3812 (OPL2) FM synthesis emulator state.
 */
class Opl2Emulator {
	registers: Uint8Array = new Uint8Array(256);
	channels: OplChannel[] = [];
	sampleRate: number;

	constructor(sampleRate = 44100) {
		this.sampleRate = sampleRate;
		for (let i = 0; i < 9; i++) {
			const pan = i % 2 === 0 ? -0.3 : 0.3;
			this.channels.push({
				freq: 0,
				block: 0,
				fnum: 0,
				keyOn: false,
				feedback: 0,
				connection: 0,
				phaseMod: 0,
				phaseCar: 0,
				prevModOut: 0,
				output: 0,
				panning: pan,
			});
		}
	}

	write(reg: number, val: number): void {
		this.registers[reg & 0xff] = val;

		// Channel frequency and key-on registers
		if (reg >= 0xa0 && reg <= 0xa8) {
			const chIdx = reg - 0xa0;
			const ch = this.channels[chIdx];
			if (ch) {
				ch.fnum = (ch.fnum & 0x300) | val;
				this.updateChannelFreq(ch);
			}
		} else if (reg >= 0xb0 && reg <= 0xb8) {
			const chIdx = reg - 0xb0;
			const ch = this.channels[chIdx];
			if (ch) {
				ch.fnum = (ch.fnum & 0xff) | ((val & 0x03) << 8);
				ch.block = (val >> 2) & 0x07;
				const newKeyOn = (val & 0x20) !== 0;
				if (!ch.keyOn && newKeyOn) {
					ch.phaseCar = 0;
					ch.phaseMod = 0;
					ch.prevModOut = 0;
				}
				ch.keyOn = newKeyOn;
				this.updateChannelFreq(ch);
			}
		} else if (reg >= 0xc0 && reg <= 0xc8) {
			const chIdx = reg - 0xc0;
			const ch = this.channels[chIdx];
			if (ch) {
				ch.feedback = (val >> 1) & 0x07;
				ch.connection = val & 0x01;
			}
		}
	}

	private updateChannelFreq(ch: OplChannel): void {
		// OPL2 clock: 3579545 Hz / 72 = 49715.9 Hz base
		if (ch.block > 0) {
			ch.freq = ((ch.fnum * 49716) / 524288) * (1 << (ch.block - 1));
		} else {
			ch.freq = (ch.fnum * 49716) / 524288 / 2;
		}
	}

	renderSample(): [number, number] {
		let left = 0;
		let right = 0;

		for (let i = 0; i < 9; i++) {
			const ch = this.channels[i];
			if (!ch?.keyOn || ch.freq <= 0) continue;

			// Modulation index and feedback calculation
			const modFreq = ch.freq;
			const carFreq = ch.freq;

			ch.phaseMod += (modFreq * 2 * Math.PI) / this.sampleRate;
			if (ch.phaseMod > 2 * Math.PI) ch.phaseMod -= 2 * Math.PI;

			ch.phaseCar += (carFreq * 2 * Math.PI) / this.sampleRate;
			if (ch.phaseCar > 2 * Math.PI) ch.phaseCar -= 2 * Math.PI;

			// Operator volume from 0x40 register table
			const opOffset = OPERATOR_OFFSETS[i] ?? 0;
			const totalLevelMod = (this.registers[0x40 + opOffset] ?? 0) & 0x3f;
			const totalLevelCar = (this.registers[0x43 + opOffset] ?? 0) & 0x3f;

			const modVol = Math.max(0, 1 - totalLevelMod / 63);
			const carVol = Math.max(0, 1 - totalLevelCar / 63);

			const fbScale = ch.feedback > 0 ? (1 << (ch.feedback - 1)) * 0.5 : 0;
			const modOut = Math.sin(ch.phaseMod + ch.prevModOut * fbScale) * modVol;
			ch.prevModOut = modOut;

			let carOut = 0;
			if (ch.connection === 0) {
				// Frequency modulation
				carOut = Math.sin(ch.phaseCar + modOut * 2.0) * carVol;
			} else {
				// Additive synthesis
				carOut = (Math.sin(ch.phaseCar) * carVol + modOut) * 0.5;
			}

			const sampleVal = carOut * 7000;
			const panLeft = 0.5 - ch.panning * 0.5;
			const panRight = 0.5 + ch.panning * 0.5;

			left += sampleVal * panLeft;
			right += sampleVal * panRight;
		}

		return [left, right];
	}
}

/**
 * Converts id Software Music Format (.imf) to 16-bit linear stereo WAV.
 */
export function convertImfToWav(
	input: ArrayBuffer | Uint8Array,
	options: ImfConversionOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): ImfConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 8) {
		throw new Error(
			"Invalid IMF file: File size is smaller than minimum 8-byte event stream.",
		);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// Detect IMF Type 0 vs Type 1
	const lengthWord = view.getUint16(0, true);
	let offset = 0;
	let format: "IMF-Type0" | "IMF-Type1" = "IMF-Type0";

	if (lengthWord > 0 && lengthWord === bytes.length - 2) {
		format = "IMF-Type1";
		offset = 2;
	} else {
		format = "IMF-Type0";
		offset = 0;
	}

	const clockRate = options.clockRate ?? 560; // 560 Hz default for Wolf3D / Spear of Destiny
	const sampleRate = options.sampleRate ?? 44100;
	const samplesPerTick = sampleRate / clockRate;

	const emulator = new Opl2Emulator(sampleRate);
	const leftBuffer: number[] = [];
	const rightBuffer: number[] = [];

	let eventCount = 0;
	let totalTicks = 0;

	onProgress?.(0.2, "SYNTHESIZE_OPL");

	while (offset + 4 <= bytes.length) {
		const reg = bytes[offset] ?? 0;
		const val = bytes[offset + 1] ?? 0;
		const delay = view.getUint16(offset + 2, true);
		offset += 4;
		eventCount++;

		emulator.write(reg, val);

		if (delay > 0) {
			totalTicks += delay;
			const samplesToRender = Math.round(delay * samplesPerTick);
			for (let s = 0; s < samplesToRender; s++) {
				const [l, r] = emulator.renderSample();
				leftBuffer.push(l);
				rightBuffer.push(r);
			}
		}

		if (eventCount % 100 === 0 && onProgress) {
			const ratio = 0.2 + Math.min(0.65, (offset / bytes.length) * 0.65);
			onProgress(ratio, "RENDER_OPL2");
		}
	}

	if (leftBuffer.length === 0) {
		// Render trailing silence if no delay specified
		for (let s = 0; s < Math.round(samplesPerTick * 10); s++) {
			leftBuffer.push(0);
			rightBuffer.push(0);
		}
	}

	onProgress?.(0.88, "ENCODE_WAV");

	const totalSamples = leftBuffer.length;
	const leftPcm = new Int32Array(totalSamples);
	const rightPcm = new Int32Array(totalSamples);

	for (let i = 0; i < totalSamples; i++) {
		const l = leftBuffer[i] ?? 0;
		const r = rightBuffer[i] ?? 0;
		leftPcm[i] = Math.max(-32768, Math.min(32767, Math.round(l)));
		rightPcm[i] = Math.max(-32768, Math.min(32767, Math.round(r)));
	}

	const wavBuffer = writeWav({
		sampleRate,
		channels: 2,
		bitsPerSample: 16,
		samples: [leftPcm, rightPcm],
	});

	const durationSeconds = totalSamples / sampleRate;

	const metadata: ImfMetadata = {
		format,
		clockRate,
		sampleRate,
		channels: 2,
		durationSeconds: Math.round(durationSeconds * 100) / 100,
		eventCount,
		totalTicks,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		wavBuffer,
		metadata,
	};
}
