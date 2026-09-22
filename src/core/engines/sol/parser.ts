/**
 * Adobe Flash Local Shared Object (.sol) Parser & JSON Converter.
 *
 * .sol files ("Flash cookies" / game saves) store client-side persistent data
 * for Adobe Flash games and applications in serialized Action Message Format (AMF0/AMF3).
 * Flash preservation projects (Flashpoint Archive, Ruffle, Newgrounds) and gamers
 * frequently need to inspect, edit, or recover game save files from .sol containers.
 *
 * File Structure:
 * - 0x00 - 0x01: Magic marker 0x00 0xBF
 * - 0x02 - 0x05: Total file length (32-bit BE)
 * - 0x06 - 0x09: Magic tag "TCSO" (0x54 0x43 0x53 0x4F)
 * - 0x0A - 0x0D: 0x00 0x04 0x00 0x00 (padding/version)
 * - Name: 16-bit BE length + UTF-8 string (SharedObject name)
 * - Padding: 4 bytes (0x00 0x00 0x00 0x00)
 * - AMF0 Payload: key-value pairs of serialized objects until EOF
 */

export interface SolFile {
	name: string;
	data: Record<string, unknown>;
}

export function parseSol(fileBytes: Uint8Array): SolFile {
	if (fileBytes.length < 16) {
		throw new Error("Invalid .sol file: file is too small.");
	}

	const view = new DataView(
		fileBytes.buffer,
		fileBytes.byteOffset,
		fileBytes.byteLength,
	);

	// 1. Verify header: 0x00 0xBF
	if (view.getUint8(0) !== 0x00 || view.getUint8(1) !== 0xbf) {
		throw new Error(
			`Invalid .sol header: expected 0x00 0xBF, received 0x${view.getUint8(0).toString(16)} 0x${view.getUint8(1).toString(16)}.`,
		);
	}

	// 2. Verify "TCSO" tag at offset 6
	const tag = new TextDecoder("ascii").decode(fileBytes.subarray(6, 10));
	if (tag !== "TCSO") {
		throw new Error(`Invalid .sol tag: expected "TCSO", received "${tag}".`);
	}

	let offset = 10;
	// Skip 4 bytes padding (version / header padding)
	offset += 4;

	// Read SharedObject name
	if (offset + 2 > fileBytes.length) {
		throw new Error(
			"Truncated .sol file: cannot read SharedObject name length.",
		);
	}
	const nameLen = view.getUint16(offset, false);
	offset += 2;

	if (offset + nameLen > fileBytes.length) {
		throw new Error("Truncated .sol file: cannot read SharedObject name.");
	}
	const soName = new TextDecoder("utf-8").decode(
		fileBytes.subarray(offset, offset + nameLen),
	);
	offset += nameLen;

	// Skip 4 bytes padding (AMF version / padding)
	offset += 4;

	// 3. Parse AMF0 payload key-value pairs
	const data: Record<string, unknown> = {};

	while (offset < fileBytes.length) {
		if (offset + 2 > fileBytes.length) break;
		const keyLen = view.getUint16(offset, false);
		offset += 2;

		if (
			keyLen === 0 &&
			offset < fileBytes.length &&
			view.getUint8(offset) === 0x09
		) {
			// Object end marker
			offset++;
			continue;
		}

		if (offset + keyLen > fileBytes.length) break;
		const key = new TextDecoder("utf-8").decode(
			fileBytes.subarray(offset, offset + keyLen),
		);
		offset += keyLen;

		if (offset >= fileBytes.length) break;
		const { value, nextOffset } = readAmf0Value(fileBytes, view, offset);
		data[key] = value;
		offset = nextOffset;
	}

	return {
		name: soName,
		data,
	};
}

interface ReadResult {
	value: unknown;
	nextOffset: number;
}

