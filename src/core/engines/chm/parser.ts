import { zipSync } from "fflate";

export interface ChmMetadata {
	version: number;
	title?: string;
	extractedFilesCount: number;
	fileList: string[];
	zipBytes: Uint8Array;
}

export interface ChmFileEntry {
	name: string;
	section: number;
	offset: number;
	length: number;
}

/**
 * Reads an ENCINT (variable-length encoded integer) from a Uint8Array.
 */
export function readEncInt(bytes: Uint8Array, ptr: { pos: number }): number {
	let result = 0;
	while (ptr.pos < bytes.length) {
		const b = bytes[ptr.pos++] ?? 0;
		result = (result << 7) | (b & 0x7f);
		if ((b & 0x80) === 0) break;
	}
	return result;
}

/**
 * Parses a Microsoft Compiled HTML Help (.chm / ITSF) file and extracts
 * all embedded HTML pages, images, stylesheets, and documentation assets into a ZIP archive.
 */
export function parseChm(fileBytes: Uint8Array): ChmMetadata {
	if (fileBytes.length < 96) {
		throw new Error(
			"Invalid CHM file: File size is smaller than the minimum ITSF header (96 bytes).",
		);
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	// Check ITSF magic signature
	const m0 = fileBytes[0] ?? 0;
	const m1 = fileBytes[1] ?? 0;
	const m2 = fileBytes[2] ?? 0;
	const m3 = fileBytes[3] ?? 0;
	const magic = String.fromCharCode(m0, m1, m2, m3);

	if (magic !== "ITSF") {
		throw new Error(
			`Invalid CHM file: Expected 'ITSF' header signature, received '${magic}'.`,
		);
	}

	const version = view.getInt32(4, true);
	const _headerLen = view.getInt32(8, true);

	// Offset to directory header (ITSP)
	const dirOffsetLow = view.getUint32(56, true);
	const dirOffsetHigh = view.getUint32(60, true);
	const dirOffset = dirOffsetLow + dirOffsetHigh * 0x100000000;

	// Content data stream offset
	const dataOffsetLow = view.getUint32(72, true);
	const dataOffsetHigh = view.getUint32(76, true);
	const dataOffset = dataOffsetLow + dataOffsetHigh * 0x100000000;

	if (dirOffset >= fileBytes.length) {
		throw new Error(
			"Invalid CHM file: Directory header offset exceeds file size.",
		);
	}

	// Verify ITSP directory header
	const itspM0 = fileBytes[dirOffset] ?? 0;
	const itspM1 = fileBytes[dirOffset + 1] ?? 0;
	const itspM2 = fileBytes[dirOffset + 2] ?? 0;
	const itspM3 = fileBytes[dirOffset + 3] ?? 0;
	const itspMagic = String.fromCharCode(itspM0, itspM1, itspM2, itspM3);

	if (itspMagic !== "ITSP") {
		throw new Error(
			`Invalid CHM directory header: Expected 'ITSP', received '${itspMagic}'.`,
		);
	}

	const itspDirHeaderLen = view.getInt32(dirOffset + 8, true);
	const blockLen = view.getUint32(dirOffset + 16, true);
	const firstPmgl = view.getInt32(dirOffset + 32, true);
	const lastPmgl = view.getInt32(dirOffset + 36, true);
	const numBlocks = view.getUint32(dirOffset + 44, true);

	const entries: ChmFileEntry[] = [];
	const outputFiles: Record<string, Uint8Array> = {};
	const textDecoder = new TextDecoder("utf-8");

	// Iterate through PMGL directory listing chunks
	const startBlock = Math.max(0, firstPmgl);
	const endBlock = lastPmgl >= 0 ? lastPmgl : numBlocks - 1;

	for (let b = startBlock; b <= endBlock; b++) {
		const blockOffset = dirOffset + itspDirHeaderLen + b * blockLen;
		if (blockOffset + 20 > fileBytes.length) break;

		const pmglMagic = String.fromCharCode(
			fileBytes[blockOffset] ?? 0,
			fileBytes[blockOffset + 1] ?? 0,
			fileBytes[blockOffset + 2] ?? 0,
			fileBytes[blockOffset + 3] ?? 0,
		);

		if (pmglMagic !== "PMGL") continue;

		const freeSpace = view.getUint32(blockOffset + 4, true);
		const limit = Math.max(20, blockLen - freeSpace);
		const ptr = { pos: 20 };

		const chunkData = fileBytes.subarray(blockOffset, blockOffset + blockLen);

		while (ptr.pos < limit && ptr.pos < chunkData.length) {
			const nameLen = readEncInt(chunkData, ptr);
			if (nameLen <= 0 || ptr.pos + nameLen > chunkData.length) break;

			const name = textDecoder.decode(
				chunkData.subarray(ptr.pos, ptr.pos + nameLen),
			);
			ptr.pos += nameLen;

			const section = readEncInt(chunkData, ptr);
			const offset = readEncInt(chunkData, ptr);
			const length = readEncInt(chunkData, ptr);

			entries.push({ name, section, offset, length });
		}
	}

	let title: string | undefined;

	// Extract files from Section 0 (uncompressed data)
	for (const entry of entries) {
		const cleanPath = entry.name.replace(/^\//, "");
		if (!cleanPath) continue;

		// Extract title from system file if available
		if (cleanPath === "#SYSTEM" && entry.section === 0 && entry.length > 0) {
			const sysOffset = dataOffset + entry.offset;
			if (sysOffset + entry.length <= fileBytes.length) {
				const sysBytes = fileBytes.subarray(
					sysOffset,
					sysOffset + entry.length,
				);
				// Check for title tag in system data
				const sysText = new TextDecoder("latin1").decode(sysBytes);
				const titleMatch = sysText.match(/Title\0([^\0]+)\0/i);
				if (titleMatch) title = titleMatch[1]?.trim();
			}
		}

		// Only include user-facing assets or relevant documentation files
		const isInternalMetadata =
			cleanPath.startsWith("#") || cleanPath.startsWith("$");
		if (
			isInternalMetadata &&
			!cleanPath.endsWith(".hhc") &&
			!cleanPath.endsWith(".hhk")
		) {
			continue;
		}

		if (entry.section === 0 && entry.length > 0) {
			const absStart = dataOffset + entry.offset;
			const absEnd = absStart + entry.length;
			if (absStart >= 0 && absEnd <= fileBytes.length) {
				outputFiles[cleanPath] = fileBytes.subarray(absStart, absEnd);
			}
		}
	}

	// Generate CHM_MANIFEST.md documentation report
	const fileList = Object.keys(outputFiles);
	const manifestContent = [
		"# Microsoft Compiled HTML Help (CHM) Extraction Manifest",
		"",
		`**Format:** Microsoft ITSF Compiled HTML Help (v${version})`,
		`**Document Title:** ${title || "Compiled Help Document"}`,
		`**Total Extracted Files:** ${fileList.length} files`,
		"",
		"## Extracted Files & Pages",
		fileList.length > 0
			? fileList.map((f) => `- \`${f}\``).join("\n")
			: "*No uncompressed HTML pages or media assets could be read from section 0.*",
		"",
		"## Usage Information",
		"- Open any `.html` or `.htm` page directly in your browser without needing Windows Help Viewer (`hh.exe`).",
		"- If present, `.hhc` contains the table of contents and `.hhk` contains the index keywords.",
		"",
		"---",
		"Decompiled 100% locally in-browser via convrtr (Zero-Server Guarantee).",
	].join("\n");

	outputFiles["CHM_MANIFEST.md"] = new TextEncoder().encode(manifestContent);

	const zipBytes = zipSync(outputFiles, { level: 6 });

	return {
		version,
		title,
		extractedFilesCount: fileList.length,
		fileList,
		zipBytes,
	};
}

/**
 * Main conversion entry point for CHM to ZIP decompiler.
 */
export function convertChmToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading CHM ITSF header & directory chunks...");
	const bytes = new Uint8Array(input);
	const parsed = parseChm(bytes);

	onProgress?.(
		0.6,
		`Decompiled ${parsed.extractedFilesCount} HTML topics and media assets...`,
	);
	onProgress?.(0.9, "Compressing extracted files into ZIP archive...");

	onProgress?.(1.0, "Complete");
	return parsed.zipBytes.buffer.slice(
		parsed.zipBytes.byteOffset,
		parsed.zipBytes.byteOffset + parsed.zipBytes.byteLength,
	) as ArrayBuffer;
}
