import type {
	VttConversionOptions,
	VttConversionResult,
	VttCue,
} from "./types";

/**
 * Converts a WebVTT timestamp (MM:SS.mmm or HH:MM:SS.mmm) into standard SRT (HH:MM:SS,mmm).
 */
export function formatSrtTimestamp(raw: string): string {
	const trimmed = raw.trim();
	const parts = trimmed.split(":");
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

	return `${hours}:${minutes}:${seconds},${ms}`;
}

/**
 * Parses seconds from a WebVTT timestamp.
 */
function parseTimestampSeconds(raw: string): number {
	const parts = raw.trim().split(":");
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
 * Cleans WebVTT inline markup tags while preserving standard SRT tags (<b>, <i>, <u>).
 */
function cleanVttText(
	text: string,
	options: VttConversionOptions = {},
): string {
	let out = text;

	// 1. Handle voice tags: <v Bob> or <v.loud Bob>
	if (options.preserveVoiceAsPrefix) {
		out = out.replace(
			/<v(?:\.[^>]+)?\s+([^>]+)>([\s\S]*?)(?:<\/v>|$)/gi,
			"$1: $2",
		);
	} else {
		out = out.replace(/<v(?:\.[^>]+)?(?:\s+[^>]+)?>/gi, "");
		out = out.replace(/<\/v>/gi, "");
	}

	if (options.cleanTags !== false) {
		// Strip inline timestamp tags: <00:19.000> or <00:00:19.000>
		out = out.replace(/<\d{2}:(?:\d{2}:)?\d{2}\.\d{3}>/gi, "");

		// Strip class tags: <c.yellow> or <c> and </c>
		out = out.replace(/<c(?:\.[^>]+)?>/gi, "");
		out = out.replace(/<\/c>/gi, "");

		// Strip ruby and lang tags
		out = out.replace(/<\/?(?:ruby|rt|lang)(?:\s+[^>]+)?>/gi, "");
	}

	return out.trim();
}

/**
 * Parses a WebVTT file string and returns structured cues.
 */
export function parseVtt(
	input: string | Uint8Array | ArrayBuffer,
	options: VttConversionOptions = {},
): VttCue[] {
	const text =
		typeof input === "string"
			? input
			: new TextDecoder("utf-8").decode(
					input instanceof Uint8Array ? input : new Uint8Array(input),
				);

	// Normalize line endings
	const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

	// Verify WEBVTT header
	let headerFound = false;
	let startIdx = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = (lines[i] ?? "").trim();
		if (line.startsWith("WEBVTT")) {
			headerFound = true;
			startIdx = i + 1;
			break;
		}
		if (line && !line.startsWith("\uFEFF")) {
			// Non-empty line before WEBVTT
			break;
		}
	}

	if (!headerFound) {
		throw new Error(
			"Invalid WebVTT file: Missing 'WEBVTT' signature in file header.",
		);
	}

	const cues: VttCue[] = [];
	let i = startIdx;

	while (i < lines.length) {
		const line = (lines[i] ?? "").trim();

		// Skip empty lines
		if (!line) {
			i++;
			continue;
		}

		// Skip NOTE (comments), STYLE, REGION blocks until empty line
		if (
			line.startsWith("NOTE") ||
			line.startsWith("STYLE") ||
			line.startsWith("REGION")
		) {
			while (i < lines.length && (lines[i] ?? "").trim() !== "") {
				i++;
			}
			continue;
		}

		// Check if current line is an identifier or a timing line
		let cueId: string | undefined;
		let timingLine = line;

		if (!timingLine.includes("-->")) {
			// Might be an optional cue ID
			cueId = timingLine;
			i++;
			timingLine = (lines[i] ?? "").trim();
		}

		// Timing line format: "00:01.000 --> 00:04.000 align:start"
		const arrowIdx = timingLine.indexOf("-->");
		if (arrowIdx === -1) {
			// Malformed or unknown block, skip
			i++;
			continue;
		}

		const startRaw = timingLine.substring(0, arrowIdx).trim();
		const afterArrow = timingLine.substring(arrowIdx + 3).trim();

		// Separate end timestamp from cue settings (space delimited)
		const spaceIdx = afterArrow.search(/\s+/);
		const endRaw =
			spaceIdx >= 0 ? afterArrow.substring(0, spaceIdx).trim() : afterArrow;
		const settings =
			spaceIdx >= 0 ? afterArrow.substring(spaceIdx).trim() : undefined;

		// Read cue payload lines until blank line
		i++;
		const textLines: string[] = [];
		while (i < lines.length && (lines[i] ?? "").trim() !== "") {
			textLines.push(lines[i] ?? "");
			i++;
		}

		const rawText = textLines.join("\n");
		const cleanedText = cleanVttText(rawText, options);

		if (cleanedText) {
			cues.push({
				id: cueId,
				startTime: parseTimestampSeconds(startRaw),
				endTime: parseTimestampSeconds(endRaw),
				startRaw,
				endRaw,
				settings,
				text: cleanedText,
			});
		}
	}

	return cues;
}

/**
 * Converts WebVTT input into standard SubRip (.srt) subtitle text.
 */
export function convertVttToSrt(
	input: string | Uint8Array | ArrayBuffer,
	options: VttConversionOptions = {},
): VttConversionResult {
	const cues = parseVtt(input, options);
	const srtBlocks: string[] = [];

	for (let idx = 0; idx < cues.length; idx++) {
		const cue = cues[idx];
		if (!cue) continue;

		const startSrt = formatSrtTimestamp(cue.startRaw);
		const endSrt = formatSrtTimestamp(cue.endRaw);
		const num = idx + 1;

		srtBlocks.push(`${num}\n${startSrt} --> ${endSrt}\n${cue.text}`);
	}

	const srtText = `${srtBlocks.join("\n\n")}\n`;

	return {
		srtText,
		cueCount: cues.length,
	};
}
