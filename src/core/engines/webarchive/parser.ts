/**
 * Apple Safari WebArchive (.webarchive) parser and standalone offline HTML generator.
 * Parses Apple Binary Property List (bplist00), extracts WebMainResource and WebSubresources,
 * and inlines all images, styles, and assets as Data URLs into universal standalone HTML.
 */

export interface WebResource {
	url: string;
	mimeType: string;
	textEncoding?: string;
	data: Uint8Array;
}

export interface WebArchiveContents {
	mainResource: WebResource;
	subresources: WebResource[];
	standaloneHtml: string;
}

/**
 * Parses Apple Binary Property List (bplist00).
 */
export class BplistReader {
	private view: DataView;
	private bytes: Uint8Array;
	private offsetIntSize = 0;
	private objectRefSize = 0;
	private numObjects = 0;
	private topObject = 0;
	private offsetTableOffset = 0;
	private offsets: number[] = [];
	private objectCache = new Map<number, unknown>();

	constructor(bytes: Uint8Array) {
		this.bytes = bytes;
		this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		this.init();
	}

	private init(): void {
		if (this.bytes.length < 32 + 8) {
			throw new Error("Invalid bplist: File too small to contain trailer.");
		}

		const magic = String.fromCharCode(
			this.bytes[0] ?? 0,
			this.bytes[1] ?? 0,
			this.bytes[2] ?? 0,
			this.bytes[3] ?? 0,
			this.bytes[4] ?? 0,
			this.bytes[5] ?? 0,
			this.bytes[6] ?? 0,
			this.bytes[7] ?? 0,
		);

		if (magic !== "bplist00") {
			throw new Error(
				`Invalid bplist: Header signature '${magic}' does not match 'bplist00'.`,
			);
		}

		// Read 32-byte trailer at the end
		const trailerOffset = this.bytes.length - 32;
		this.offsetIntSize = this.bytes[trailerOffset + 6] ?? 0;
		this.objectRefSize = this.bytes[trailerOffset + 7] ?? 0;

		// 8-byte integers in trailer (read high and low 32-bit halves)
		this.numObjects = this.readUint64(trailerOffset + 8);
		this.topObject = this.readUint64(trailerOffset + 16);
		this.offsetTableOffset = this.readUint64(trailerOffset + 24);

		if (this.numObjects <= 0 || this.offsetTableOffset >= trailerOffset) {
			throw new Error("Invalid bplist: Corrupt trailer data.");
		}

		// Read offset table
		this.offsets = [];
		let cur = this.offsetTableOffset;
		for (let i = 0; i < this.numObjects; i++) {
			let off = 0;
			for (let j = 0; j < this.offsetIntSize; j++) {
				off = (off << 8) | (this.bytes[cur + j] ?? 0);
			}
			cur += this.offsetIntSize;
			this.offsets.push(off);
		}
	}

	private readUint64(offset: number): number {
		const high = this.view.getUint32(offset, false);
		const low = this.view.getUint32(offset + 4, false);
		return high * 0x100000000 + low;
	}

	private readRef(offset: number): number {
		let ref = 0;
		for (let i = 0; i < this.objectRefSize; i++) {
			ref = (ref << 8) | (this.bytes[offset + i] ?? 0);
		}
		return ref;
	}

	public parseRoot(): unknown {
		return this.parseObject(this.topObject);
	}

