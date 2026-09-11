/**
 * SAMI (Synchronized Accessible Media Interchange) .smi Subtitle Parser & SRT Converter
 *
 * Supports:
 * - UTF-8 (with or without BOM), UTF-16 LE/BE, and EUC-KR / CP949 Korean legacy encodings
 * - Multi-language track detection (e.g. KRCC, ENCC, CC)
 * - Empty & &nbsp; blank sync cue boundary termination
 * - HTML formatting cleanup (<br> to newlines, tag stripping with <i>/<b> retention)
 * - HTML entity resolution (named, numeric, and hex entities)
 * - Standard SubRip (.srt) generation with millisecond-exact timestamps
 */

export interface SamiCue {
	index: number;
	startMs: number;
	endMs: number;
	className: string;
	text: string;
}

export interface SamiParseResult {
	title?: string;
	classes: string[];
	cues: SamiCue[];
	srt: string;
	encoding: string;
}

/**
 * Decodes raw bytes into a string, automatically detecting BOM, UTF-8,
 * EUC-KR / CP949 (standard for Korean SAMI files), or Windows-1252.
 */
export function decodeSamiBytes(bytes: Uint8Array): {
	text: string;
	encoding: string;
} {
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xef &&
		bytes[1] === 0xbb &&
		bytes[2] === 0xbf
	) {
		return {
			text: new TextDecoder("utf-8").decode(bytes.subarray(3)),
			encoding: "utf-8",
		};
	}
	if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
		return {
			text: new TextDecoder("utf-16le").decode(bytes.subarray(2)),
			encoding: "utf-16le",
		};
	}
	if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
		return {
			text: new TextDecoder("utf-16be").decode(bytes.subarray(2)),
			encoding: "utf-16be",
		};
	}

	// Try UTF-8 strictly first
	try {
		const strictUtf8 = new TextDecoder("utf-8", { fatal: true });
		const decoded = strictUtf8.decode(bytes);
		return { text: decoded, encoding: "utf-8" };
	} catch {
		// If strict UTF-8 fails on invalid multi-byte sequences, try EUC-KR / CP949
		try {
			const eucKr = new TextDecoder("euc-kr");
			const decoded = eucKr.decode(bytes);
			return { text: decoded, encoding: "euc-kr" };
		} catch {
			const latin1 = new TextDecoder("windows-1252");
			return { text: latin1.decode(bytes), encoding: "windows-1252" };
		}
	}
}

/**
 * Decodes common HTML entities to their character equivalents.
 */
export function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&nbsp;/gi, " ")
		.replace(/&quot;/gi, '"')
		.replace(/&apos;/gi, "'")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&#(\d+);/g, (_, dec) => {
			const code = Number.parseInt(dec, 10);
			return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : "";
		})
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
			const code = Number.parseInt(hex, 16);
			return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : "";
		});
}

/**
 * Cleans HTML formatting from SAMI lines:
 * Converts <br> to newline, strips <font>, <span>, etc., preserves <i> and <b> for SRT.
 */
export function cleanSamiText(html: string): string {
	// Convert line breaks
	let text = html.replace(/<br\s*\/?>/gi, "\n");
	// Replace non-breaking spaces before entity decoding
	text = text.replace(/&nbsp;/gi, " ");
	// Remove <font ...>, </font>, <span>, </span>, <p ...>, </p>, etc., keeping <i> and <b>
	text = text.replace(/<\/?(?!i\b|b\b|u\b)[a-z0-9]+[^>]*>/gi, "");
	// Decode HTML entities
	text = decodeHtmlEntities(text);
	// Clean whitespace on lines
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	return lines.join("\n");
}

/**
 * Formats a millisecond timestamp into standard SubRip HH:MM:SS,mmm
 */
