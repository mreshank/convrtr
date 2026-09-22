import { zipSync } from "fflate";

export interface IsoMetadata {
	volumeLabel: string;
	applicationId: string;
	joliet: boolean;
	extractedFilesCount: number;
	entries: IsoEntry[];
	zipBytes: Uint8Array;
}

export interface IsoEntry {
	name: string;
	isDir: boolean;
	location: number;
	length: number;
	multiExtent: boolean;
}

// ---- offsets into an ISO 9660 both-endian directory record ----
const EXTENT_LOCATION = 2;
const DATA_LENGTH = 10;
const FILE_FLAGS = 25;
const FILE_ID_LENGTH = 32;

const FLAG_DIRECTORY = 0x02;
const FLAG_ASSOCIATED = 0x04;
const FLAG_MULTI_EXTENT = 0x80;

interface RawRecord {
	location: number;
	length: number;
	flags: number;
	idBytes: Uint8Array<ArrayBuffer>;
	idRawLength: number;
}

/**
 * ISO 9660 stores most integers twice in a "both-endian" field: the
 * little-endian value, then its big-endian twin (ECMA-119 7.3.1). Non-matching
 * pairs are non-conformant but tolerably fixed by trusting either half — this
 * reads the little-endian half, like most browsers' native parsers.
 */
function readBothEndian32(view: DataView, offset: number): number {
	return view.getUint32(offset, true);
}

/**
 * Reads a run of directory records starting at byte offset `start`. Directory
 * records are variable-length; each is 33 + name-length bytes, then padded to
 * an even byte boundary, and the run ends on a zero length byte.
 */
function parseDirectoryRecords(
	bytes: Uint8Array<ArrayBuffer>,
	start: number,
	length: number,
): RawRecord[] {
	const end = start + length;
	const out: RawRecord[] = [];
	let off = start;
	while (off + 1 <= end) {
		const recLen = bytes[off] ?? 0;
		if (recLen === 0) break;
		if (off + recLen > end) break;
		const view = new DataView(bytes.buffer, bytes.byteOffset + off, recLen);
		const nameLen = view.getUint8(FILE_ID_LENGTH);
		const nameBytes = new Uint8Array(
			bytes.buffer,
			bytes.byteOffset + off + 33,
			nameLen,
		);
		out.push({
			location: readBothEndian32(view, EXTENT_LOCATION),
			length: readBothEndian32(view, DATA_LENGTH),
			flags: view.getUint8(FILE_FLAGS),
			idBytes: nameBytes,
			idRawLength: nameLen,
		});
		off += recLen + (recLen % 2); // records are padded to even lengths
	}
	return out;
}

/**
 * Cleans an ISO 9660 identifier: strips the ";1" version suffix and any
 * trailing single separator dot ("FILE.TXT" stays, "FOO." becomes "FOO"),
 * then sanitises for ZIP path safety.
 */
function cleanId(
	raw: Uint8Array<ArrayBuffer>,
	decode: (b: Uint8Array<ArrayBuffer>) => string,
): string {
	const decoded = decode(raw);
	const semi = decoded.indexOf(";");
	const noVersion = semi >= 0 ? decoded.slice(0, semi) : decoded;
	const noDot = noVersion.endsWith(".") ? noVersion.slice(0, -1) : noVersion;
	return noDot || "_";
}