	public parseObject(index: number): unknown {
		if (this.objectCache.has(index)) {
			return this.objectCache.get(index);
		}

		const offset = this.offsets[index];
		if (offset === undefined || offset >= this.bytes.length) {
			return null;
		}

		const marker = this.bytes[offset] ?? 0;
		const objType = marker >> 4;
		const objInfo = marker & 0x0f;

		let result: unknown = null;

		switch (objType) {
			case 0x0: {
				// Simple
				if (objInfo === 0x00) result = null;
				else if (objInfo === 0x08) result = false;
				else if (objInfo === 0x09) result = true;
				break;
			}
			case 0x1: {
				// Integer
				const size = 1 << objInfo;
				let val = 0;
				for (let i = 0; i < size; i++) {
					val = (val << 8) | (this.bytes[offset + 1 + i] ?? 0);
				}
				result = val;
				break;
			}
			case 0x2: {
				// Real / Float
				const size = 1 << objInfo;
				if (size === 4) result = this.view.getFloat32(offset + 1, false);
				else if (size === 8) result = this.view.getFloat64(offset + 1, false);
				break;
			}
			case 0x3: {
				// Date (seconds since Jan 1 2001)
				const seconds = this.view.getFloat64(offset + 1, false);
				result = new Date((seconds + 978307200) * 1000);
				break;
			}
			case 0x4: {
				// Data (binary blob)
				const { length, headerBytes } = this.readCount(offset, objInfo);
				const dataStart = offset + headerBytes;
				result = this.bytes.subarray(dataStart, dataStart + length);
				break;
			}
			case 0x5: {
				// ASCII String
				const { length, headerBytes } = this.readCount(offset, objInfo);
				const strStart = offset + headerBytes;
				const slice = this.bytes.subarray(strStart, strStart + length);
				result = new TextDecoder("ascii").decode(slice);
				break;
			}
			case 0x6: {
				// Unicode String (UTF-16 BE)
				const { length, headerBytes } = this.readCount(offset, objInfo);
				const strStart = offset + headerBytes;
				const slice = this.bytes.subarray(strStart, strStart + length * 2);
				result = new TextDecoder("utf-16be").decode(slice);
				break;
			}
			case 0xa: {
				// Array
				const { length, headerBytes } = this.readCount(offset, objInfo);
				const arr: unknown[] = [];
				this.objectCache.set(index, arr); // Pre-cache to prevent infinite recursion
				let cur = offset + headerBytes;
				for (let i = 0; i < length; i++) {
					const ref = this.readRef(cur);
					cur += this.objectRefSize;
					arr.push(this.parseObject(ref));
				}
				return arr;
			}
			case 0xd: {
				// Dictionary
				const { length, headerBytes } = this.readCount(offset, objInfo);
				const dict: Record<string, unknown> = {};
				this.objectCache.set(index, dict); // Pre-cache
				let keyCur = offset + headerBytes;
				let valCur = keyCur + length * this.objectRefSize;

				const keyRefs: number[] = [];
				for (let i = 0; i < length; i++) {
					keyRefs.push(this.readRef(keyCur));
					keyCur += this.objectRefSize;
				}

				for (let i = 0; i < length; i++) {
					const valRef = this.readRef(valCur);
					valCur += this.objectRefSize;

					const keyObj = this.parseObject(keyRefs[i] ?? 0);
					const valObj = this.parseObject(valRef);
					if (typeof keyObj === "string") {
						dict[keyObj] = valObj;
					}
				}
				return dict;
			}
		}

		this.objectCache.set(index, result);
		return result;
	}

	private readCount(
		offset: number,
		objInfo: number,
	): { length: number; headerBytes: number } {
		if (objInfo < 15) {
			return { length: objInfo, headerBytes: 1 };
		}
		// When objInfo == 15, length is stored in an int object right after marker
		const marker = this.bytes[offset + 1] ?? 0;
		const intInfo = marker & 0x0f;
		const intSize = 1 << intInfo;
		let length = 0;
		for (let i = 0; i < intSize; i++) {
			length = (length << 8) | (this.bytes[offset + 2 + i] ?? 0);
		}
		return { length, headerBytes: 1 + 1 + intSize };
	}
}

/**
 * Converts a Uint8Array buffer into a base64 string without stack overflow on large files.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunkSize = 8192;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

/**
 * Parses a single WebResource dictionary from a WebArchive object tree.
 */
