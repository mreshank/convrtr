import { inflateSync, zipSync } from "fflate";

/**
 * Parses Python pickle bytecode streams specifically for Ren'Py RPA archive indexes.
 */
export function parseRenPyPickle(
	bytes: Uint8Array,
): Record<string, Array<[number, number, Uint8Array | null]>> {
	const stack: unknown[] = [];
	const markStack: number[] = [];
	const memo: Map<number, unknown> = new Map();
	let cursor = 0;

	while (cursor < bytes.length) {
		const opcode = bytes[cursor++];
		if (opcode === 0x2e) {
			// STOP (.)
			break;
		}

		switch (opcode) {
			case 0x7d: // EMPTY_DICT (})
				stack.push({});
				break;

			case 0x5d: // EMPTY_LIST (])
				stack.push([]);
				break;

			case 0x28: // MARK (()
				markStack.push(stack.length);
				break;

			case 0x74: // TUPLE (t) or TUPLE1/2/3
			case 0x29: {
				// TUPLE ()
				const mark = markStack.pop() ?? 0;
				const tuple = stack.splice(mark);
				stack.push(tuple);
				break;
			}

			case 0x73: {
				// SETITEM (s)
				const val = stack.pop();
				const key = stack.pop();
				const dict = stack[stack.length - 1];
				if (dict && typeof dict === "object" && typeof key === "string") {
					(dict as Record<string, unknown>)[key] = val;
				}
				break;
			}

			case 0x75: {
				// SETITEMS (u)
				const mark = markStack.pop() ?? 0;
				const items = stack.splice(mark);
				const dict = stack[stack.length - 1];
				if (dict && typeof dict === "object") {
					for (let i = 0; i < items.length; i += 2) {
						const k = items[i];
						if (typeof k === "string") {
							(dict as Record<string, unknown>)[k] = items[i + 1];
						}
					}
				}
				break;
			}

			case 0x61: {
				// APPEND (a)
				const val = stack.pop();
				const list = stack[stack.length - 1];
				if (Array.isArray(list)) {
					list.push(val);
				}
				break;
			}

			case 0x65: {
				// APPENDS (e)
				const mark = markStack.pop() ?? 0;
				const items = stack.splice(mark);
				const list = stack[stack.length - 1];
				if (Array.isArray(list)) {
					list.push(...items);
				}
				break;
			}

			case 0x58: {
				// BINUNICODE (X)
				if (cursor + 4 > bytes.length) break;
				const b0 = bytes[cursor] ?? 0;
				const b1 = bytes[cursor + 1] ?? 0;
				const b2 = bytes[cursor + 2] ?? 0;
				const b3 = bytes[cursor + 3] ?? 0;
				const len = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
				cursor += 4;
				const str = new TextDecoder().decode(
					bytes.subarray(cursor, cursor + len),
				);
				cursor += len;
				stack.push(str);
				break;
			}

			case 0x55: {
				// SHORT_BINUNICODE (U)
				if (cursor >= bytes.length) break;
				const len = bytes[cursor++] ?? 0;
				const str = new TextDecoder().decode(
					bytes.subarray(cursor, cursor + len),
				);
				cursor += len;
				stack.push(str);
				break;
			}

			case 0x53: // STRING (S)
			case 0x56: {
				// UNICODE (V)
				let end = cursor;
				while (end < bytes.length && bytes[end] !== 0x0a) end++;
				let str = new TextDecoder().decode(bytes.subarray(cursor, end));
				if (str.startsWith("'") && str.endsWith("'")) {
					str = str.slice(1, -1);
				}
				cursor = end + 1;
				stack.push(str);
				break;
			}

			case 0x4a: {
				// BININT (J)
				if (cursor + 4 > bytes.length) break;
				const b0 = bytes[cursor] ?? 0;
				const b1 = bytes[cursor + 1] ?? 0;
				const b2 = bytes[cursor + 2] ?? 0;
				const b3 = bytes[cursor + 3] ?? 0;
				const val = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
				cursor += 4;
				stack.push(val);
				break;
			}

			case 0x4b: {
				// BININT1 (K)
				if (cursor >= bytes.length) break;
				stack.push(bytes[cursor++] ?? 0);
				break;
			}

			case 0x4d: {
				// BININT2 (M)
				if (cursor + 2 > bytes.length) break;
				const b0 = bytes[cursor] ?? 0;
				const b1 = bytes[cursor + 1] ?? 0;
				const val = b0 | (b1 << 8);
				cursor += 2;
				stack.push(val);
				break;
			}

			case 0x49: // INT (I)
			case 0x4c: {
				// LONG (L)
				let end = cursor;
				while (end < bytes.length && bytes[end] !== 0x0a) end++;
				const numStr = new TextDecoder()
					.decode(bytes.subarray(cursor, end))
					.replace(/[L\r]/g, "");
				cursor = end + 1;
				stack.push(parseInt(numStr, 10) || 0);
				break;
			}

			case 0x4e: // NONE (N)
				stack.push(null);
				break;

			case 0x70: // BINPUT (p)
				if (cursor < bytes.length) {
					memo.set(bytes[cursor++] ?? 0, stack[stack.length - 1]);
				}
				break;

			case 0x71: // BINGET (q)
				if (cursor < bytes.length) {
					stack.push(memo.get(bytes[cursor++] ?? 0));
				}
				break;

			default:
				// Skip unsupported non-structural opcodes
				break;
		}
	}

	return (stack[0] && typeof stack[0] === "object" ? stack[0] : {}) as Record<
		string,
		Array<[number, number, Uint8Array | null]>
	>;
}