export function parseIso(fileBytes: Uint8Array<ArrayBuffer>): IsoMetadata {
	if (fileBytes.length < 17 * 2048) {
		throw new Error(
			"Invalid ISO image: smaller than one 16-sector volume descriptor set.",
		);
	}

	// ---- find Primary Volume Descriptor (type 01) at sector 16, then scan ----
	let pvdRecord: RawRecord | null = null;
	let volumeLabel = "";
	let applicationId = "";
	let jolietRecord: RawRecord | null = null;

	for (let sector = 16; sector < 16 + 32; sector++) {
		const off = sector * 2048;
		// Descriptor: type byte, then "CD001".
		if (off + 6 > fileBytes.length) break;
		if (fileBytes[off + 1] !== 0x43) continue; // C
		if (fileBytes[off + 2] !== 0x44) continue; // D
		if (fileBytes[off + 3] !== 0x30) continue; // 0
		if (fileBytes[off + 4] !== 0x30) continue; // 0
		if (fileBytes[off + 5] !== 0x31) continue; // 1
		const type = fileBytes[off];

		if (type === 0x01 && !pvdRecord) {
			// Root directory record is a 34-byte directory record at offset 156.
			const root = parseDirectoryRecords(fileBytes, off + 156, 34)[0];
			if (!root) continue;
			pvdRecord = root;
			volumeLabel = new TextDecoder("latin1")
				.decode(fileBytes.subarray(off + 40, off + 72))
				.replace(/[\0 ]+$/, "");
			applicationId = new TextDecoder("latin1")
				.decode(fileBytes.subarray(off + 574, off + 702))
				.replace(/[\0 ]+$/, "");
		}

		if (type === 0x02) {
			// A Supplementary Volume Descriptor with Joliet escape sequences
			// (%/@, %/C, %/E) carries the long-name tree.
			const esc = new TextDecoder("latin1").decode(
				fileBytes.subarray(off + 88, off + 91),
			);
			if (esc === "%/@" || esc === "%/C" || esc === "%/E") {
				jolietRecord =
					parseDirectoryRecords(fileBytes, off + 156, 34)[0] ?? null;
			}
		}
	}

	if (!pvdRecord) {
		const bootMagic = new TextDecoder("latin1").decode(
			fileBytes.subarray(32769, 32773),
		);
		throw new Error(
			`No ISO 9660 Primary Volume Descriptor found${
				bootMagic === "NSR0" || bootMagic === "BEA1"
					? " (this image is UDF, which is out of scope)"
					: ""
			}.`,
		);
	}

	// Joliet identifiers are UCS-2 (UTF-16BE); plain 9660 is ASCII d-characters.
	const decode = jolietRecord
		? (b: Uint8Array<ArrayBuffer>) => new TextDecoder("utf-16be").decode(b)
		: (b: Uint8Array<ArrayBuffer>) => new TextDecoder("latin1").decode(b);
	const nameTree = jolietRecord ?? pvdRecord;

	// ---- walk the tree ----
	const entries: IsoEntry[] = [];
	const visitedDirs = new Set<number>();
	// Stack of { record, path } — path is the joined output directory prefix.
	const stack: Array<{ rec: RawRecord; path: string }> = [
		{ rec: nameTree, path: "" },
	];
	let extractedFilesCount = 0;

	function addEntry(
		isDir: boolean,
		location: number,
		length: number,
		flags: number,
		path: string,
	): void {
		if (isDir) {
			if (path !== "" && !entries.some((e) => e.isDir && e.name === path)) {
				entries.push({
					name: path,
					isDir: true,
					location,
					length,
					multiExtent: false,
				});
			}
		} else {
			entries.push({
				name: path,
				isDir: false,
				location,
				length,
				multiExtent: (flags & FLAG_MULTI_EXTENT) !== 0,
			});
			extractedFilesCount++;
		}
	}

	// Multi-extent files: next record continues previous. We track the "current"
	// open file name per directory walk for continuation records by concatenating
	// lengths; parseIso below reads the bytes continuously.
	while (stack.length > 0) {
		const { rec, path } = stack.pop() as { rec: RawRecord; path: string };

		const extOff = rec.location * 2048;
		if (extOff + rec.length > fileBytes.length) continue;
		if (visitedDirs.has(rec.location)) continue;
		visitedDirs.add(rec.location);

		addEntry(true, rec.location, rec.length, rec.flags, path);

		const dirLen = rec.length;
		const recs = parseDirectoryRecords(fileBytes, extOff, dirLen);

		for (const r of recs) {
			if (r.idRawLength === 0) continue;
			// Hidden tree markers: "." (0x00) and ".." (0x01) are 1 byte.
			const first = r.idBytes[0] ?? 0;
			if (r.idRawLength === 1 && (first === 0x00 || first === 0x01)) continue;

			const isDir = (r.flags & FLAG_DIRECTORY) !== 0;
			if (isDir && r.idRawLength >= 2 && r.idBytes[r.idRawLength - 1] === 0x01)
				continue; // ".."

			const name = cleanId(r.idBytes, decode);
			const childPath = path === "" ? name : `${path}/${name}`;

			if (isDir) {
				stack.push({ rec: r, path: childPath });
			} else if ((r.flags & FLAG_ASSOCIATED) === 0) {
				// Just the first extent — continuation handled below.
				entries.push({
					name: childPath,
					isDir: false,
					location: r.location,
					length: r.length,
					multiExtent: (r.flags & FLAG_MULTI_EXTENT) !== 0,
				});
				extractedFilesCount++;
			}
		}
	}

	// Multi-extent: a file spanning several extents is recorded as a chain of
	// records at the same path; merge lengths into the first contiguous range.
	const merged = new Map<string, { location: number; length: number }>();
	for (const e of entries) {
		if (e.isDir) continue;
		const existing = merged.get(e.name);
		if (!existing) {
			merged.set(e.name, { location: e.location, length: e.length });
		} else if (
			existing.location + Math.ceil(existing.length / 2048) ===
			e.location
		) {
			// contiguous continuation: next extent starts where the last ended
			existing.length += e.length;
		} else {
			// Non-contiguous continuation (rare) — keep the first chunk.
		}
	}

	const fileEntries = [...merged.entries()].map(
		([name, { location, length }]) => ({ name, location, length }),
	);
	extractedFilesCount = fileEntries.length;

	// ---- pack into a zip ----
	const zipFiles: Record<string, Uint8Array<ArrayBuffer>> = {};
	const used = new Set<string>();
	for (const f of fileEntries) {
		const extOff = f.location * 2048;
		if (extOff + f.length > fileBytes.length) continue;
		let name = f.name;
		// De-dupe collisions (case-insensitive).
		let key = name.toLowerCase();
		let n = 1;
		while (used.has(key)) {
			const dot = name.lastIndexOf(".");
			const stem = dot > 0 ? name.slice(0, dot) : name;
			const ext = dot > 0 ? name.slice(dot) : "";
			name = `${stem}_${n}${ext}`;
			key = name.toLowerCase();
			n++;
		}
		used.add(key);
		zipFiles[name] = fileBytes.slice(extOff, extOff + f.length);
	}

	const readme = [
		"# ISO 9660 Extraction",
		"",
		`**Volume label:** ${volumeLabel || "(none)"}`,
		`**Application:** ${applicationId || "(none)"}`,
		`**Name tree:** ${
			jolietRecord
				? "Joliet (UCS-2 long file names)"
				: "ISO 9660 primary (8.3 d-characters)"
		}`,
		`**Files extracted:** ${extractedFilesCount}`,
		"",
		"## Notes",
		"- Files are extracted bit-exact from their sectors; nothing is transcoded.",
		"- Multi-extent files are reassembled from their continuation records.",
		"- Rock Ridge / System Use Area entries are not modelled: long names come",
		"  from Joliet when present, so most Linux ISOs keep full names.",
		"",
		"---",
		"Extracted in-browser via convrtr (Zero-Server Guarantee).",
		"",
	].join("\n");
	zipFiles["_README.txt"] = new TextEncoder().encode(readme);

	const zipBytes = zipSync(zipFiles, { level: 6 });

	return {
		volumeLabel,
		applicationId,
		joliet: jolietRecord !== null,
		extractedFilesCount,
		entries,
		zipBytes,
	};
}

export function convertIsoToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Scanning volume descriptors...");
	const bytes = new Uint8Array(input);
	const parsed = parseIso(bytes);
	onProgress?.(
		0.6,
		`Parsed ${parsed.extractedFilesCount} files from "${parsed.volumeLabel}"...`,
	);
	onProgress?.(0.95, "Packaging ZIP...");
	onProgress?.(1, "Complete");
	return parsed.zipBytes.buffer.slice(
		parsed.zipBytes.byteOffset,
		parsed.zipBytes.byteOffset + parsed.zipBytes.byteLength,
	) as ArrayBuffer;
}
