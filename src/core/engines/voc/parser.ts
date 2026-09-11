export interface VocMetadata {
	version: string;
	sampleRate: number;
	channels: number;
	bitsPerSample: number;
	totalSamples: number;
	durationSeconds: number;
	wavBytes: Uint8Array;
}

/**
 * Wraps linear 16-bit PCM samples into a standard 44-byte RIFF WAVE container.
 */
export function encodePcmToWav(
	channels: number,
	sampleRate: number,
	int16Samples: Int16Array,
): Uint8Array {
	const dataLength = int16Samples.length * 2;
	const buffer = new Uint8Array(44 + dataLength);
	const view = new DataView(buffer.buffer);

	// RIFF header
	buffer[0] = 0x52; // R
	buffer[1] = 0x49; // I
	buffer[2] = 0x46; // F
	buffer[3] = 0x46; // F
	view.setUint32(4, 36 + dataLength, true);
	buffer[8] = 0x57; // W
	buffer[9] = 0x41; // A
	buffer[10] = 0x56; // V
	buffer[11] = 0x45; // E

	// "fmt " chunk
	buffer[12] = 0x66; // f
	buffer[13] = 0x6d; // m
	buffer[14] = 0x74; // t
	buffer[15] = 0x20; // ' '
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // Linear PCM
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * 2, true); // Byte rate
	view.setUint16(32, channels * 2, true); // Block align
	view.setUint16(34, 16, true); // 16 bits per sample

	// "data" chunk
	buffer[36] = 0x64; // d
	buffer[37] = 0x61; // a
	buffer[38] = 0x74; // t
	buffer[39] = 0x61; // a
	view.setUint32(40, dataLength, true);

	for (let i = 0; i < int16Samples.length; i++) {
		view.setInt16(44 + i * 2, int16Samples[i] ?? 0, true);
	}

	return buffer;
}

/**
 * Parses a Creative Voice (.voc) Sound Blaster audio file and converts it into standard WAV.
 */