/**
 * Extracts and unpacks all game scripts, sprites, audio, and resources from a Ren'Py (.rpa) archive.
 */
export function extractRpaToZip(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	const bytes = new Uint8Array(input);
	if (bytes.length < 16) {
		throw new Error(
			"extractRpaToZip: File is too small to be a valid Ren'Py .rpa archive",
		);
	}

	onProgress?.(0.1, "HEADER");

	// Search for first newline within first 100 bytes
	let newlineIdx = -1;
	for (let i = 0; i < Math.min(100, bytes.length); i++) {
		if (bytes[i] === 0x0a) {
			newlineIdx = i;
			break;
		}
	}

	if (newlineIdx === -1) {
		throw new Error(
			"extractRpaToZip: Invalid RPA header format (missing line terminator)",
		);
	}

	const headerLine = new TextDecoder()
		.decode(bytes.subarray(0, newlineIdx))
		.trim();

	const tokens = headerLine.split(/\s+/);
	const version = tokens[0] ?? "";

	if (!version.startsWith("RPA-")) {
		throw new Error(
			`extractRpaToZip: Unrecognized header signature "${version}" (expected RPA-3.0, RPA-3.2, or RPA-2.0)`,
		);
	}

	const offset = parseInt(tokens[1] ?? "0", 16);
	const key = tokens[2] ? parseInt(tokens[2], 16) : 0;

	if (offset <= 0 || offset >= bytes.length) {
		throw new Error(
			`extractRpaToZip: Corrupted or out-of-bounds index offset (0x${offset.toString(16)})`,
		);
	}

	onProgress?.(0.2, "INDEX");

	let indexBytes: Uint8Array;
	try {
		// Inflate zlib-compressed index
		indexBytes = inflateSync(bytes.subarray(offset));
	} catch {
		throw new Error(
			"extractRpaToZip: Failed to decompress zlib index stream at specified offset",
		);
	}

	const fileTable = parseRenPyPickle(indexBytes);
	const fileNames = Object.keys(fileTable);

	if (fileNames.length === 0) {
		throw new Error("extractRpaToZip: No files found in Ren'Py index table");
	}

	onProgress?.(0.35, "UNPACK");

	const zipEntries: Record<string, Uint8Array> = {};

	for (let i = 0; i < fileNames.length; i++) {
		const filename = fileNames[i];
		if (!filename) continue;
		const segments = fileTable[filename];
		if (!Array.isArray(segments) || segments.length === 0) continue;

		// Clean filename and normalize path separators
		const cleanName = filename
			.replace(/\.\.\//g, "")
			.replace(/^\/+/, "")
			.replace(/\\/g, "/");

		// Segments can contain multiple chunks or single [offset, length, prefix]
		const chunkParts: Uint8Array[] = [];

		for (const seg of segments) {
			if (!Array.isArray(seg) && typeof seg !== "object") continue;
			let segOffset = Number(seg[0] ?? 0);
			let segLen = Number(seg[1] ?? 0);
			const prefix = seg[2];

			// In RPA-3.0, offset and length are obfuscated with XOR key
			if (key !== 0) {
				segOffset ^= key;
				segLen ^= key;
			}

			if (segOffset < 0 || segOffset + segLen > bytes.length) continue;

			if (prefix) {
				const prefixBytes =
					typeof prefix === "string"
						? new TextEncoder().encode(prefix)
						: prefix instanceof Uint8Array
							? prefix
							: null;
				if (prefixBytes) {
					chunkParts.push(prefixBytes);
				}
			}

			chunkParts.push(bytes.subarray(segOffset, segOffset + segLen));
		}

		if (chunkParts.length === 1 && chunkParts[0]) {
			zipEntries[cleanName] = chunkParts[0];
		} else if (chunkParts.length > 1) {
			const totalLen = chunkParts.reduce((sum, p) => sum + p.length, 0);
			const combined = new Uint8Array(totalLen);
			let writePos = 0;
			for (const part of chunkParts) {
				combined.set(part, writePos);
				writePos += part.length;
			}
			zipEntries[cleanName] = combined;
		}

		if (i % 20 === 0) {
			onProgress?.(0.35 + (i / fileNames.length) * 0.5, "UNPACK");
		}
	}

	if (Object.keys(zipEntries).length === 0) {
		throw new Error(
			"extractRpaToZip: Could not extract any asset entries from this .rpa archive",
		);
	}

	onProgress?.(0.9, "COMPRESS");
	const zipped = zipSync(zipEntries);
	onProgress?.(1.0, "COMPLETE");

	const copy = new Uint8Array(zipped.byteLength);
	copy.set(zipped);
	return copy.buffer;
}
