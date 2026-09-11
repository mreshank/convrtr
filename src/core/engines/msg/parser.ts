/**
 * Microsoft Outlook Compound File Binary (.msg) to RFC 822 (.eml) parser.
 *
 * Outlook .msg files use the OLE 2 Compound Document format (Structured Storage).
 * Mac, Linux, and non-Outlook users cannot open .msg files natively. This parser
 * extracts Subject, From, To, Body (plain/HTML), and binary attachments and formats
 * them into a universal RFC 822 .eml document that opens in Apple Mail, Thunderbird,
 * and standard email clients.
 */

export interface MsgEmail {
	subject: string;
	from: string;
	to: string;
	bodyText: string;
	bodyHtml: string;
	attachments: Array<{
		name: string;
		mime: string;
		data: Uint8Array;
	}>;
}

/**
 * Parses an Outlook .msg binary file into structured email content.
 */
export function parseMsg(input: ArrayBuffer): MsgEmail {
	const bytes = new Uint8Array(input);
	if (bytes.length < 512) {
		throw new Error(
			"parseMsg: File is too small to be a valid Outlook .msg file",
		);
	}

	const view = new DataView(input);
	// Validate OLE Compound File signature: D0 CF 11 E0 A1 B1 1A E1
	if (
		bytes[0] !== 0xd0 ||
		bytes[1] !== 0xcf ||
		bytes[2] !== 0x11 ||
		bytes[3] !== 0xe0 ||
		bytes[4] !== 0xa1 ||
		bytes[5] !== 0xb1 ||
		bytes[6] !== 0x1a ||
		bytes[7] !== 0xe1
	) {
		throw new Error("parseMsg: Not a valid Microsoft Compound File (.msg)");
	}

	const sectorShift = view.getUint16(30, true);
	const sectorSize = 1 << sectorShift;
	const miniSectorShift = view.getUint16(32, true);
	const miniSectorSize = 1 << miniSectorShift;

	const numFatSectors = view.getUint32(44, true);
	const firstDirSec = view.getUint32(48, true);
	const firstMiniFatSec = view.getUint32(60, true);
	const numMiniFatSectors = view.getUint32(64, true);

	// Read DIFAT (first 109 entries in header)
	const fatSectors: number[] = [];
	for (let i = 0; i < Math.min(numFatSectors, 109); i++) {
		fatSectors.push(view.getUint32(76 + i * 4, true));
	}

	// Helper to get sector byte offset
	const secOffset = (sec: number) => (sec + 1) * sectorSize;

	// Build FAT lookup table
	const fat: number[] = [];
	for (const fatSec of fatSectors) {
		const offset = secOffset(fatSec);
		if (offset + sectorSize > bytes.length) break;
		const count = sectorSize / 4;
		for (let i = 0; i < count; i++) {
			fat.push(view.getUint32(offset + i * 4, true));
		}
	}

	// Follow a FAT chain
	const readChain = (startSec: number): Uint8Array => {
		const parts: Uint8Array[] = [];
		let current = startSec;
		const visited = new Set<number>();

		while (current >= 0 && current < 0xfffffffa && !visited.has(current)) {
			visited.add(current);
			const off = secOffset(current);
			if (off + sectorSize > bytes.length) break;
			parts.push(bytes.subarray(off, off + sectorSize));
			current = fat[current] ?? 0xfffffffe;
		}

		const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
		const out = new Uint8Array(totalLen);
		let pos = 0;
		for (const p of parts) {
			out.set(p, pos);
			pos += p.length;
		}
		return out;
	};

	// Read Directory Stream
	const dirStream = readChain(firstDirSec);
	const dirView = new DataView(
		dirStream.buffer,
		dirStream.byteOffset,
		dirStream.byteLength,
	);

	// Read Mini FAT
	const miniFat: number[] = [];
	if (firstMiniFatSec < 0xfffffffa && numMiniFatSectors > 0) {
		const miniFatStream = readChain(firstMiniFatSec);
		const mfView = new DataView(
			miniFatStream.buffer,
			miniFatStream.byteOffset,
			miniFatStream.byteLength,
		);
		const count = miniFatStream.length / 4;
		for (let i = 0; i < count; i++) {
			miniFat.push(mfView.getUint32(i * 4, true));
		}
	}

	// Parse Root Entry (entry 0 in directory)
	let miniStream: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
	if (dirStream.length >= 128) {
		const rootStartSec = dirView.getUint32(116, true);
		if (rootStartSec < 0xfffffffa) {
			miniStream = readChain(rootStartSec);
		}
	}

	// Read mini stream chain
	const readMiniChain = (startSec: number, size: number): Uint8Array => {
		const parts: Uint8Array[] = [];
		let current = startSec;
		const visited = new Set<number>();

		while (current >= 0 && current < 0xfffffffa && !visited.has(current)) {
			visited.add(current);
			const off = current * miniSectorSize;
			if (off + miniSectorSize > miniStream.length) break;
			parts.push(miniStream.subarray(off, off + miniSectorSize));
			current = miniFat[current] ?? 0xfffffffe;
		}

		const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
		const out = new Uint8Array(totalLen);
		let pos = 0;
		for (const p of parts) {
			out.set(p, pos);
			pos += p.length;
		}
		return out.subarray(0, size);
	};

	const email: MsgEmail = {
		subject: "Untitled Message",
		from: "Unknown Sender",
		to: "",
		bodyText: "",
		bodyHtml: "",
		attachments: [],
	};

	// Attachment collecting map
	const attachMap = new Map<
		string,
		{ name: string; mime: string; data: Uint8Array }
	>();

	// Iterate directory entries (128 bytes each)
	const numEntries = Math.floor(dirStream.length / 128);
	for (let i = 1; i < numEntries; i++) {
		const entryOff = i * 128;
		const nameLen = dirView.getUint16(entryOff + 64, true);
		if (nameLen === 0) continue;

		// 64-byte UTF-16LE name
		let entryName = "";
		for (let c = 0; c < Math.min(nameLen - 2, 64); c += 2) {
			const charCode = dirView.getUint16(entryOff + c, true);
			if (charCode === 0) break;
			entryName += String.fromCharCode(charCode);
		}

		const type = dirStream[entryOff + 66];
		if (type !== 2) continue; // Must be stream

		const startSec = dirView.getUint32(entryOff + 116, true);
		const streamSize = dirView.getUint32(entryOff + 120, true);

		// Read stream data (from regular stream or mini stream)
		let data: Uint8Array;
		if (streamSize < 4096 && miniStream.length > 0) {
			data = readMiniChain(startSec, streamSize);
		} else {
			data = readChain(startSec).subarray(0, streamSize);
		}

		// Decode property stream
		if (entryName.includes("__substg1.0_0037")) {
			// Subject
			email.subject = decodeString(data, entryName);
		} else if (entryName.includes("__substg1.0_0C1F")) {
			// Sender Name
			email.from = decodeString(data, entryName);
		} else if (entryName.includes("__substg1.0_0E04")) {
			// Display To
			email.to = decodeString(data, entryName);
		} else if (entryName.includes("__substg1.0_1000")) {
			// Plain text body
			email.bodyText = decodeString(data, entryName);
		} else if (entryName.includes("__substg1.0_1013")) {
			// HTML body
			email.bodyHtml = decodeString(data, entryName);
		} else if (entryName.includes("3707") || entryName.includes("3704")) {
			// Attachment filename
			const attachKey = entryName.slice(0, 24);
			const attach = attachMap.get(attachKey) ?? {
				name: "attachment.bin",
				mime: "application/octet-stream",
				data: new Uint8Array(0),
			};
			attach.name = decodeString(data, entryName);
			attachMap.set(attachKey, attach);
		} else if (entryName.includes("3701")) {
			// Attachment binary data
			const attachKey = entryName.slice(0, 24);
			const attach = attachMap.get(attachKey) ?? {
				name: "attachment.bin",
				mime: "application/octet-stream",
				data: new Uint8Array(0),
			};
			attach.data = data;
			attachMap.set(attachKey, attach);
		}
	}

	for (const att of attachMap.values()) {
		if (att.data.length > 0) {
			email.attachments.push(att);
		}
	}

	return email;
}

