export interface AssCue {
	layer: number;
	startMs: number;
	endMs: number;
	style: string;
	actor: string;
	text: string;
}

export interface AssParseResult {
	scriptType: string;
	title?: string;
	cueCount: number;
	srtContent: string;
}

/**
 * Formats milliseconds into SubRip timestamp: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(ms: number): string {
	const roundedMs = Math.round(Math.max(0, ms));
	const hours = Math.floor(roundedMs / 3600000);
	const minutes = Math.floor((roundedMs % 3600000) / 60000);
	const seconds = Math.floor((roundedMs % 60000) / 1000);
	const millis = roundedMs % 1000;

	const pad2 = (n: number) => n.toString().padStart(2, "0");
	const pad3 = (n: number) => n.toString().padStart(3, "0");

	return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(millis)}`;
}

/**
 * Parses an ASS timestamp "H:MM:SS.cc" into total milliseconds.
 */
export function parseAssTimestamp(timestampStr: string): number {
	const trimmed = timestampStr.trim();
	const parts = trimmed.split(":");
	if (parts.length < 3) return 0;

	const hours = Number.parseInt(parts[0] ?? "0", 10);
	const minutes = Number.parseInt(parts[1] ?? "0", 10);
	const secParts = (parts[2] ?? "0").split(".");
	const seconds = Number.parseInt(secParts[0] ?? "0", 10);
	const centisStr = (secParts[1] ?? "0").padEnd(3, "0").slice(0, 3);
	const millis = Number.parseInt(centisStr, 10);

	return (hours * 3600 + minutes * 60 + seconds) * 1000 + millis;
}

/**
 * Cleans ASS/SSA override tags and translates formatting into standard SRT tags.
 * Strips vector drawings ({\p1}...{\p0}), karaoke ({\k...}), positioning, and transitions.
 */
export function cleanAssText(rawText: string): string {
	let text = rawText;

	// 1. Remove vector drawing modes {\p1}...{\p0}
	text = text.replace(/\{[^}]*\\p[1-9][^}]*\}.*?(\{[^}]*\\p0[^}]*\}|$)/gi, "");

	// 2. Normalize linebreaks: \N, \n, and \h (hard space)
	text = text.replace(/\\N/g, "\n");
	text = text.replace(/\\n/g, "\n");
	text = text.replace(/\\h/g, " ");

	// 3. Translate common style tags: {\i1} -> <i>, {\i0} -> </i>, etc.
	text = text.replace(/\{[^}]*\\i1[^}]*\}/gi, "<i>");
	text = text.replace(/\{[^}]*\\i0[^}]*\}/gi, "</i>");
	text = text.replace(/\{[^}]*\\b1[^}]*\}/gi, "<b>");
	text = text.replace(/\{[^}]*\\b0[^}]*\}/gi, "</b>");
	text = text.replace(/\{[^}]*\\u1[^}]*\}/gi, "<u>");
	text = text.replace(/\{[^}]*\\u0[^}]*\}/gi, "</u>");
	text = text.replace(/\{[^}]*\\s1[^}]*\}/gi, "<s>");
	text = text.replace(/\{[^}]*\\s0[^}]*\}/gi, "</s>");

	// 4. Strip all remaining ASS curly brace tags (e.g. {\pos}, {\fad}, {\c&H...}, {\an}, {\k})
	text = text.replace(/\{[^}]*\}/g, "");

	// 5. Clean up extra whitespace and empty tag pairs
	text = text.replace(/<i>\s*<\/i>/gi, "");
	text = text.replace(/<b>\s*<\/b>/gi, "");
	text = text.replace(/<u>\s*<\/u>/gi, "");
	text = text.replace(/<s>\s*<\/s>/gi, "");

	return text.trim();
}

/**
 * Decodes raw bytes detecting UTF-8, UTF-16 LE/BE, or Windows-1252.
 */
function decodeAssBytes(bytes: Uint8Array): string {
	if (bytes.length >= 2) {
		if (bytes[0] === 0xff && bytes[1] === 0xfe) {
			return new TextDecoder("utf-16le").decode(bytes.subarray(2));
		}
		if (bytes[0] === 0xfe && bytes[1] === 0xff) {
			return new TextDecoder("utf-16be").decode(bytes.subarray(2));
		}
	}
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xef &&
		bytes[1] === 0xbb &&
		bytes[2] === 0xbf
	) {
		return new TextDecoder("utf-8").decode(bytes.subarray(3));
	}

	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return new TextDecoder("windows-1252").decode(bytes);
	}
}

