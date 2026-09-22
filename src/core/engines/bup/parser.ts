/**
 * Sega Saturn Backup Memory (.bup / .bin) Save Carver & Extractor
 *
 * Parses Sega Saturn internal backup RAM and cartridge dumps (BackUpRam Format)
 * as well as standalone .bup save files. Extracts save names, timestamps,
 * Shift-JIS comments, languages, and carves standalone .bup and raw .bin saves.
 *
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

import { zipSync } from "fflate";

export interface SaturnSave {
	index: number;
	name: string;
	comment: string;
	language: string;
	timestampMinutes: number;
	dateIso: string;
	dataSize: number;
	headerBytes: Uint8Array;
	payloadBytes: Uint8Array;
	standaloneBup: Uint8Array;
}

export interface SaturnBackupDump {
	isFullDump: boolean;
	totalBlocks: number;
	saves: SaturnSave[];
}

const SATURN_LANGUAGES: Record<number, string> = {
	0: "Japanese",
	1: "English",
	2: "French",
	3: "German",
	4: "Spanish",
	5: "Italian",
};

const BASE_1980_MS = Date.UTC(1980, 0, 1, 0, 0, 0);
const BLOCK_SIZE = 64;

export function parseSaturnBackup(raw: Uint8Array): SaturnBackupDump {
	if (raw.length < 64) {
		throw new Error(
			`Invalid Sega Saturn file: too small (${raw.length} bytes, minimum 64 bytes).`,
		);
	}

	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

	// Check if this is a native memory card / internal RAM dump with "BackUpRam Format"
	const magic = new TextDecoder("ascii").decode(raw.subarray(0, 16));
	const isFullDump = magic.startsWith("BackUpRam Format");

	const saves: SaturnSave[] = [];

	if (isFullDump) {
		const totalBlocks = Math.floor(raw.length / BLOCK_SIZE);

		// Scan blocks starting from block 2
		for (let b = 2; b < totalBlocks; b++) {
			const offset = b * BLOCK_SIZE;
			const blockHeader = view.getUint32(offset, false); // big-endian

			// 0x80000000 marks the start of an allocated game save
			if ((blockHeader & 0x80000000) !== 0) {
				const name = cleanString(raw.subarray(offset + 4, offset + 15));
				const langCode = raw[offset + 15] ?? 0;
				const language = SATURN_LANGUAGES[langCode] ?? `Code ${langCode}`;
				const comment = cleanString(raw.subarray(offset + 16, offset + 26));
				const timestampMinutes = view.getUint32(offset + 26, false);
				const dataSize = view.getUint32(offset + 30, false);

				const dateIso =
					timestampMinutes > 0
						? new Date(
								BASE_1980_MS + timestampMinutes * 60 * 1000,
							).toISOString()
						: "1980-01-01T00:00:00.000Z";

				// Read block table (up to 15 16-bit block indices at offset + 34)
				const allocatedBlocks: number[] = [];
				for (let slot = 0; slot < 15; slot++) {
					const blkIdx = view.getUint16(offset + 34 + slot * 2, false);
					if (blkIdx > 0 && blkIdx < totalBlocks) {
						allocatedBlocks.push(blkIdx);
					}
				}

				// If block table is empty or smaller than data size, collect contiguous blocks
				const neededBlocks = Math.max(1, Math.ceil(dataSize / BLOCK_SIZE));
				let payload: Uint8Array;

				if (allocatedBlocks.length > 0) {
					payload = new Uint8Array(allocatedBlocks.length * BLOCK_SIZE);
					for (let i = 0; i < allocatedBlocks.length; i++) {
						const blk = allocatedBlocks[i];
						if (blk !== undefined) {
							const blkStart = blk * BLOCK_SIZE;
							payload.set(
								raw.subarray(blkStart, blkStart + BLOCK_SIZE),
								i * BLOCK_SIZE,
							);
						}
					}
				} else {
					// Fallback: contiguous blocks following the header block
					const startOff = (b + 1) * BLOCK_SIZE;
					const endOff = Math.min(
						raw.length,
						startOff + neededBlocks * BLOCK_SIZE,
					);
					payload = raw.slice(startOff, endOff);
				}

				// Trim payload to exact dataSize if valid
				const finalPayload =
					dataSize > 0 && dataSize <= payload.length
						? payload.subarray(0, dataSize)
						: payload;

				const headerBytes = raw.slice(offset, offset + BLOCK_SIZE);
				const standaloneBup = new Uint8Array(BLOCK_SIZE + finalPayload.length);
				standaloneBup.set(headerBytes, 0);
				standaloneBup.set(finalPayload, BLOCK_SIZE);

				saves.push({
					index: saves.length + 1,
					name: name || `SAVE_${saves.length + 1}`,
					comment,
					language,
					timestampMinutes,
					dateIso,
					dataSize,
					headerBytes,
					payloadBytes: finalPayload,
					standaloneBup,
				});
			}
		}

		return {
			isFullDump: true,
			totalBlocks,
			saves,
		};
	}

	// Otherwise, handle standalone .bup file (64-byte header + data)
	const name = cleanString(raw.subarray(4, 15));
	const langCode = raw[15] ?? 0;
	const language = SATURN_LANGUAGES[langCode] ?? `Code ${langCode}`;
	const comment = cleanString(raw.subarray(16, 26));
	const timestampMinutes = view.getUint32(26, false);
	const dataSize = view.getUint32(30, false);

	const dateIso =
		timestampMinutes > 0
			? new Date(BASE_1980_MS + timestampMinutes * 60 * 1000).toISOString()
			: "1980-01-01T00:00:00.000Z";

	const headerBytes = raw.slice(0, BLOCK_SIZE);
	const rawPayload = raw.slice(BLOCK_SIZE);
	const finalPayload =
		dataSize > 0 && dataSize <= rawPayload.length
			? rawPayload.subarray(0, dataSize)
			: rawPayload;

	saves.push({
		index: 1,
		name: name || "SATURN_SAVE",
		comment,
		language,
		timestampMinutes,
		dateIso,
		dataSize,
		headerBytes,
		payloadBytes: finalPayload,
		standaloneBup: raw,
	});

	return {
		isFullDump: false,
		totalBlocks: Math.ceil(raw.length / BLOCK_SIZE),
		saves,
	};
}

function cleanString(bytes: Uint8Array): string {
	try {
		return new TextDecoder("shift-jis").decode(bytes).replace(/\0/g, "").trim();
	} catch {
		return new TextDecoder("latin1").decode(bytes).replace(/\0/g, "").trim();
	}
}

export function formatSaturnSummary(dump: SaturnBackupDump): string {
	return JSON.stringify(
		{
			isFullDump: dump.isFullDump,
			totalBlocks: dump.totalBlocks,
			saveCount: dump.saves.length,
			saves: dump.saves.map((s) => ({
				index: s.index,
				name: s.name,
				comment: s.comment,
				language: s.language,
				dataSizeBytes: s.dataSize,
				timestamp: s.dateIso,
			})),
		},
		null,
		2,
	);
}

export function convertBupToZip(
	raw: Uint8Array,
	options?: {
		json?: boolean;
		onProgress?: (ratio: number, message: string) => void;
	},
): Uint8Array {
	const dump = parseSaturnBackup(raw);

	if (options?.json) {
		const summaryText = formatSaturnSummary(dump);
		return new TextEncoder().encode(summaryText);
	}

	const zipFiles: Record<string, Uint8Array> = {};
	const total = dump.saves.length;

	for (let i = 0; i < total; i++) {
		const s = dump.saves[i];
		if (!s) continue;
		options?.onProgress?.((i + 1) / total, `Extracting ${s.name}...`);
		const safeName =
			s.name.replace(/[^A-Za-z0-9_-]/g, "_") || `save_${s.index}`;

		// 1. Standalone .bup file (standard 64-byte header + payload)
		zipFiles[`bup/${safeName}.bup`] = s.standaloneBup;

		// 2. Raw payload binary
		zipFiles[`raw/${safeName}.bin`] = s.payloadBytes;
	}

	// 3. Manifest & Markdown report
	zipFiles["manifest.json"] = new TextEncoder().encode(
		formatSaturnSummary(dump),
	);

	let md = "# Sega Saturn Backup Memory Manifest\n\n";
	md += `* **Format:** ${dump.isFullDump ? "Full Backup RAM Dump" : "Standalone BUP Save"}\n`;
	md += `* **Total Saves Extracted:** ${dump.saves.length}\n\n`;
	md += "| Index | Game Name | Comment | Language | Size | Save Date |\n";
	md += "|---|---|---|---|---|---|\n";
	for (const s of dump.saves) {
		md += `| ${s.index} | \`${s.name}\` | ${s.comment || "—"} | ${s.language} | ${s.dataSize} B | ${s.dateIso} |\n`;
	}
	zipFiles["README.md"] = new TextEncoder().encode(md);

	return zipSync(zipFiles);
}