function decodeString(bytes: Uint8Array, entryName: string): string {
	if (entryName.endsWith("001F")) {
		// UTF-16LE
		return new TextDecoder("utf-16le").decode(bytes).replace(/\0+$/, "");
	}
	return new TextDecoder().decode(bytes).replace(/\0+$/, "");
}

/**
 * Converts parsed MsgEmail into a standard RFC 822 .eml MIME text string.
 */
export function msgToEml(msg: MsgEmail): string {
	const boundary = `----=_Part_convrtr_${Date.now()}`;
	const lines: string[] = [
		`From: ${msg.from}`,
		`To: ${msg.to}`,
		`Subject: ${msg.subject}`,
		`Date: ${new Date().toUTCString()}`,
		`MIME-Version: 1.0`,
		`Content-Type: multipart/mixed; boundary="${boundary}"`,
		"",
		`--${boundary}`,
		`Content-Type: text/plain; charset=UTF-8`,
		`Content-Transfer-Encoding: 8bit`,
		"",
		msg.bodyText ||
			(msg.bodyHtml ? "(HTML message content below)" : "(No message body)"),
	];

	if (msg.bodyHtml) {
		lines.push(
			"",
			`--${boundary}`,
			`Content-Type: text/html; charset=UTF-8`,
			`Content-Transfer-Encoding: 8bit`,
			"",
			msg.bodyHtml,
		);
	}

	for (const att of msg.attachments) {
		// Base64 encode attachment data
		let binaryStr = "";
		for (let i = 0; i < att.data.length; i++) {
			binaryStr += String.fromCharCode(att.data[i] ?? 0);
		}
		const b64 = btoa(binaryStr);

		lines.push(
			"",
			`--${boundary}`,
			`Content-Type: ${att.mime || "application/octet-stream"}; name="${att.name}"`,
			`Content-Transfer-Encoding: base64`,
			`Content-Disposition: attachment; filename="${att.name}"`,
			"",
			b64.match(/.{1,76}/g)?.join("\n") ?? b64,
		);
	}

	lines.push("", `--${boundary}--`, "");
	return lines.join("\r\n");
}