/**
 * Parses an Advanced SubStation Alpha (.ass / .ssa) subtitle file and converts it into SubRip (.srt).
 */
export function parseAss(fileBytes: Uint8Array): AssParseResult {
	const raw = decodeAssBytes(fileBytes);
	const lines = raw.split(/\r?\n/);

	let scriptType = "v4.00+";
	let title: string | undefined;
	let currentSection = "";
	let eventFormatFields: string[] = [
		"Layer",
		"Start",
		"End",
		"Style",
		"Name",
		"MarginL",
		"MarginR",
		"MarginV",
		"Effect",
		"Text",
	];

	const cues: AssCue[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(";")) continue;

		// Section header: [Script Info], [V4+ Styles], [Events]
		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			currentSection = trimmed.slice(1, -1).trim().toLowerCase();
			continue;
		}

		if (currentSection === "script info") {
			const colonIndex = trimmed.indexOf(":");
			if (colonIndex !== -1) {
				const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
				const val = trimmed.slice(colonIndex + 1).trim();
				if (key === "title") title = val;
				if (key === "scripttype") scriptType = val;
			}
			continue;
		}

		if (currentSection === "events") {
			if (trimmed.toLowerCase().startsWith("format:")) {
				const formatStr = trimmed.slice(7).trim();
				eventFormatFields = formatStr
					.split(",")
					.map((f) => f.trim().toLowerCase());
				continue;
			}

			if (trimmed.toLowerCase().startsWith("dialogue:")) {
				const dialogueStr = trimmed.slice(9).trim();
				const parts: string[] = [];
				let remaining = dialogueStr;

				// Split up to formatFields.length - 1 commas; the rest is 'Text'
				const numPrefixFields = eventFormatFields.length - 1;
				for (let i = 0; i < numPrefixFields; i++) {
					const commaIdx = remaining.indexOf(",");
					if (commaIdx === -1) {
						parts.push(remaining.trim());
						remaining = "";
						break;
					}
					parts.push(remaining.slice(0, commaIdx).trim());
					remaining = remaining.slice(commaIdx + 1);
				}
				// The remainder is the Text field
				parts.push(remaining);

				const getField = (name: string): string => {
					const idx = eventFormatFields.indexOf(name.toLowerCase());
					return idx !== -1 ? (parts[idx] ?? "") : "";
				};

				const startStr = getField("start");
				const endStr = getField("end");
				const rawText = getField("text");
				const style = getField("style");
				const actor = getField("name");
				const layerStr = getField("layer");

				const startMs = parseAssTimestamp(startStr);
				const endMs = parseAssTimestamp(endStr);
				const cleanedText = cleanAssText(rawText);

				if (cleanedText.length > 0 && endMs > startMs) {
					cues.push({
						layer: Number.parseInt(layerStr || "0", 10),
						startMs,
						endMs,
						style,
						actor,
						text: cleanedText,
					});
				}
			}
		}
	}

	if (cues.length === 0) {
		throw new Error(
			"No valid dialogue lines found in ASS/SSA subtitle file. Ensure the file contains an [Events] section with Dialogue entries.",
		);
	}

	// Sort chronologically by start timestamp
	cues.sort((a, b) => a.startMs - b.startMs);

	const srtBlocks: string[] = [];
	let index = 1;

	for (const cue of cues) {
		const startFormatted = formatSrtTimestamp(cue.startMs);
		const endFormatted = formatSrtTimestamp(cue.endMs);

		srtBlocks.push(
			`${index}\n${startFormatted} --> ${endFormatted}\n${cue.text}`,
		);
		index++;
	}

	const srtContent = `${srtBlocks.join("\n\n")}\n`;

	return {
		scriptType,
		title,
		cueCount: cues.length,
		srtContent,
	};
}

/**
 * Main conversion entry point for ASS/SSA to SubRip (.srt) conversion.
 */
export function convertAssToSrt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading ASS/SSA sections & dialogue events...");
	const bytes = new Uint8Array(input);
	const parsed = parseAss(bytes);

	onProgress?.(
		0.6,
		`Parsed ${parsed.cueCount} dialogue cues and cleaned override tags...`,
	);
	onProgress?.(0.9, "Generating SubRip (.srt) timestamp formatting...");

	onProgress?.(1.0, "Complete");
	const encoded = new TextEncoder().encode(parsed.srtContent);
	return encoded.buffer.slice(
		encoded.byteOffset,
		encoded.byteOffset + encoded.byteLength,
	) as ArrayBuffer;
}
