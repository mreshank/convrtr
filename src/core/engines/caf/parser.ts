import type {
	CafConversionOptions,
	CafConversionResult,
	CafDesc,
	CafHeader,
} from "./types";

/**
 * Creates a standard 44-byte RIFF WAV header for 16-bit PCM.
 */
function createWavHeader(
	numFrames: number,
	sampleRate: number,
	channels: number,
): Uint8Array {
	const bytesPerSample = 2; // 16-bit
	const blockAlign = channels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = numFrames * blockAlign;
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

/**
 * Parses Apple Core Audio Format (.caf) headers and chunk directory.
 */
export function parseCafHeader(input: Uint8Array | ArrayBuffer): CafHeader {
	const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (buffer.length < 8) {
		throw new Error(
			`Invalid CAF file: size (${buffer.length} bytes) is smaller than the 8-byte file header.`,
		);
	}

	const decoder = new TextDecoder("ascii");
	const fileType = decoder.decode(buffer.subarray(0, 4));

	if (fileType !== "caff") {
		throw new Error(
			`Invalid CAF file: expected 'caff' magic signature, received '${fileType}'.`,
		);
	}

	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);
	const version = view.getUint16(4, false);
	const flags = view.getUint16(6, false);

	let desc: CafDesc | null = null;
	let dataOffset = 0;
	let dataLength = 0;

	let ptr = 8;
	while (ptr + 12 <= buffer.length) {
		const chunkType = decoder.decode(buffer.subarray(ptr, ptr + 4));
		const rawChunkSize = view.getBigInt64(ptr + 4, false);
		ptr += 12;

		let chunkSize = Number(rawChunkSize);
		// Size of -1 means chunk extends to EOF (common in live/incomplete recordings)
		if (rawChunkSize === BigInt(-1)) {
			chunkSize = buffer.length - ptr;
		}

		if (chunkType === "desc") {
			if (chunkSize < 32 || ptr + 32 > buffer.length) {
				throw new Error("Invalid CAF 'desc' chunk: chunk size is too small.");
			}

			const sampleRate = view.getFloat64(ptr, false);
			const formatId = decoder.decode(buffer.subarray(ptr + 8, ptr + 12));
			const formatFlags = view.getUint32(ptr + 12, false);
			const bytesPerPacket = view.getUint32(ptr + 16, false);
			const framesPerPacket = view.getUint32(ptr + 20, false);
			const channelsPerFrame = view.getUint32(ptr + 24, false);
			const bitsPerChannel = view.getUint32(ptr + 28, false);

			const isFloat = (formatFlags & 1) !== 0;
			const isLittleEndian = (formatFlags & 2) !== 0;

			desc = {
				sampleRate,
				formatId,
				formatFlags,
				isFloat,
				isLittleEndian,
				bytesPerPacket,
				framesPerPacket,
				channelsPerFrame,
				bitsPerChannel,
			};
		} else if (chunkType === "data") {
			// In CAF, data chunk begins with 4-byte editCount (uint32)
			dataOffset = ptr + 4;
			dataLength = Math.max(0, chunkSize - 4);
		}

		if (rawChunkSize === BigInt(-1)) {
			break;
		}
		ptr += chunkSize;
	}

	if (!desc) {
		throw new Error("Invalid CAF file: Missing mandatory 'desc' chunk.");
	}

	if (dataOffset === 0) {
		throw new Error("Invalid CAF file: Missing mandatory 'data' chunk.");
	}

	return {
		version,
		flags,
		desc,
		dataOffset,
		dataLength,
	};
}

/**
 * Converts an Apple Core Audio Format (.caf) file into a standard 16-bit RIFF WAV.
 */
export function convertCafToWav(
	input: Uint8Array | ArrayBuffer,
	_options: CafConversionOptions = {},
): CafConversionResult {
	const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
	const header = parseCafHeader(buffer);
	const { desc } = header;

	if (desc.formatId !== "lpcm") {
		throw new Error(
			`Unsupported CAF audio format '${desc.formatId}'. Only Linear PCM ('lpcm') is currently supported.`,
		);
	}

	const channels = Math.max(1, desc.channelsPerFrame);
	const sampleRate = Math.round(desc.sampleRate);
	const bitsPerChannel = desc.bitsPerChannel;
	const bytesPerSample = Math.max(1, Math.floor(bitsPerChannel / 8));
	const bytesPerFrame = channels * bytesPerSample;

	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	const availablePayload = Math.min(
		header.dataLength,
		buffer.length - header.dataOffset,
	);
	const totalFrames = Math.floor(availablePayload / bytesPerFrame);
	const totalSamples = totalFrames * channels;

	// Output is 16-bit Little-Endian PCM
	const outputPcm = new Int16Array(totalSamples);
	let srcPtr = header.dataOffset;
	let dstIdx = 0;

	for (let f = 0; f < totalFrames; f++) {
		for (let ch = 0; ch < channels; ch++) {
			let sampleVal16 = 0;

			if (bitsPerChannel === 16) {
				const val = view.getInt16(srcPtr, desc.isLittleEndian);
				sampleVal16 = val;
				srcPtr += 2;
			} else if (bitsPerChannel === 24) {
				let b0 = 0;
				let b1 = 0;
				let b2 = 0;
				if (desc.isLittleEndian) {
					b0 = buffer[srcPtr] ?? 0;
					b1 = buffer[srcPtr + 1] ?? 0;
					b2 = buffer[srcPtr + 2] ?? 0;
				} else {
					b2 = buffer[srcPtr] ?? 0;
					b1 = buffer[srcPtr + 1] ?? 0;
					b0 = buffer[srcPtr + 2] ?? 0;
				}
				srcPtr += 3;
				// Sign extend 24-bit
				let val24 = (b2 << 16) | (b1 << 8) | b0;
				if (val24 & 0x800000) val24 -= 0x1000000;
				sampleVal16 = val24 >> 8;
			} else if (bitsPerChannel === 32 && desc.isFloat) {
				const valFloat = view.getFloat32(srcPtr, desc.isLittleEndian);
				srcPtr += 4;
				const clamped = Math.max(-1.0, Math.min(1.0, valFloat));
				sampleVal16 = Math.round(clamped * 32767);
			} else if (bitsPerChannel === 32 && !desc.isFloat) {
				const val32 = view.getInt32(srcPtr, desc.isLittleEndian);
				srcPtr += 4;
				sampleVal16 = val32 >> 16;
			} else if (bitsPerChannel === 8) {
				const val8 = buffer[srcPtr] ?? 0;
				srcPtr += 1;
				const signed8 = val8 > 127 ? val8 - 256 : val8;
				sampleVal16 = signed8 * 256;
			} else {
				srcPtr += bytesPerSample;
			}

			outputPcm[dstIdx++] = sampleVal16;
		}
	}

	const wavHeader = createWavHeader(totalFrames, sampleRate, channels);
	const wavBytes = new Uint8Array(wavHeader.length + totalSamples * 2);
	wavBytes.set(wavHeader, 0);

	const pcmBytes = new Uint8Array(
		outputPcm.buffer,
		outputPcm.byteOffset,
		outputPcm.byteLength,
	);
	wavBytes.set(pcmBytes, 44);

	const durationSeconds = totalFrames / sampleRate;

	return {
		wavBuffer: wavBytes,
		sampleRate,
		channels,
		durationSeconds,
		formatId: desc.formatId,
	};
}
