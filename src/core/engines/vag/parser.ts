import type {
	VagConversionResult,
	VagMetadata,
	VagToWavOptions,
} from "./types";

// Standard PSX SPU-ADPCM 5-coefficient 2-pole linear filter tables (scaled by 64)
export const PSX_POS_COEFFS = [0, 60, 115, 98, 122];
export const PSX_NEG_COEFFS = [0, 0, -52, -55, -60];

/**
 * Parses and decodes a Sony PlayStation 1 PSX ADPCM (.vag, .vagp) audio file
 * into a universal 16-bit linear PCM RIFF WAV audio file.
 */
export function convertVagToWav(
	input: Uint8Array | ArrayBuffer,
	options: VagToWavOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): VagConversionResult {
	onProgress?.(0.05, "READ_HEADER");
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	if (bytes.length < 48) {
		throw new Error(
			`Invalid VAG file: File size (${bytes.length} bytes) is too small to contain a VAG header.`,
		);
	}

	const isBigEndian =
		bytes[0] === 0x56 &&
		bytes[1] === 0x41 &&
		bytes[2] === 0x47 &&
		bytes[3] === 0x70; // "VAGp"
	const isLittleEndian =
		bytes[0] === 0x70 &&
		bytes[1] === 0x47 &&
		bytes[2] === 0x41 &&
		bytes[3] === 0x56; // "pGAV"

	if (!isBigEndian && !isLittleEndian) {
		throw new Error("Invalid VAG file: Missing 'VAGp' signature in header.");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const version = isBigEndian
		? view.getUint32(4, false)
		: view.getUint32(4, true);
	const dataSizeHeader = isBigEndian
		? view.getUint32(12, false)
		: view.getUint32(12, true);
	const rawSampleRate = isBigEndian
		? view.getUint32(16, false)
		: view.getUint32(16, true);

	const sampleRate =
		rawSampleRate > 0 && rawSampleRate <= 192000 ? rawSampleRate : 22050;

	// Extract null-terminated name string at offset 32..47
	const nameChars: string[] = [];
	for (let i = 32; i < 48; i++) {
		const charCode = bytes[i] ?? 0;
		if (charCode === 0) break;
		if (charCode >= 32 && charCode <= 126) {
			nameChars.push(String.fromCharCode(charCode));
		}
	}
	const soundName = nameChars.join("").trim() || "PSX Audio";

	// Detect if audio data starts at offset 48 or 64
	let dataOffset = 48;
	if (bytes.length >= 64) {
		let allZeros = true;
		for (let i = 48; i < 64; i++) {
			if (bytes[i] !== 0) {
				allZeros = false;
				break;
			}
		}
		if (
			allZeros &&
			(dataSizeHeader === 0 || bytes.length >= 64 + dataSizeHeader)
		) {
			dataOffset = 64;
		}
	}

	const availablePayload = bytes.length - dataOffset;
	const payloadLen =
		dataSizeHeader > 0 && dataSizeHeader <= availablePayload
			? dataSizeHeader
			: availablePayload;

	const numBlocks = Math.floor(payloadLen / 16);
	const totalSamples = numBlocks * 28;
	const pcmSamples = new Int16Array(totalSamples);

	onProgress?.(0.15, "DECODE_ADPCM");

	let history1 = 0;
	let history2 = 0;
	let sampleIndex = 0;

	for (let b = 0; b < numBlocks; b++) {
		const blockStart = dataOffset + b * 16;
		const shiftFilter = bytes[blockStart] ?? 0;
		const flags = bytes[blockStart + 1] ?? 0;

		const shift = Math.min(shiftFilter & 0x0f, 12);
		const filter = Math.min((shiftFilter >> 4) & 0x07, 4);

		const posCoeff = PSX_POS_COEFFS[filter] ?? 0;
		const negCoeff = PSX_NEG_COEFFS[filter] ?? 0;

		// 14 bytes contain 28 4-bit nibbles
		for (let i = 2; i < 16; i++) {
			const byteVal = bytes[blockStart + i] ?? 0;

			// Low nibble first
			const lowNibble = byteVal & 0x0f;
			const s0 = lowNibble >= 8 ? lowNibble - 16 : lowNibble;
			const raw0 = s0 << (12 - shift);
			const predicted0 =
				raw0 + ((history1 * posCoeff + history2 * negCoeff + 32) >> 6);
			const sample0 = Math.max(-32768, Math.min(32767, predicted0));
			pcmSamples[sampleIndex++] = sample0;
			history2 = history1;
			history1 = sample0;

			// High nibble second
			const highNibble = (byteVal >> 4) & 0x0f;
			const s1 = highNibble >= 8 ? highNibble - 16 : highNibble;
			const raw1 = s1 << (12 - shift);
			const predicted1 =
				raw1 + ((history1 * posCoeff + history2 * negCoeff + 32) >> 6);
			const sample1 = Math.max(-32768, Math.min(32767, predicted1));
			pcmSamples[sampleIndex++] = sample1;
			history2 = history1;
			history1 = sample1;
		}

		if (flags === 1 || flags === 7) {
			// Loop end / termination block reached
			// Often trailing blocks are padding
		}

		if (b % 200 === 0 && onProgress) {
			onProgress(0.15 + (b / numBlocks) * 0.7, "DECODE_ADPCM");
		}
	}

	// Normalize if requested
	const shouldNormalize =
		options.normalize === true || options.normalize === "true";
	if (shouldNormalize && sampleIndex > 0) {
		let maxAmp = 0;
		for (let i = 0; i < sampleIndex; i++) {
			const amp = Math.abs(pcmSamples[i] ?? 0);
			if (amp > maxAmp) maxAmp = amp;
		}

		if (maxAmp > 0 && maxAmp < 32000) {
			const factor = 32000 / maxAmp;
			for (let i = 0; i < sampleIndex; i++) {
				const scaled = Math.round((pcmSamples[i] ?? 0) * factor);
				pcmSamples[i] = Math.max(-32768, Math.min(32767, scaled));
			}
		}
	}

	onProgress?.(0.88, "BUILD_WAV");

	// Synthesize standard 44-byte RIFF WAVE container
	const numChannels = 1;
	const bitsPerSample = 16;
	const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
	const blockAlign = numChannels * (bitsPerSample / 8);
	const dataBytesLen = sampleIndex * 2;
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

	// Copy 16-bit PCM samples in little-endian format
	let outOffset = 44;
	for (let i = 0; i < sampleIndex; i++) {
		wavView.setInt16(outOffset, pcmSamples[i] ?? 0, true);
		outOffset += 2;
	}

	const durationMs = Math.round((sampleIndex / sampleRate) * 1000);

	const metadata: VagMetadata = {
		sampleRate,
		channels: numChannels,
		sampleCount: sampleIndex,
		durationMs,
		name: soundName,
		version,
	};

	onProgress?.(1.0, "COMPLETE");

	return {
		metadata,
		wavBytes: wavBuffer,
	};
}
