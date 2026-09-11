import type { SrtConversionResult, SrtCue, SrtToVttOptions } from "./types";

/**
 * Converts an SRT timestamp (HH:MM:SS,mmm) to WebVTT timestamp (HH:MM:SS.mmm).
 */
export function formatVttTimestamp(raw: string): string {
	const trimmed = raw.trim();
	// Replace comma with period
	const dotNormalized = trimmed.replace(",", ".");
	const parts = dotNormalized.split(":");

	let hours = "00";
	let minutes = "00";
	let secondsAndMs = "00.000";

	if (parts.length === 3) {
		hours = (parts[0] ?? "00").padStart(2, "0");
		minutes = (parts[1] ?? "00").padStart(2, "0");
		secondsAndMs = parts[2] ?? "00.000";
	} else if (parts.length === 2) {
		hours = "00";
		minutes = (parts[0] ?? "00").padStart(2, "0");
		secondsAndMs = parts[1] ?? "00.000";
	}

	const secParts = secondsAndMs.split(".");
	const seconds = (secParts[0] ?? "00").padStart(2, "0");
	const ms = (secParts[1] ?? "000").padEnd(3, "0").slice(0, 3);

	return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Parses seconds from an SRT timestamp.
 */
function parseTimestampSeconds(raw: string): number {
	const normalized = raw.trim().replace(",", ".");
	const parts = normalized.split(":");
	if (parts.length === 3) {
		const h = Number(parts[0] ?? 0);
		const m = Number(parts[1] ?? 0);
		const s = Number(parts[2] ?? 0);
		return h * 3600 + m * 60 + s;
	}
	if (parts.length === 2) {
		const m = Number(parts[0] ?? 0);
		const s = Number(parts[1] ?? 0);
		return m * 60 + s;
	}
	return 0;
}

/**
 * Cleans obsolete font tags or styling if requested.
 */
function cleanSrtText(text: string, options: SrtToVttOptions = {}): string {
	let out = text;

	if (options.cleanFontTags !== false) {
		// Strip <font color="..."> and </font>
		out = out.replace(/<\/?font(?:\s+[^>]+)?>/gi, "");
	}

	return out.trim();
}

/**
 * Parses SRT content into structured cues.
 */
export function parseSrt(
	input: string | Uint8Array | ArrayBuffer,
	options: SrtToVttOptions = {},
): SrtCue[] {
	const text =
		typeof input === "string"
			? input
			: new TextDecoder("utf-8").decode(
					input instanceof Uint8Array ? input : new Uint8Array(input),
				);

	// Strip UTF-8 BOM if present
	const cleanInput = text.startsWith("\uFEFF") ? text.slice(1) : text;
	const lines = cleanInput
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n");

	const cues: SrtCue[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = (lines[i] ?? "").trim();

		// Skip empty lines
		if (!line) {
			i++;
			continue;
		}

		let cueId: string | undefined;
		let timingLine = line;

		// Check if current line is an index number (or identifier) rather than timing
		if (!timingLine.includes("-->")) {
			cueId = timingLine;
			i++;
			if (i >= lines.length) break;
			timingLine = (lines[i] ?? "").trim();
		}

		// Must have arrow "-->"
		const arrowIdx = timingLine.indexOf("-->");
		if (arrowIdx === -1) {
			// Skip unrecognized line
			i++;
			continue;
		}

		const startRaw = timingLine.substring(0, arrowIdx).trim();
		const endRaw = timingLine.substring(arrowIdx + 3).trim();

		// Collect text lines until blank line or EOF
		i++;
		const textLines: string[] = [];
		while (i < lines.length && (lines[i] ?? "").trim() !== "") {
			textLines.push(lines[i] ?? "");
			i++;
		}

		const rawText = textLines.join("\n");
		const cleanedText = cleanSrtText(rawText, options);

		if (cleanedText) {
			cues.push({
				id: cueId,
				startTime: parseTimestampSeconds(startRaw),
				endTime: parseTimestampSeconds(endRaw),
				startRaw,
				endRaw,
				text: cleanedText,
			});
		}
	}

	return cues;
}

/**
 * Converts SubRip (.srt) input into standard WebVTT (.vtt) format.
 */
export function convertSrtToVtt(
	input: string | Uint8Array | ArrayBuffer,
	options: SrtToVttOptions = {},
	onProgress?: (ratio: number, phase: string) => void,
): SrtConversionResult {
	onProgress?.(0.1, "READ");
	const cues = parseSrt(input, options);

	if (cues.length === 0) {
		throw new Error(
			"No valid SubRip (.srt) subtitle cues found in input file.",
		);
	}

	onProgress?.(0.4, "TRANSFORM");

	const blocks: string[] = [];
	blocks.push("WEBVTT");

	if (options.includeNoteHeader !== false) {
		blocks.push("NOTE Converted by convrtr (100% Client-Side Subtitle Engine)");
	}

	for (let idx = 0; idx < cues.length; idx++) {
		const cue = cues[idx];
		if (!cue) continue;

		const startVtt = formatVttTimestamp(cue.startRaw);
		const endVtt = formatVttTimestamp(cue.endRaw);

		// Include cue identifier
		const cueId = cue.id ? `${cue.id}\n` : "";
		blocks.push(`${cueId}${startVtt} --> ${endVtt}\n${cue.text}`);

		if (idx % 50 === 0) {
			onProgress?.(0.4 + (idx / cues.length) * 0.5, "TRANSFORM");
		}
	}

	onProgress?.(0.95, "SYNTHESIZE");
	const vttText = `${blocks.join("\n\n")}\n`;
	onProgress?.(1.0, "COMPLETE");

	return {
		vttText,
		cueCount: cues.length,
	};
}
