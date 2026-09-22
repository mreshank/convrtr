/**
 * PlayStation 2 EMS / uLaunchELF Save Container (.psu) Carver & Extractor
 *
 * Parses EMS / uLaunchELF .psu save containers used by homebrew and emulators
 * (PCSX2, AetherSX2). Extracts save directory names, creation/modification
 * timestamps, internal files (icon.sys, 3D icon meshes, save states), and
 * packages them into structured ZIP archives.
 *
 * Strictly zero-emoji, 100% client-side in-browser execution.
 */

import { zipSync } from "fflate";

export interface PsuFileEntry {
	name: string;
	size: number;
	createdIso: string;
	modifiedIso: string;
	data: Uint8Array;
}

export interface PsuSaveInfo {
	directoryName: string;
	entryCount: number;
	createdIso: string;
	modifiedIso: string;
	files: PsuFileEntry[];
}

function parsePs2Timestamp(bytes: Uint8Array, offset: number): string {
	if (offset + 8 > bytes.length) return "Unknown";
	const sec = bytes[offset + 0] ?? 0;
	const min = bytes[offset + 1] ?? 0;
	const hour = bytes[offset + 2] ?? 0;
	const day = bytes[offset + 3] ?? 1;
	const month = bytes[offset + 4] ?? 1;
	const year =
		(bytes[offset + 5] ?? 0) | ((bytes[offset + 6] ?? 0) << 8) || 2000;

	const yStr = String(year).padStart(4, "0");
	const mStr = String(Math.max(1, Math.min(12, month))).padStart(2, "0");
	const dStr = String(Math.max(1, Math.min(31, day))).padStart(2, "0");
	const hStr = String(Math.max(0, Math.min(23, hour))).padStart(2, "0");
	const miStr = String(Math.max(0, Math.min(59, min))).padStart(2, "0");
	const sStr = String(Math.max(0, Math.min(59, sec))).padStart(2, "0");

	return `${yStr}-${mStr}-${dStr}T${hStr}:${miStr}:${sStr}Z`;
}

export function parsePsuContainer(raw: Uint8Array): PsuSaveInfo {
	if (raw.length < 512) {
		throw new Error(
			`Invalid PS2 PSU file: file size too small (${raw.length} bytes, minimum 512 bytes).`,
		);
	}

	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

	let directoryName = "PS2_SAVE";
	let entryCount = 0;
	let dirCreatedIso = "";
	let dirModifiedIso = "";
	const files: PsuFileEntry[] = [];

	let offset = 0;
	let isFirst = true;

	while (offset + 512 <= raw.length) {
		const typeWord = view.getUint16(offset, true);
		// Size / Count field is at offset + 4 (uint32 LE)
		// Or in some EMS variants, at offset + 5. Check both.
		let sizeOrCount = view.getUint32(offset + 4, true);
		if (sizeOrCount > 100000000) {
			sizeOrCount = view.getUint32(offset + 5, true);
		}

		// Read name at offset + 0x40 (64 bytes in)
		let name = "";
		const nameSlice = raw.subarray(offset + 0x40, offset + 512);
		for (let i = 0; i < nameSlice.length; i++) {
			const ch = nameSlice[i] ?? 0;
			if (ch === 0) break;
			if (ch >= 32 && ch <= 126) name += String.fromCharCode(ch);
		}
		name = name.trim();

		const createdIso = parsePs2Timestamp(raw, offset + 8);
		const modifiedIso = parsePs2Timestamp(raw, offset + 16);

		if (isFirst) {
			isFirst = false;
			directoryName = name || "PS2_SAVE";
			entryCount = sizeOrCount;
			dirCreatedIso = createdIso;
			dirModifiedIso = modifiedIso;
			offset += 512;
			continue;
		}

		// Skip dot entries (".", "..")
		if (name === "." || name === "..") {
			offset += 512;
			continue;
		}

		const fileSize = sizeOrCount;
		const fileData =
			fileSize > 0 && offset + 512 + fileSize <= raw.length
				? raw.subarray(offset + 512, offset + 512 + fileSize)
				: new Uint8Array(0);

		if (name.length > 0) {
			files.push({
				name,
				size: fileSize,
				createdIso,
				modifiedIso,
				data: fileData,
			});
		}

		// PSU file payloads are aligned to 1024 bytes (or 512 bytes)
		const align1024 = (fileSize + 1023) & ~1023;
		const align512 = (fileSize + 511) & ~511;

		if (fileSize === 0) {
			offset += 512;
		} else {
			// Check if next 512-byte header exists at 1024-aligned boundary
			const next1024 = offset + 512 + align1024;
			const next512 = offset + 512 + align512;

			if (next1024 + 512 <= raw.length) {
				offset = next1024;
			} else if (next512 + 512 <= raw.length) {
				offset = next512;
			} else {
				offset = next1024;
			}
		}
	}

	return {
		directoryName,
		entryCount: files.length,
		createdIso: dirCreatedIso,
		modifiedIso: dirModifiedIso,
		files,
	};
}

export function formatPsuManifest(info: PsuSaveInfo): string {
	return JSON.stringify(
		{
			directoryName: info.directoryName,
			totalFiles: info.files.length,
			createdDate: info.createdIso,
			modifiedDate: info.modifiedIso,
			files: info.files.map((f) => ({
				name: f.name,
				sizeBytes: f.size,
				created: f.createdIso,
				modified: f.modifiedIso,
			})),
		},
		null,
		2,
	);
}

export function convertPsuToZip(
	raw: Uint8Array,
	options?: {
		json?: boolean;
		onProgress?: (ratio: number, message: string) => void;
	},
): Uint8Array {
	const info = parsePsuContainer(raw);

	if (options?.json) {
		const jsonText = formatPsuManifest(info);
		return new TextEncoder().encode(jsonText);
	}

	const zipFiles: Record<string, Uint8Array> = {};
	const safeDir =
		info.directoryName.replace(/[^A-Za-z0-9_-]/g, "_") || "ps2_save";

	// 1. Pack individual files inside save directory
	const total = info.files.length;
	for (let i = 0; i < total; i++) {
		const file = info.files[i];
		if (!file) continue;
		options?.onProgress?.((i + 1) / (total + 1), `Unpacking ${file.name}...`);
		const safeFileName = file.name.replace(/[^A-Za-z0-9_.-]/g, "_");
		zipFiles[`${safeDir}/${safeFileName}`] = file.data;
	}

	// 2. Manifests
	zipFiles["manifest.json"] = new TextEncoder().encode(formatPsuManifest(info));

	let md = "# PlayStation 2 PSU Save Manifest\n\n";
	md += `* **Save Directory:** \`${info.directoryName}\`\n`;
	md += `* **Creation Date:** ${info.createdIso || "—"}\n`;
	md += `* **Modification Date:** ${info.modifiedIso || "—"}\n`;
	md += `* **Files Extracted:** ${info.files.length}\n\n`;
	md += "| File Name | Size (Bytes) | Modified Date |\n";
	md += "|---|---|---|\n";
	for (const f of info.files) {
		md += `| \`${f.name}\` | ${f.size} B | ${f.modifiedIso} |\n`;
	}
	zipFiles["README.md"] = new TextEncoder().encode(md);

	options?.onProgress?.(1.0, "Complete");
	return zipSync(zipFiles);
}
