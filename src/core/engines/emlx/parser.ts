export interface EmlxExtractionResult {
	emlBytes: Uint8Array;
	hasPlistTrailer: boolean;
}

/**
 * Extracts the RFC 822 message from an Apple Mail (.emlx) file.
 *
 * Layout (community-documented, stable for 20 years): the first line is the
 * decimal byte count of the message, followed by exactly that many bytes of
 * raw email, followed by an XML plist of Mail.app metadata (flags, colours).
 * The message bytes transfer bit-exact into a `.eml` that Thunderbird,
 * Outlook and archival tools open natively; the plist trailer is Mail.app
 * state, not message content, and is reported rather than converted.
 */
export function parseEmlx(fileBytes: Uint8Array): EmlxExtractionResult {
	const nl = fileBytes.indexOf(0x0a);
	if (nl === -1 || nl > 24) {
		throw new Error(
			"Invalid Apple Mail file: missing the leading message-length line (`<bytes>\\n` + RFC 822 message + plist).",
		);
	}
	const lenText = new TextDecoder("ascii")
		.decode(fileBytes.subarray(0, nl))
		.trim();
	if (!/^\d+$/.test(lenText)) {
		throw new Error(
			"Invalid Apple Mail file: first line is not a decimal message length.",
		);
	}
	const length = Number(lenText);
	const start = nl + 1;
	const end = start + length;
	if (end > fileBytes.length) {
		throw new Error(
			`Truncated Apple Mail file: header claims ${length} message bytes but only ${fileBytes.length - start} remain.`,
		);
	}
	const emlBytes = fileBytes.slice(start, end);
	const trailer = fileBytes.subarray(end);
	return {
		emlBytes,
		hasPlistTrailer:
			trailer.length > 0 &&
			new TextDecoder("ascii")
				.decode(trailer.subarray(0, 100))
				.includes("plist"),
	};
}

export function convertEmlxToEml(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading Apple Mail envelope...");
	const result = parseEmlx(new Uint8Array(input));
	onProgress?.(0.7, "Extracting RFC 822 message...");
	onProgress?.(1.0, "Complete");
	const buf = result.emlBytes.buffer.slice(
		result.emlBytes.byteOffset,
		result.emlBytes.byteOffset + result.emlBytes.byteLength,
	);
	return buf as ArrayBuffer;
}