function readAmf0Value(
	bytes: Uint8Array,
	view: DataView,
	offset: number,
): ReadResult {
	if (offset >= bytes.length) {
		return { value: null, nextOffset: offset };
	}

	const type = view.getUint8(offset++);

	switch (type) {
		case 0x00: {
			// Number (64-bit IEEE-754 float BE)
			if (offset + 8 > bytes.length) {
				return { value: 0, nextOffset: bytes.length };
			}
			const num = view.getFloat64(offset, false);
			return { value: num, nextOffset: offset + 8 };
		}

		case 0x01: {
			// Boolean (1 byte)
			if (offset >= bytes.length) {
				return { value: false, nextOffset: bytes.length };
			}
			const bool = view.getUint8(offset++) !== 0;
			return { value: bool, nextOffset: offset };
		}

		case 0x02: {
			// String (16-bit BE length)
			if (offset + 2 > bytes.length) {
				return { value: "", nextOffset: bytes.length };
			}
			const len = view.getUint16(offset, false);
			offset += 2;
			if (offset + len > bytes.length) {
				return { value: "", nextOffset: bytes.length };
			}
			const str = new TextDecoder("utf-8").decode(
				bytes.subarray(offset, offset + len),
			);
			return { value: str, nextOffset: offset + len };
		}

		case 0x03: {
			// Object (key-value pairs terminated by 0x00 0x00 0x09)
			const obj: Record<string, unknown> = {};
			while (offset < bytes.length) {
				if (offset + 2 > bytes.length) break;
				const propLen = view.getUint16(offset, false);
				offset += 2;

				if (
					propLen === 0 &&
					offset < bytes.length &&
					view.getUint8(offset) === 0x09
				) {
					offset++; // consume 0x09
					break;
				}

				if (offset + propLen > bytes.length) break;
				const propName = new TextDecoder("utf-8").decode(
					bytes.subarray(offset, offset + propLen),
				);
				offset += propLen;

				const res = readAmf0Value(bytes, view, offset);
				obj[propName] = res.value;
				offset = res.nextOffset;
			}
			return { value: obj, nextOffset: offset };
		}

		case 0x05: // Null
			return { value: null, nextOffset: offset };

		case 0x06: // Undefined
			return { value: null, nextOffset: offset };

		case 0x08: {
			// ECMA Array (4-byte length + object pairs)
			offset += 4; // skip count
			const obj: Record<string, unknown> = {};
			while (offset < bytes.length) {
				if (offset + 2 > bytes.length) break;
				const propLen = view.getUint16(offset, false);
				offset += 2;

				if (
					propLen === 0 &&
					offset < bytes.length &&
					view.getUint8(offset) === 0x09
				) {
					offset++;
					break;
				}

				if (offset + propLen > bytes.length) break;
				const propName = new TextDecoder("utf-8").decode(
					bytes.subarray(offset, offset + propLen),
				);
				offset += propLen;

				const res = readAmf0Value(bytes, view, offset);
				obj[propName] = res.value;
				offset = res.nextOffset;
			}
			return { value: obj, nextOffset: offset };
		}

		case 0x0a: {
			// Strict Array (4-byte length + values)
			if (offset + 4 > bytes.length) {
				return { value: [], nextOffset: bytes.length };
			}
			const count = view.getUint32(offset, false);
			offset += 4;
			const arr: unknown[] = [];
			for (let i = 0; i < count && offset < bytes.length; i++) {
				const res = readAmf0Value(bytes, view, offset);
				arr.push(res.value);
				offset = res.nextOffset;
			}
			return { value: arr, nextOffset: offset };
		}

		case 0x0b: {
			// Date (8-byte float millis + 2-byte timezone)
			if (offset + 10 > bytes.length) {
				return { value: null, nextOffset: bytes.length };
			}
			const millis = view.getFloat64(offset, false);
			offset += 10;
			return {
				value: new Date(millis).toISOString(),
				nextOffset: offset,
			};
		}

		case 0x0c: {
			// Long String (32-bit length)
			if (offset + 4 > bytes.length) {
				return { value: "", nextOffset: bytes.length };
			}
			const len = view.getUint32(offset, false);
			offset += 4;
			if (offset + len > bytes.length) {
				return { value: "", nextOffset: bytes.length };
			}
			const str = new TextDecoder("utf-8").decode(
				bytes.subarray(offset, offset + len),
			);
			return { value: str, nextOffset: offset + len };
		}

		default:
			// Unknown type, return null and advance
			return { value: null, nextOffset: offset };
	}
}

export function convertSolToJson(
	input: ArrayBuffer,
	pretty = true,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing Flash .sol AMF0 structures...");
	const sol = parseSol(new Uint8Array(input));

	onProgress?.(
		0.7,
		`Formatting ${Object.keys(sol.data).length} saved variables to JSON...`,
	);
	const json = pretty
		? JSON.stringify(sol.data, null, 2)
		: JSON.stringify(sol.data);

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(json).buffer as ArrayBuffer;
}
