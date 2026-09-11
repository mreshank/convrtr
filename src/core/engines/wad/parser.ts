import { zipSync } from "fflate";

/**
 * id Tech / Doom Engine (.wad) archive parser and ZIP extractor.
 * Supports IWAD (official game packages) and PWAD (patch/mod packages).
 * Categorizes sprites, flats, patches, maps, and music, and automatically
 * wraps Doom sound lumps into playable 8-bit RIFF/WAVE (.wav) files.
 */

export interface WadLump {
	name: string;
	filepos: number;
	size: number;
	data: Uint8Array;
}

/**
 * Synthesizes a standard 44-byte RIFF/WAVE header for 8-bit unsigned mono PCM audio.
 */
function createWavHeader(sampleCount: number, sampleRate: number): Uint8Array {
	const header = new Uint8Array(44);
	const view = new DataView(header.buffer);

	// "RIFF" chunk descriptor
	view.setUint32(0, 0x52494646, false); // "RIFF"
	view.setUint32(4, 36 + sampleCount, true); // File size - 8
	view.setUint32(8, 0x57415645, false); // "WAVE"

	// "fmt " sub-chunk
	view.setUint32(12, 0x666d7420, false); // "fmt "
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
	view.setUint16(22, 1, true); // NumChannels (1 = Mono)
	view.setUint32(24, sampleRate, true); // SampleRate
	view.setUint32(28, sampleRate * 1, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
	view.setUint16(32, 1, true); // BlockAlign (NumChannels * BitsPerSample/8)
	view.setUint16(34, 8, true); // BitsPerSample (8-bit unsigned PCM)

	// "data" sub-chunk
	view.setUint32(36, 0x64617461, false); // "data"
	view.setUint32(40, sampleCount, true); // Subchunk2Size (NumSamples * NumChannels * BitsPerSample/8)

	return header;
}

/**
 * Detects if a lump contains a classic Doom DMX sound effect and converts it to a standard WAV.
 */
function tryConvertDoomSound(lump: WadLump): Uint8Array | null {
	if (lump.size < 8) return null;
	const view = new DataView(
		lump.data.buffer,
		lump.data.byteOffset,
		lump.data.byteLength,
	);

	// Doom sound format identifier: 0x0003 (format 3)
	const format = view.getUint16(0, true);
	if (format !== 3) return null;

	const sampleRate = view.getUint16(2, true);
	const sampleCount = view.getUint32(4, true);

	// Sanity checks: realistic audio sample rate and sample length
	if (
		sampleRate < 4000 ||
		sampleRate > 48000 ||
		sampleCount === 0 ||
		8 + sampleCount > lump.size
	) {
		return null;
	}

	const pcmSamples = lump.data.subarray(8, 8 + sampleCount);
	const wavHeader = createWavHeader(sampleCount, sampleRate);

	const wav = new Uint8Array(wavHeader.length + sampleCount);
	wav.set(wavHeader, 0);
	wav.set(pcmSamples, wavHeader.length);

	return wav;
}

/**
 * Cleans lump name: uppercase, stripped of null characters.
 */
function cleanLumpName(rawBytes: Uint8Array): string {
	let str = "";
	for (let i = 0; i < 8; i++) {
		const b = rawBytes[i] ?? 0;
		if (b === 0) break;
		str += String.fromCharCode(b);
	}
	return str.trim().toUpperCase();
}

/**
 * Parses all directory lumps from a WAD file.
 */
export function parseWadLumps(input: ArrayBuffer): {
	wadType: string;
	lumps: WadLump[];
} {
	if (input.byteLength < 12) {
		throw new Error(
			"convertWad: File is too small to be a valid WAD container (minimum 12 bytes required)",
		);
	}

	const view = new DataView(input);
	const magic = String.fromCharCode(
		view.getUint8(0),
		view.getUint8(1),
		view.getUint8(2),
		view.getUint8(3),
	);

	if (magic !== "IWAD" && magic !== "PWAD") {
		throw new Error(
			`convertWad: Invalid magic header '${magic}' (expected 'IWAD' or 'PWAD')`,
		);
	}

	const numLumps = view.getUint32(4, true);
	const infotableofs = view.getUint32(8, true);

	if (
		numLumps > 65536 ||
		infotableofs + numLumps * 16 > input.byteLength ||
		infotableofs < 12
	) {
		throw new Error(
			`convertWad: Corrupted WAD directory structure (${numLumps} lumps at offset ${infotableofs})`,
		);
	}

	const srcBytes = new Uint8Array(input);
	const lumps: WadLump[] = [];

	for (let i = 0; i < numLumps; i++) {
		const entryOffset = infotableofs + i * 16;
		const filepos = view.getUint32(entryOffset, true);
		const size = view.getUint32(entryOffset + 4, true);
		const name = cleanLumpName(
			srcBytes.subarray(entryOffset + 8, entryOffset + 16),
		);

		let data = new Uint8Array(0);
		if (size > 0 && filepos + size <= input.byteLength) {
			data = srcBytes.subarray(filepos, filepos + size);
		}

		lumps.push({ name, filepos, size, data });
	}

	return { wadType: magic, lumps };
}

/**
 * Organizes lumps and extracts entire WAD into a structured ZIP file.
 */
export function convertWadToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "READ_DIRECTORY");
	const { wadType, lumps } = parseWadLumps(input);

	onProgress?.(0.3, "CATEGORIZE_LUMPS");
	const zipFiles: Record<string, Uint8Array> = {};

	let currentSection: string | null = null;
	let currentMap: string | null = null;

	const mapLumpNames = new Set([
		"THINGS",
		"LINEDEFS",
		"SIDEDEFS",
		"VERTEXES",
		"SEGS",
		"SSECTORS",
		"NODES",
		"SECTORS",
		"REJECT",
		"BLOCKMAP",
		"BEHAVIOR",
		"SCRIPTS",
		"ZNODES",
	]);

	let soundCount = 0;
	let musicCount = 0;
	let spriteCount = 0;
	let flatCount = 0;
	let patchCount = 0;
	const mapsList: string[] = [];

	for (let i = 0; i < lumps.length; i++) {
		const lump = lumps[i];
		if (!lump) continue;
		const name = lump.name;

		// Section markers
		if (name === "S_START" || name === "SS_START") {
			currentSection = "sprites";
			continue;
		}
		if (name === "S_END" || name === "SS_END") {
			currentSection = null;
			continue;
		}
		if (name === "F_START" || name === "FF_START") {
			currentSection = "flats";
			continue;
		}
		if (name === "F_END" || name === "FF_END") {
			currentSection = null;
			continue;
		}
		if (name === "P_START" || name === "PP_START") {
			currentSection = "patches";
			continue;
		}
		if (name === "P_END" || name === "PP_END") {
			currentSection = null;
			continue;
		}
		if (name === "TX_START") {
			currentSection = "textures";
			continue;
		}
		if (name === "TX_END") {
			currentSection = null;
			continue;
		}
		if (name === "C_START") {
			currentSection = "colormaps";
			continue;
		}
		if (name === "C_END") {
			currentSection = null;
			continue;
		}

		// Map marker detection (e.g. E1M1 or MAP01)
		if (/^(E[1-9]M[1-9]|MAP[0-9]{2})$/.test(name)) {
			currentMap = name;
			mapsList.push(name);
			// Empty marker entry for the map itself
			continue;
		}

		// Check if part of the current map
		if (currentMap && mapLumpNames.has(name)) {
			zipFiles[`maps/${currentMap}/${name}.lmp`] = lump.data;
			continue;
		}
		if (currentMap && !mapLumpNames.has(name)) {
			currentMap = null; // Exit map group
		}

		// Skip 0-byte markers that are not handled
		if (lump.size === 0) {
			continue;
		}

		// Section-scoped lumps
		if (currentSection === "sprites") {
			zipFiles[`sprites/${name}.lmp`] = lump.data;
			spriteCount++;
			continue;
		}
		if (currentSection === "flats") {
			zipFiles[`flats/${name}.lmp`] = lump.data;
			flatCount++;
			continue;
		}
		if (currentSection === "patches") {
			zipFiles[`patches/${name}.lmp`] = lump.data;
			patchCount++;
			continue;
		}
		if (currentSection) {
			zipFiles[`${currentSection}/${name}.lmp`] = lump.data;
			continue;
		}

		// Audio: Sound effects (usually start with DS or DP)
		if (name.startsWith("DS") || name.startsWith("DP")) {
			const wavData = tryConvertDoomSound(lump);
			if (wavData) {
				zipFiles[`sounds/${name}.wav`] = wavData;
				soundCount++;
				continue;
			}
			zipFiles[`sounds/${name}.lmp`] = lump.data;
			soundCount++;
			continue;
		}

		// Audio: Music (usually start with D_)
		if (name.startsWith("D_")) {
			// Check if standard MIDI (MThd)
			if (
				lump.size >= 4 &&
				lump.data[0] === 0x4d &&
				lump.data[1] === 0x54 &&
				lump.data[2] === 0x68 &&
				lump.data[3] === 0x64
			) {
				zipFiles[`music/${name}.mid`] = lump.data;
			} else if (
				lump.size >= 4 &&
				lump.data[0] === 0x4d &&
				lump.data[1] === 0x55 &&
				lump.data[2] === 0x53 &&
				lump.data[3] === 0x1a
			) {
				zipFiles[`music/${name}.mus`] = lump.data;
			} else {
				zipFiles[`music/${name}.lmp`] = lump.data;
			}
			musicCount++;
			continue;
		}

		// Textures & configuration metadata
		if (
			name === "GENMIDI" ||
			name === "DMXGUS" ||
			name === "PLAYPAL" ||
			name === "COLORMAP" ||
			name === "TEXTURE1" ||
			name === "TEXTURE2" ||
			name === "PNAMES"
		) {
			zipFiles[`graphics/${name}.lmp`] = lump.data;
			continue;
		}

		if (name === "DEHACKED" || name === "MAPINFO" || name === "SNDINFO") {
			zipFiles[`${name}.txt`] = lump.data;
			continue;
		}

		// Fallback general lump
		zipFiles[`lumps/${name}.lmp`] = lump.data;
	}

	onProgress?.(0.6, "BUILD_MANIFEST");
	const manifestContent = [
		`# Doom WAD Extraction Report`,
		``,
		`- **Container Type:** ${wadType}`,
		`- **Total Lumps Processed:** ${lumps.length}`,
		`- **Sound Effects Extracted (.wav):** ${soundCount}`,
		`- **Music Tracks Extracted:** ${musicCount}`,
		`- **Sprites:** ${spriteCount}`,
		`- **Flats (Floor/Ceiling Textures):** ${flatCount}`,
		`- **Wall Patches:** ${patchCount}`,
		`- **Maps Identified:** ${mapsList.length > 0 ? mapsList.join(", ") : "None"}`,
		``,
		`Extracted completely client-side in browser with convrtr.`,
	].join("\n");

	zipFiles["WAD_MANIFEST.md"] = new TextEncoder().encode(manifestContent);

	onProgress?.(0.8, "COMPRESS_ZIP");
	const zipped = zipSync(zipFiles);

	onProgress?.(1.0, "DONE");
	return zipped.buffer as ArrayBuffer;
}
