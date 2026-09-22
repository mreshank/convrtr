/**
 * KiriKiri / TVP (.xp3) Visual Novel Archive Parser & Extractor
 *
 * Extracts visual novel game assets (backgrounds, sprites, CGs, sound effects,
 * BGM, and scenario scripts) from proprietary KiriKiri 2 / TVP XP3 archives.
 *
 * Compliant with KiriKiri XP3 archive specifications.
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

import { unzlibSync, zipSync } from "fflate";

export interface Xp3FileEntry {
	name: string;
	originalSize: number;
	archivedSize: number;
	segments: {
		isCompressed: boolean;
		offset: number;
		originalSize: number;
		archivedSize: number;
	}[];
}

export interface Xp3Archive {
	magic: string;
	indexOffset: number;
	files: Xp3FileEntry[];
}

const XP3_MAGIC = [
	0x58, 0x50, 0x33, 0x0d, 0x0a, 0x20, 0x0a, 0x1a, 0x8b, 0x67, 0x01,
];

export function parseXp3Archive(raw: Uint8Array): Xp3Archive {
	if (raw.length < 19) {
		throw new Error(
			`Invalid XP3 archive: file too small (${raw.length} bytes, minimum 19 bytes for header).`,
		);
	}

	// 1. Verify 11-byte magic
	for (let i = 0; i < XP3_MAGIC.length; i++) {
		if (raw[i] !== XP3_MAGIC[i]) {
			throw new Error("Invalid XP3 archive: missing 'XP3' header signature.");
		}
	}

	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
	const indexOffsetBig = view.getBigUint64(11, true);
	const indexOffset = Number(indexOffsetBig);

	if (indexOffset <= 0 || indexOffset >= raw.length) {
		throw new Error(
			`Invalid XP3 archive: index offset out of range (${indexOffset}, file size is ${raw.length}).`,
		);
	}

	// 2. Decode index stream
	let indexData: Uint8Array;
	const indexFlag = raw[indexOffset] ?? 0;

	if (indexFlag === 0x80) {
		// Compressed index: 1 byte flag + 8 bytes compSize + 8 bytes uncompSize + zlib stream
		if (indexOffset + 17 > raw.length) {
			throw new Error(
				"Invalid XP3 archive: truncated compressed index header.",
			);
		}
		const compSize = Number(view.getBigUint64(indexOffset + 1, true));
		const streamStart = indexOffset + 17;
		if (streamStart + compSize > raw.length) {
			throw new Error(
				"Invalid XP3 archive: compressed index data exceeds file bounds.",
			);
		}
		const compBytes = raw.subarray(streamStart, streamStart + compSize);
		try {
			indexData = unzlibSync(compBytes);
		} catch (err) {
			throw new Error(
				`Failed to decompress XP3 index: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	} else if (indexFlag === 0x00) {
		// Uncompressed index: 1 byte flag + 8 bytes uncompSize + stream
		if (indexOffset + 9 > raw.length) {
			throw new Error(
				"Invalid XP3 archive: truncated uncompressed index header.",
			);
		}
		const uncompSize = Number(view.getBigUint64(indexOffset + 1, true));
		const streamStart = indexOffset + 9;
		indexData = raw.subarray(streamStart, streamStart + uncompSize);
	} else {
		// Fallback: direct uncompressed chunk stream starting at indexOffset
		indexData = raw.subarray(indexOffset);
	}

	// 3. Parse chunks inside indexData
	const files: Xp3FileEntry[] = [];
	const indexView = new DataView(
		indexData.buffer,
		indexData.byteOffset,
		indexData.byteLength,
	);
	let pos = 0;

	while (pos + 12 <= indexData.length) {
		const chunkMagic = new TextDecoder("ascii").decode(
			indexData.subarray(pos, pos + 4),
		);
		const chunkSize = Number(indexView.getBigUint64(pos + 4, true));
		const chunkDataStart = pos + 12;
		const nextPos = chunkDataStart + chunkSize;

		if (chunkMagic === "File") {
			// Container for a single file's sub-chunks
			let subPos = chunkDataStart;
			const subEnd = Math.min(nextPos, indexData.length);

			let fileName = "";
			let origSize = 0;
			let archSize = 0;
			const segments: Xp3FileEntry["segments"] = [];

			while (subPos + 12 <= subEnd) {
				const subMagic = new TextDecoder("ascii").decode(
					indexData.subarray(subPos, subPos + 4),
				);
				const subSize = Number(indexView.getBigUint64(subPos + 4, true));
				const subDataStart = subPos + 12;
				const subNext = subDataStart + subSize;

				if (subMagic === "info") {
					// info chunk:
					// 4 bytes flags
					// 8 bytes original size
					// 8 bytes archived size
					// 2 bytes name length (chars)
					// (name length * 2) bytes UTF-16LE filename
					if (subDataStart + 22 <= subEnd) {
						origSize = Number(indexView.getBigUint64(subDataStart + 4, true));
						archSize = Number(indexView.getBigUint64(subDataStart + 12, true));
						const nameChars = indexView.getUint16(subDataStart + 20, true);
						const nameBytesLen = nameChars * 2;
						const nameStart = subDataStart + 22;
						if (nameStart + nameBytesLen <= subEnd) {
							fileName = new TextDecoder("utf-16le")
								.decode(indexData.subarray(nameStart, nameStart + nameBytesLen))
								.replace(/\0[\s\S]*$/, "");
						}
					}
				} else if (subMagic === "segs") {
					// segs chunk: list of segments (each segment is 28 bytes)
					// 4 bytes flags (1 = zlib compressed)
					// 8 bytes offset in raw XP3 file
					// 8 bytes original size
					// 8 bytes archived size
					let segPos = subDataStart;
					while (segPos + 28 <= subNext && segPos + 28 <= subEnd) {
						const segFlags = indexView.getUint32(segPos, true);
						const segOffset = Number(indexView.getBigUint64(segPos + 4, true));
						const segOrig = Number(indexView.getBigUint64(segPos + 12, true));
						const segArch = Number(indexView.getBigUint64(segPos + 20, true));

						segments.push({
							isCompressed: (segFlags & 1) !== 0,
							offset: segOffset,
							originalSize: segOrig,
							archivedSize: segArch,
						});
						segPos += 28;
					}
				}

				subPos = subNext;
			}

			if (fileName) {
				files.push({
					name: fileName,
					originalSize: origSize,
					archivedSize: archSize,
					segments,
				});
			}
		}

		pos = nextPos;
	}

	return {
		magic: "XP3",
		indexOffset,
		files,
	};
}

export function extractXp3ToZip(
	raw: Uint8Array,
	options?: {
		json?: boolean;
		onProgress?: (ratio: number, message: string) => void;
	},
): Uint8Array {
	const archive = parseXp3Archive(raw);

	if (options?.json) {
		const summary = {
			format: "KiriKiri XP3 Archive",
			indexOffset: archive.indexOffset,
			fileCount: archive.files.length,
			files: archive.files.map((f) => ({
				name: f.name,
				originalBytes: f.originalSize,
				archivedBytes: f.archivedSize,
				segmentsCount: f.segments.length,
			})),
		};
		return new TextEncoder().encode(JSON.stringify(summary, null, 2));
	}

	const zipFiles: Record<string, Uint8Array> = {};
	const total = archive.files.length;

	for (let i = 0; i < total; i++) {
		const entry = archive.files[i];
		if (!entry) continue;
		options?.onProgress?.((i + 1) / total, `Extracting ${entry.name}...`);

		// Combine data across segments
		const parts: Uint8Array[] = [];
		let totalLen = 0;

		for (const seg of entry.segments) {
			if (seg.offset + seg.archivedSize <= raw.length) {
				const segSlice = raw.subarray(
					seg.offset,
					seg.offset + seg.archivedSize,
				);
				if (seg.isCompressed) {
					try {
						const decomp = unzlibSync(segSlice);
						parts.push(decomp);
						totalLen += decomp.length;
					} catch {
						// Fallback to raw slice if unzlib fails
						parts.push(segSlice);
						totalLen += segSlice.length;
					}
				} else {
					parts.push(segSlice);
					totalLen += segSlice.length;
				}
			}
		}

		let fileData: Uint8Array;
		if (parts.length === 1 && parts[0]) {
			fileData = parts[0];
		} else {
			fileData = new Uint8Array(totalLen);
			let off = 0;
			for (const p of parts) {
				fileData.set(p, off);
				off += p.length;
			}
		}

		// Normalize path
		const normalizedName = entry.name.replace(/\\/g, "/").replace(/^\/+/, "");
		zipFiles[normalizedName] = fileData;
	}

	// Add manifest
	const manifest = {
		engine: "KiriKiri / TVP (XP3)",
		totalFiles: archive.files.length,
		extractedFiles: Object.keys(zipFiles).map((name) => ({
			name,
			sizeBytes: zipFiles[name]?.length ?? 0,
		})),
	};
	zipFiles["manifest.json"] = new TextEncoder().encode(
		JSON.stringify(manifest, null, 2),
	);

	return zipSync(zipFiles);
}