export function parseVoc(fileBytes: Uint8Array): VocMetadata {
	if (fileBytes.length < 26) {
		throw new Error(
			"Invalid VOC file: File size is smaller than the 26-byte Creative Voice header.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	// Validate "Creative Voice File" signature
	const sig = String.fromCharCode(...fileBytes.subarray(0, 19));
	if (sig !== "Creative Voice File") {
		throw new Error(
			`Invalid VOC signature: Expected 'Creative Voice File', received '${sig}'.`,
		);
	}

	const headerOffset = view.getUint16(20, true);
	const verMinor = fileBytes[22] ?? 0;
	const verMajor = fileBytes[23] ?? 1;
	const versionStr = `${verMajor}.${verMinor.toString().padStart(2, "0")}`;

	let currentSampleRate = 11025;
	let currentChannels = 1;
	const pcmSamples: number[] = [];

	let offset = headerOffset;
	while (offset < fileBytes.length) {
		const blockType = fileBytes[offset] ?? 0;
		if (blockType === 0x00) {
			// Terminator block
			break;
		}

		if (offset + 4 > fileBytes.length) break;

		// Block length: 3 bytes unsigned integer (Little-Endian)
		const b0 = fileBytes[offset + 1] ?? 0;
		const b1 = fileBytes[offset + 2] ?? 0;
		const b2 = fileBytes[offset + 3] ?? 0;
		const blockLength = b0 | (b1 << 8) | (b2 << 16);

		const dataStart = offset + 4;
		const nextOffset = dataStart + blockLength;

		if (dataStart > fileBytes.length) break;

		if (blockType === 0x01 && blockLength >= 2) {
			// Standard Voice data
			const tc = fileBytes[dataStart] ?? 0;
			const packing = fileBytes[dataStart + 1] ?? 0;

			// If not overridden by Block 8, compute sample rate from time constant
			if (tc > 0 && tc < 256) {
				currentSampleRate = Math.round(1000000 / (256 - tc));
			}

			// 8-bit unsigned PCM
			if (packing === 0) {
				for (
					let i = 2;
					i < blockLength && dataStart + i < fileBytes.length;
					i++
				) {
					const u8 = fileBytes[dataStart + i] ?? 128;
					// Scale 8-bit unsigned [0..255] to 16-bit signed [-32768..32767]
					pcmSamples.push((u8 - 128) << 8);
				}
			}
		} else if (blockType === 0x02) {
			// Voice continuation
			for (
				let i = 0;
				i < blockLength && dataStart + i < fileBytes.length;
				i++
			) {
				const u8 = fileBytes[dataStart + i] ?? 128;
				pcmSamples.push((u8 - 128) << 8);
			}
		} else if (blockType === 0x03 && blockLength >= 3) {
			// Silence
			const count = view.getUint16(dataStart, true) + 1;
			const tc = fileBytes[dataStart + 2] ?? 0;
			if (tc > 0 && tc < 256) {
				currentSampleRate = Math.round(1000000 / (256 - tc));
			}
			for (let i = 0; i < count; i++) {
				pcmSamples.push(0);
			}
		} else if (blockType === 0x08 && blockLength >= 4) {
			// Extended Block
			const tc16 = view.getUint16(dataStart, true);
			if (tc16 < 65536) {
				currentSampleRate = Math.round(256000000 / (65536 - tc16));
			}
			const mode = fileBytes[dataStart + 3] ?? 0;
			currentChannels = mode === 1 ? 2 : 1;
		} else if (blockType === 0x09 && blockLength >= 12) {
			// New format (16-bit / stereo)
			const sr = view.getUint32(dataStart, true);
			const bitsPerSample = fileBytes[dataStart + 4] ?? 8;
			const channels = fileBytes[dataStart + 5] ?? 1;
			const format = view.getUint16(dataStart + 6, true);

			currentSampleRate = sr || currentSampleRate;
			currentChannels = channels || currentChannels;

			const payloadLength = blockLength - 12;
			const payloadOffset = dataStart + 12;

			if (bitsPerSample === 16 && format === 0x0004) {
				// 16-bit signed PCM Little-Endian
				const sampleCount = Math.floor(payloadLength / 2);
				for (
					let i = 0;
					i < sampleCount && payloadOffset + i * 2 + 1 < fileBytes.length;
					i++
				) {
					const s16 = view.getInt16(payloadOffset + i * 2, true);
					pcmSamples.push(s16);
				}
			} else {
				// 8-bit unsigned PCM
				for (
					let i = 0;
					i < payloadLength && payloadOffset + i < fileBytes.length;
					i++
				) {
					const u8 = fileBytes[payloadOffset + i] ?? 128;
					pcmSamples.push((u8 - 128) << 8);
				}
			}
		}

		offset = nextOffset;
	}

	const totalSamples = pcmSamples.length;
	const durationSeconds =
		currentSampleRate > 0 && currentChannels > 0
			? Number(
					(totalSamples / (currentSampleRate * currentChannels)).toFixed(3),
				)
			: 0;

	const int16Array = new Int16Array(pcmSamples);
	const wavBytes = encodePcmToWav(
		currentChannels,
		currentSampleRate,
		int16Array,
	);

	return {
		version: versionStr,
		sampleRate: currentSampleRate,
		channels: currentChannels,
		bitsPerSample: 16,
		totalSamples,
		durationSeconds,
		wavBytes,
	};
}

/**
 * High-level engine runner for converting Creative Voice VOC files to standard WAV.
 */
export function convertVocToWav(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading Creative Voice header");
	const bytes = new Uint8Array(input);

	onProgress?.(0.5, "Decoding Sound Blaster PCM audio blocks");
	const metadata = parseVoc(bytes);

	onProgress?.(0.9, "Generating RIFF WAVE container");
	return metadata.wavBytes.buffer.slice(
		metadata.wavBytes.byteOffset,
		metadata.wavBytes.byteOffset + metadata.wavBytes.byteLength,
	) as ArrayBuffer;
}