function parseResourceDictionary(dict: unknown): WebResource | null {
	if (!dict || typeof dict !== "object") return null;
	const d = dict as Record<string, unknown>;

	let data: Uint8Array;
	if (d.WebResourceData instanceof Uint8Array) {
		data = d.WebResourceData;
	} else if (typeof d.WebResourceData === "string") {
		data = new TextEncoder().encode(d.WebResourceData);
	} else {
		return null;
	}

	const url = typeof d.WebResourceURL === "string" ? d.WebResourceURL : "";
	const mimeType =
		typeof d.WebResourceMIMEType === "string"
			? d.WebResourceMIMEType
			: "application/octet-stream";
	const textEncoding =
		typeof d.WebResourceTextEncodingName === "string"
			? d.WebResourceTextEncodingName
			: undefined;

	return { url, mimeType, textEncoding, data };
}

/**
 * Parses an Apple Safari .webarchive file and produces self-contained offline HTML.
 */
export function parseWebArchive(fileBytes: Uint8Array): WebArchiveContents {
	const reader = new BplistReader(fileBytes);
	const root = reader.parseRoot();

	if (!root || typeof root !== "object") {
		throw new Error(
			"Invalid .webarchive file: Root property list is not a dictionary.",
		);
	}

	const rootDict = root as Record<string, unknown>;
	const mainResource = parseResourceDictionary(rootDict.WebMainResource);

	if (!mainResource) {
		throw new Error(
			"Invalid .webarchive file: Missing or invalid WebMainResource entry.",
		);
	}

	const subresources: WebResource[] = [];
	if (Array.isArray(rootDict.WebSubresources)) {
		for (const sub of rootDict.WebSubresources) {
			const res = parseResourceDictionary(sub);
			if (res) subresources.push(res);
		}
	}

	// Decode HTML body of the main resource
	let html = "";
	const encoding = (mainResource.textEncoding || "utf-8").toLowerCase();
	try {
		html = new TextDecoder(encoding).decode(mainResource.data);
	} catch {
		html = new TextDecoder("utf-8").decode(mainResource.data);
	}

	// Map subresources to Data URLs
	const resourceDataUrls = new Map<string, string>();
	for (const sub of subresources) {
		const base64 = uint8ArrayToBase64(sub.data);
		const dataUrl = `data:${sub.mimeType};base64,${base64}`;
		if (sub.url) {
			resourceDataUrls.set(sub.url, dataUrl);
			// Also store relative path if URL is absolute
			try {
				const parsed = new URL(sub.url);
				resourceDataUrls.set(parsed.pathname, dataUrl);
				const lastSlash = parsed.pathname.lastIndexOf("/");
				if (lastSlash !== -1) {
					resourceDataUrls.set(parsed.pathname.slice(lastSlash + 1), dataUrl);
				}
			} catch {
				// Not a full URL, skip URL parsing
			}
		}
	}

	// In the HTML, replace matched URLs with data URLs
	for (const [targetUrl, dataUrl] of resourceDataUrls.entries()) {
		if (!targetUrl || targetUrl.length < 3) continue;
		// Replace inside quotes (e.g. href="...", src='...', url(...))
		html = html.split(`"${targetUrl}"`).join(`"${dataUrl}"`);
		html = html.split(`'${targetUrl}'`).join(`'${dataUrl}'`);
		html = html.split(`(${targetUrl})`).join(`(${dataUrl})`);
	}

	// Ensure meta charset exists
	if (
		!html.includes("<meta charset") &&
		!html.includes('content="text/html; charset=')
	) {
		html = html.replace("<head>", '<head>\n  <meta charset="utf-8">');
	}

	return {
		mainResource,
		subresources,
		standaloneHtml: html,
	};
}

/**
 * Converts an Apple Safari .webarchive file into a standalone HTML ArrayBuffer.
 */
export function convertWebArchiveToHtml(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "PARSING_WEBARCHIVE");
	const result = parseWebArchive(new Uint8Array(input));

	onProgress?.(0.7, "INLINING_RESOURCES");
	const encoder = new TextEncoder();
	const encoded = encoder.encode(result.standaloneHtml);

	onProgress?.(1.0, "DONE");
	return encoded.buffer as ArrayBuffer;
}
