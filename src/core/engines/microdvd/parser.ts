export interface MicroDvdSubtitleCue {
	index: number;
	startFrame: number;
	endFrame: number;
	startTimeMs: number;
	endTimeMs: number;
	text: string;
}

export interface MicroDvdParseResult {
	fps: number;
	cueCount: number;
	srtContent: string;
}

/**
 * Formats a duration in milliseconds into SubRip timecode: HH:MM:SS,mmm
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
 * Cleans MicroDVD control tags and converts formatting to SubRip tags.
 * Replaces '|' with newlines, '{Y:i}' with '<i>', etc.
 */
export function cleanMicroDvdText(raw: string): string {
	let text = raw.replace(/\r/g, "").trim();

	// Convert pipe separator to newline
	text = text.replace(/\|/g, "\n");

	// Handle italics
	const hasItalics = /\{[Yy]:[Ii]\}/i.test(text);
	// Handle bold
	const hasBold = /\{[Yy]:[Bb]\}/i.test(text);
	// Handle underline
	const hasUnderline = /\{[Yy]:[Uu]\}/i.test(text);

	// Strip all MicroDVD bracket tags: {Y:...}, {C:...}, {S:...}, {P:...}, {o:...}, etc.
	text = text.replace(/\{[^}]+\}/g, "").trim();

	if (hasItalics && !text.startsWith("<i>")) {
		text = `<i>${text}</i>`;
	}
	if (hasBold && !text.startsWith("<b>")) {
		text = `<b>${text}</b>`;
	}
	if (hasUnderline && !text.startsWith("<u>")) {
		text = `<u>${text}</u>`;
	}

	return text;
}

/**
 * Decodes text bytes with UTF-8 or Windows-1252 fallback.
 */
function decodeTextBytes(bytes: Uint8Array): string {
	try {
		const decoder = new TextDecoder("utf-8", { fatal: true });
		return decoder.decode(bytes);
	} catch {
		// Fallback to latin1 / windows-1252
		const decoder = new TextDecoder("windows-1252");
		return decoder.decode(bytes);
	}
}

/**
 * Parses a MicroDVD (.sub) subtitle file and converts frame timings into SubRip (.srt).
 */
export function parseMicroDvd(
	fileBytes: Uint8Array,
	fallbackFps = 23.976,
): MicroDvdParseResult {
	const rawText = decodeTextBytes(fileBytes);
	const lines = rawText.split(/\r?\n/);

	let detectedFps = fallbackFps;
	let fpsFound = false;

	const cues: Array<{
		startFrame: number;
		endFrame: number;
		text: string;
	}> = [];

	// Match pattern: {123}{456}Subtitle text
	const cueRegex = /^\s*\{(\d+)\}\{(\d+)\}(.*)$/;

	for (const line of lines) {
		const match = line.match(cueRegex);
		if (!match) continue;

		const start = Number.parseInt(match[1] ?? "0", 10);
		const end = Number.parseInt(match[2] ?? "0", 10);
		const content = match[3] ?? "";

		// Check for FPS specification in first cue or header (e.g. {1}{1}23.976 or {0}{0}25)
		if (!fpsFound && (start === 0 || start === 1) && (end === 0 || end === 1)) {
			const cleanContent = content.replace(/[^\d.,]/g, "").replace(",", ".");
			const parsedFps = Number.parseFloat(cleanContent);
			if (!Number.isNaN(parsedFps) && parsedFps >= 10 && parsedFps <= 120) {
				detectedFps = parsedFps;
				fpsFound = true;
				continue; // Skip the FPS header line from subtitles
			}
		}

		const cleaned = cleanMicroDvdText(content);
		if (cleaned.length === 0) continue;

		// Ensure endFrame is greater than startFrame
		const validEnd =
			end <= start ? start + Math.max(1, Math.round(detectedFps)) : end;

		cues.push({
			startFrame: start,
			endFrame: validEnd,
			text: cleaned,
		});
	}

	if (cues.length === 0) {
		throw new Error(
			"No valid MicroDVD subtitle cues found. Ensure the file contains {start}{end} frame tags.",
		);
	}

	// Sort cues chronologically by startFrame
	cues.sort((a, b) => a.startFrame - b.startFrame);

	// Convert frames to milliseconds and assemble SubRip (.srt)
	const srtBlocks: string[] = [];
	let index = 1;

	for (const cue of cues) {
		const startMs = (cue.startFrame / detectedFps) * 1000;
		const endMs = (cue.endFrame / detectedFps) * 1000;

		const startStr = formatSrtTimestamp(startMs);
		const endStr = formatSrtTimestamp(endMs);

		srtBlocks.push(`${index}\n${startStr} --> ${endStr}\n${cue.text}`);
		index++;
	}

	const srtContent = `${srtBlocks.join("\n\n")}\n`;

	return {
		fps: detectedFps,
		cueCount: cues.length,
		srtContent,
	};
}

/**
 * Main conversion entry point for MicroDVD (.sub) to SubRip (.srt) conversion.
 */
export function convertMicroDvdToSrt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading MicroDVD subtitle cues & frame timings...");
	const bytes = new Uint8Array(input);
	const parsed = parseMicroDvd(bytes);

	onProgress?.(
		0.6,
		`Converted ${parsed.cueCount} cues using ${parsed.fps} FPS...`,
	);
	onProgress?.(0.9, "Generating SubRip (.srt) timestamp formatting...");

	onProgress?.(1.0, "Complete");
	const encoded = new TextEncoder().encode(parsed.srtContent);
	return encoded.buffer.slice(
		encoded.byteOffset,
		encoded.byteOffset + encoded.byteLength,
	) as ArrayBuffer;
}