export function formatSrtTime(ms: number): string {
	const clamped = Math.max(0, Math.floor(ms));
	const hours = Math.floor(clamped / 3600000);
	const minutes = Math.floor((clamped % 3600000) / 60000);
	const seconds = Math.floor((clamped % 60000) / 1000);
	const millis = clamped % 1000;

	const hh = String(hours).padStart(2, "0");
	const mm = String(minutes).padStart(2, "0");
	const ss = String(seconds).padStart(2, "0");
	const mmm = String(millis).padStart(3, "0");

	return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Parses SAMI markup string into structured subtitle cues and converts to SRT.
 */
export function parseSami(
	rawContent: string,
	encoding = "utf-8",
): SamiParseResult {
	// Extract title if present
	const titleMatch = rawContent.match(/<TITLE[^>]*>([\s\S]*?)<\/TITLE>/i);
	const title = titleMatch?.[1] ? titleMatch[1].trim() : undefined;

	// Locate <BODY> or fall back to full content
	const bodyMatch = rawContent.match(/<BODY[^>]*>([\s\S]*?)<\/BODY>/i);
	const bodyContent = bodyMatch?.[1] ? bodyMatch[1] : rawContent;

	// Split by <SYNC Start=...> tags
	const syncRegex =
		/<SYNC\s+Start=["']?(\d+)["']?[^>]*>([\s\S]*?)(?=(?:<SYNC\s+Start=|$))/gi;

	interface RawSync {
		startMs: number;
		content: string;
	}

	const rawSyncs: RawSync[] = [];
	let match: RegExpExecArray | null = syncRegex.exec(bodyContent);
	while (match !== null) {
		const startStr = match[1];
		if (startStr) {
			const startMs = Number.parseInt(startStr, 10);
			const content = match[2] || "";
			rawSyncs.push({ startMs, content });
		}
		match = syncRegex.exec(bodyContent);
	}

	if (rawSyncs.length === 0) {
		throw new Error("No valid <SYNC Start=...> markers found in SAMI file.");
	}

	// Class-based tracking of active cues
	interface ActiveCue {
		startMs: number;
		className: string;
		text: string;
	}

	const activeCues = new Map<string, ActiveCue>();
	const finishedCues: SamiCue[] = [];
	const detectedClasses = new Set<string>();

	for (const sync of rawSyncs) {
		const { startMs, content } = sync;

		// Find all <P Class=...> inside this sync
		const pRegex =
			/<P(?:\s+Class=["']?([A-Za-z0-9_]+)["']?)?[^>]*>([\s\S]*?)(?=(?:<P[\s>]|$))/gi;
		let pMatch = pRegex.exec(content);

		const pEntries: { className: string; rawText: string }[] = [];
		if (pMatch !== null) {
			while (pMatch !== null) {
				const className = (pMatch[1] || "CC").toUpperCase();
				const rawText = pMatch[2] || "";
				pEntries.push({ className, rawText });
				detectedClasses.add(className);
				pMatch = pRegex.exec(content);
			}
		} else {
			// Plain text without <P> tag
			const className = "CC";
			detectedClasses.add(className);
			pEntries.push({ className, rawText: content });
		}

		for (const entry of pEntries) {
			const { className, rawText } = entry;
			const cleanedText = cleanSamiText(rawText);

			const currentActive = activeCues.get(className);

			if (cleanedText.length === 0) {
				// Blank / &nbsp; sync closes active cue for this class
				if (currentActive) {
					finishedCues.push({
						index: 0,
						startMs: currentActive.startMs,
						endMs: Math.max(currentActive.startMs + 500, startMs),
						className: currentActive.className,
						text: currentActive.text,
					});
					activeCues.delete(className);
				}
			} else {
				// New dialogue: close previous active cue if open
				if (currentActive) {
					finishedCues.push({
						index: 0,
						startMs: currentActive.startMs,
						endMs: Math.max(currentActive.startMs + 500, startMs),
						className: currentActive.className,
						text: currentActive.text,
					});
				}
				// Start new active cue
				activeCues.set(className, {
					startMs,
					className,
					text: cleanedText,
				});
			}
		}
	}

	// Close any remaining active cues
	for (const [_, active] of activeCues.entries()) {
		finishedCues.push({
			index: 0,
			startMs: active.startMs,
			endMs: active.startMs + 4000, // 4-second default display time
			className: active.className,
			text: active.text,
		});
	}

	// Sort cues chronologically
	finishedCues.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

	// Consolidate simultaneous cues (e.g. KRCC and ENCC at the same timestamp)
	const consolidatedCues: SamiCue[] = [];
	for (const cue of finishedCues) {
		const prev = consolidatedCues[consolidatedCues.length - 1];
		if (
			prev &&
			Math.abs(prev.startMs - cue.startMs) < 100 &&
			Math.abs(prev.endMs - cue.endMs) < 300
		) {
			// Merge simultaneous lines
			prev.text = `${prev.text}\n${cue.text}`;
		} else {
			cue.index = consolidatedCues.length + 1;
			consolidatedCues.push(cue);
		}
	}

	// Format as SubRip (.srt)
	const srtLines: string[] = [];
	for (let i = 0; i < consolidatedCues.length; i++) {
		const cue = consolidatedCues[i];
		if (!cue) continue;
		cue.index = i + 1;
		srtLines.push(String(cue.index));
		srtLines.push(
			`${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}`,
		);
		srtLines.push(cue.text);
		srtLines.push(""); // blank line delimiter between cues
	}

	return {
		title,
		classes: Array.from(detectedClasses),
		cues: consolidatedCues,
		srt: srtLines.join("\n"),
		encoding,
	};
}

/**
 * Main conversion entry point for SAMI to SRT conversion.
 */
export function convertSmiToSrt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Detecting encoding & reading SAMI markup...");
	const bytes = new Uint8Array(input);
	const { text, encoding } = decodeSamiBytes(bytes);

	onProgress?.(0.5, "Parsing subtitle synchronization points...");
	const result = parseSami(text, encoding);

	onProgress?.(0.9, "Formatting SubRip (.srt) subtitles...");
	const srtBytes = new TextEncoder().encode(result.srt);

	onProgress?.(1.0, "Complete");
	return srtBytes.buffer as ArrayBuffer;
}
