/**
 * Yamaha Arranger Keyboard Style (.sty / .prs / .bpt / .sst) to Standard MIDI (.mid) Parser.
 *
 * Yamaha arranger keyboards (Tyros, Genos, PSR-S series, Clavinova) store accompaniment
 * styles in .sty files. While based on the Standard MIDI File (SMF) specification, Yamaha
 * prepends and appends proprietary non-MIDI chunks (such as CASM, OTS, and MH).
 *
 * Standard DAWs (Ableton, FL Studio, Logic, Reaper) and MIDI synthesizers cannot open .sty
 * files because the file does not begin with 'MThd' at byte 0 or contains unhandled chunks.
 *
 * This engine locates the true SMF header ('MThd'), extracts and validates each 'MTrk' chunk,
 * strips non-standard proprietary framing, and outputs a 100% standard SMF Type 0/1 (.mid) file.
 */

export interface StyMidiInfo {
	format: number;
	tracksCount: number;
	division: number;
	totalMidiBytes: number;
	markerSections: string[];
}

export function extractMidiFromSty(fileBytes: Uint8Array): Uint8Array {
	if (fileBytes.length < 14) {
		throw new Error(
			"Invalid .sty file: file is too small to contain a MIDI stream.",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	// 1. Locate 'MThd' marker (0x4D 0x54 0x68 0x64)
	let mthdOffset = -1;
	for (let i = 0; i <= fileBytes.length - 14; i++) {
		if (
			view.getUint8(i) === 0x4d &&
			view.getUint8(i + 1) === 0x54 &&
			view.getUint8(i + 2) === 0x68 &&
			view.getUint8(i + 3) === 0x64
		) {
			mthdOffset = i;
			break;
		}
	}

	if (mthdOffset === -1) {
		throw new Error(
			"Invalid Yamaha .sty file: no 'MThd' Standard MIDI header found in container.",
		);
	}

	// Read MThd chunk length (must be 6)
	const headerLen = view.getUint32(mthdOffset + 4, false);
	if (headerLen !== 6) {
		throw new Error(
			`Non-standard MIDI header length (${headerLen} bytes). Expected 6 bytes.`,
		);
	}

	const declaredTracks = view.getUint16(mthdOffset + 10, false);

	// 2. Discover all valid 'MTrk' chunks (0x4D 0x54 0x72 0x6B)
	let searchPos = mthdOffset + 8 + headerLen;
	const trackChunks: Uint8Array[] = [];

	while (searchPos <= fileBytes.length - 8) {
		// Look for 'MTrk'
		if (
			view.getUint8(searchPos) === 0x4d &&
			view.getUint8(searchPos + 1) === 0x54 &&
			view.getUint8(searchPos + 2) === 0x72 &&
			view.getUint8(searchPos + 3) === 0x6b
		) {
			const trackLen = view.getUint32(searchPos + 4, false);
			const fullChunkLen = 8 + trackLen;

			if (searchPos + fullChunkLen > fileBytes.length) {
				// Truncated track chunk, take remaining available bytes
				trackChunks.push(fileBytes.subarray(searchPos));
				break;
			}

			trackChunks.push(fileBytes.subarray(searchPos, searchPos + fullChunkLen));
			searchPos += fullChunkLen;

			if (declaredTracks > 0 && trackChunks.length >= declaredTracks) {
				break;
			}
		} else {
			// Skip unknown bytes (e.g. padding or inter-chunk metadata)
			searchPos++;
		}
	}

	if (trackChunks.length === 0) {
		throw new Error(
			"No 'MTrk' tracks found inside the Yamaha .sty file after MThd header.",
		);
	}

	// 3. Assemble clean Standard MIDI File (SMF)
	const actualTracks = trackChunks.length;
	const mthdChunk = new Uint8Array(14);
	mthdChunk.set(fileBytes.subarray(mthdOffset, mthdOffset + 10), 0);
	// Update track count to actual valid tracks discovered
	mthdChunk[10] = (actualTracks >> 8) & 0xff;
	mthdChunk[11] = actualTracks & 0xff;
	mthdChunk[12] = view.getUint8(mthdOffset + 12);
	mthdChunk[13] = view.getUint8(mthdOffset + 13);

	let totalSize = mthdChunk.length;
	for (const chunk of trackChunks) {
		totalSize += chunk.length;
	}

	const result = new Uint8Array(totalSize);
	result.set(mthdChunk, 0);

	let writePos = mthdChunk.length;
	for (const chunk of trackChunks) {
		result.set(chunk, writePos);
		writePos += chunk.length;
	}

	return result;
}

export function inspectStyMidi(fileBytes: Uint8Array): StyMidiInfo {
	const midiBytes = extractMidiFromSty(fileBytes);
	const view = new DataView(
		midiBytes.buffer,
		midiBytes.byteOffset,
		midiBytes.byteLength,
	);

	const format = view.getUint16(8, false);
	const tracksCount = view.getUint16(10, false);
	const division = view.getUint16(12, false);

	// Scan track for text / marker meta events (FF 06 len text) or (FF 01/03)
	const markers: string[] = [];
	for (let i = 14; i < midiBytes.length - 4; i++) {
		const b0 = view.getUint8(i);
		const b1 = view.getUint8(i + 1);
		if (b0 === 0xff && (b1 === 0x06 || b1 === 0x01 || b1 === 0x03)) {
			const len = view.getUint8(i + 2);
			if (len > 0 && len < 64 && i + 3 + len <= midiBytes.length) {
				const text = new TextDecoder("latin1")
					.decode(midiBytes.subarray(i + 3, i + 3 + len))
					.trim();
				const isPrintable = [...text].every(
					(c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126,
				);
				if (text && !markers.includes(text) && isPrintable) {
					markers.push(text);
				}
			}
		}
	}

	return {
		format,
		tracksCount,
		division,
		totalMidiBytes: midiBytes.length,
		markerSections: markers,
	};
}

export function convertStyToMid(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Scanning Yamaha style container for SMF stream...");
	const midiBytes = extractMidiFromSty(new Uint8Array(input));

	onProgress?.(0.8, `Extracted ${midiBytes.length} bytes of standard MIDI...`);
	onProgress?.(1.0, "Complete");
	return midiBytes.buffer as ArrayBuffer;
}
