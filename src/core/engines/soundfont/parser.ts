import { zipSync } from "fflate";

export interface Sf2Sample {
	name: string;
	start: number;
	end: number;
	sampleRate: number;
}

function buildWav(pcm16: Uint8Array, sampleRate: number): Uint8Array {
	const header = new ArrayBuffer(44);
	const view = new DataView(header);
	const u8 = new Uint8Array(header);

	const channels = 1; // Mono sample
	const bytesPerSample = 2; // 16-bit
	const blockAlign = channels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const pcmLength = pcm16.length;

	// "RIFF"
	u8.set([0x52, 0x49, 0x46, 0x46], 0);
	view.setUint32(4, 36 + pcmLength, true);
	// "WAVE"
	u8.set([0x57, 0x41, 0x56, 0x45], 8);
	// "fmt "
	u8.set([0x66, 0x6d, 0x74, 0x20], 12);
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true); // BitsPerSample
	// "data"
	u8.set([0x64, 0x61, 0x74, 0x61], 36);
	view.setUint32(40, pcmLength, true);

	const wav = new Uint8Array(44 + pcmLength);
	wav.set(u8, 0);
	wav.set(pcm16, 44);
	return wav;
}

/**
 * Parses SoundFont 2 (.sf2) RIFF container and extracts all instrument samples as a ZIP of WAV files.
 */
export function extractSf2ToWavZip(input: ArrayBuffer): ArrayBuffer {
	const bytes = new Uint8Array(input);
	if (bytes.length < 64) {
		throw new Error(
			"extractSf2ToWavZip: File is too small to be a valid SoundFont 2 file",
		);
	}

	const view = new DataView(input);
	const riff = new TextDecoder().decode(bytes.subarray(0, 4));
	const sfbk = new TextDecoder().decode(bytes.subarray(8, 12));

	if (riff !== "RIFF" || sfbk !== "sfbk") {
		throw new Error(
			"extractSf2ToWavZip: Not a valid SoundFont 2 (.sf2) file (expected RIFF/sfbk signature)",
		);
	}

	let smplOffset = -1;
	let smplLength = 0;
	let shdrOffset = -1;
	let shdrLength = 0;

	// Traverse top-level chunks
	let cursor = 12;
	while (cursor + 8 <= bytes.length) {
		const chunkId = new TextDecoder().decode(
			bytes.subarray(cursor, cursor + 4),
		);
		const chunkSize = view.getUint32(cursor + 4, true);
		cursor += 8;

		if (chunkId === "LIST" && cursor + 4 <= bytes.length) {
			const _listType = new TextDecoder().decode(
				bytes.subarray(cursor, cursor + 4),
			);
			let subCursor = cursor + 4;
			const listEnd = Math.min(bytes.length, cursor + chunkSize);

			while (subCursor + 8 <= listEnd) {
				const subId = new TextDecoder().decode(
					bytes.subarray(subCursor, subCursor + 4),
				);
				const subSize = view.getUint32(subCursor + 4, true);
				subCursor += 8;

				if (subId === "smpl") {
					smplOffset = subCursor;
					smplLength = subSize;
				} else if (subId === "shdr") {
					shdrOffset = subCursor;
					shdrLength = subSize;
				}

				subCursor += subSize;
				// Word align
				if (subSize % 2 !== 0) subCursor += 1;
			}
		}

		cursor += chunkSize;
		if (chunkSize % 2 !== 0) cursor += 1;
	}

	if (smplOffset === -1 || shdrOffset === -1) {
		throw new Error(
			"extractSf2ToWavZip: SoundFont is missing sample data (smpl) or sample headers (shdr)",
		);
	}

	// Parse sample headers (46 bytes each)
	const sampleCount = Math.floor(shdrLength / 46);
	const wavFiles: Record<string, Uint8Array> = {};
	const usedNames = new Set<string>();

	for (let i = 0; i < sampleCount; i++) {
		const entryStart = shdrOffset + i * 46;
		if (entryStart + 46 > bytes.length) break;

		// 20-byte sample name
		const rawName = new TextDecoder().decode(
			bytes.subarray(entryStart, entryStart + 20),
		);
		const nullIndex = rawName.indexOf("\0");
		let name = (
			nullIndex !== -1 ? rawName.slice(0, nullIndex) : rawName
		).trim();
		if (!name || name === "EOS") continue; // Skip EOS (End of Samples)

		// Sanitize name for filesystem
		name = name.replace(/[/\\?%*:|"<>]/g, "_");

		const dwStart = view.getUint32(entryStart + 20, true);
		const dwEnd = view.getUint32(entryStart + 24, true);
		const dwSampleRate = view.getUint32(entryStart + 36, true) || 44100;

		if (dwEnd <= dwStart) continue;

		const startByte = smplOffset + dwStart * 2;
		const sampleByteLen = (dwEnd - dwStart) * 2;

		if (
			startByte + sampleByteLen > smplOffset + smplLength ||
			startByte + sampleByteLen > bytes.length
		) {
			continue;
		}

		const pcmSlice = bytes.subarray(startByte, startByte + sampleByteLen);
		const wav = buildWav(pcmSlice, dwSampleRate);

		// Deduplicate filename
		let filename = `${name}.wav`;
		let counter = 2;
		while (usedNames.has(filename.toLowerCase())) {
			filename = `${name}_${counter}.wav`;
			counter++;
		}
		usedNames.add(filename.toLowerCase());
		wavFiles[filename] = wav;
	}

	if (Object.keys(wavFiles).length === 0) {
		throw new Error(
			"extractSf2ToWavZip: No audio samples could be parsed from this SoundFont",
		);
	}

	const zipped = zipSync(wavFiles);
	return zipped.buffer.slice(
		zipped.byteOffset,
		zipped.byteOffset + zipped.byteLength,
	);
}
