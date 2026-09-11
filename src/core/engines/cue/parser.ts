export interface CueTimestamp {
	time: string; // "MM:SS:FF"
	frames: number;
	seconds: number;
	milliseconds: number;
	formatted: string; // "MM:SS.mmm"
}

export interface CueIndex {
	number: number;
	timestamp: CueTimestamp;
}

export interface CueTrack {
	number: number;
	dataType: string;
	title?: string;
	performer?: string;
	songwriter?: string;
	isrc?: string;
	flags: string[];
	pregap?: CueTimestamp;
	postgap?: CueTimestamp;
	indices: CueIndex[];
}

export interface CueFile {
	fileName: string;
	fileType: string;
	tracks: CueTrack[];
}

export interface CueSheet {
	catalog?: string;
	cdTextFile?: string;
	title?: string;
	performer?: string;
	songwriter?: string;
	comments: Record<string, string>;
	files: CueFile[];
	totalTracks: number;
}

/**
 * Converts a CD-DA MM:SS:FF timestamp (75 frames per second) into frame counts and milliseconds.
 */
export function parseCueTimestamp(timeStr: string): CueTimestamp {
	const parts = timeStr.trim().split(":");
	if (parts.length !== 3) {
		return {
			time: timeStr,
			frames: 0,
			seconds: 0,
			milliseconds: 0,
			formatted: "00:00.000",
		};
	}

	const minutes = Number.parseInt(parts[0] ?? "0", 10) || 0;
	const seconds = Number.parseInt(parts[1] ?? "0", 10) || 0;
	const frames = Number.parseInt(parts[2] ?? "0", 10) || 0;

	const totalFrames = minutes * 60 * 75 + seconds * 75 + frames;
	const totalSeconds = totalFrames / 75;
	const totalMs = Math.round(totalSeconds * 1000);

	const minStr = String(minutes).padStart(2, "0");
	const secStr = String(seconds).padStart(2, "0");
	const msPart = String(Math.round((frames / 75) * 1000)).padStart(3, "0");

	return {
		time: timeStr.trim(),
		frames: totalFrames,
		seconds: Number(totalSeconds.toFixed(3)),
		milliseconds: totalMs,
		formatted: `${minStr}:${secStr}.${msPart}`,
	};
}

/**
 * Strips surrounding double quotes from a parsed token.
 */
function unquote(str: string): string {
	const trimmed = str.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

/**
 * Parses CUE sheet textual lines into tokens respecting double-quoted strings.
 */
function tokenizeLine(line: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === " " || char === "\t") {
			if (inQuotes) {
				current += char;
			} else if (current.length > 0) {
				tokens.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}

	if (current.length > 0) {
		tokens.push(current);
	}

	return tokens;
}

/**
 * Parses CUE sheet file content into a structured CueSheet object.
 */
export function parseCue(text: string): CueSheet {
	// Strip UTF-8 BOM if present
	const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
	const lines = cleanText.split(/\r?\n/);

	const result: CueSheet = {
		comments: {},
		files: [],
		totalTracks: 0,
	};

	let currentFile: CueFile | null = null;
	let currentTrack: CueTrack | null = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;

		const tokens = tokenizeLine(line);
		if (tokens.length === 0) continue;

		const command = (tokens[0] ?? "").toUpperCase();

		switch (command) {
			case "CATALOG":
				result.catalog = unquote(tokens.slice(1).join(" "));
				break;

			case "CDTEXTFILE":
				result.cdTextFile = unquote(tokens.slice(1).join(" "));
				break;

			case "TITLE": {
				const titleVal = unquote(tokens.slice(1).join(" "));
				if (currentTrack) {
					currentTrack.title = titleVal;
				} else {
					result.title = titleVal;
				}
				break;
			}

			case "PERFORMER": {
				const performerVal = unquote(tokens.slice(1).join(" "));
				if (currentTrack) {
					currentTrack.performer = performerVal;
				} else {
					result.performer = performerVal;
				}
				break;
			}

			case "SONGWRITER": {
				const songwriterVal = unquote(tokens.slice(1).join(" "));
				if (currentTrack) {
					currentTrack.songwriter = songwriterVal;
				} else {
					result.songwriter = songwriterVal;
				}
				break;
			}

			case "REM": {
				if (tokens.length >= 3) {
					const key = tokens[1] ?? "";
					const val = unquote(tokens.slice(2).join(" "));
					result.comments[key] = val;
				} else if (tokens.length === 2) {
					result.comments[tokens[1] ?? ""] = "";
				}
				break;
			}

			case "FILE": {
				// FILE "filename" TYPE
				const fileType =
					tokens.length > 2
						? (tokens[tokens.length - 1] ?? "BINARY")
						: "BINARY";
				const fileNameTokens = tokens.slice(1, tokens.length - 1);
				const fileName = unquote(fileNameTokens.join(" "));

				currentFile = {
					fileName,
					fileType,
					tracks: [],
				};
				result.files.push(currentFile);
				currentTrack = null;
				break;
			}

			case "TRACK": {
				// TRACK 01 AUDIO
				const trackNum = Number.parseInt(tokens[1] ?? "1", 10) || 1;
				const dataType = tokens[2] ?? "AUDIO";

				currentTrack = {
					number: trackNum,
					dataType,
					flags: [],
					indices: [],
				};

				if (!currentFile) {
					// Standalone track without prior FILE directive
					currentFile = {
						fileName: "",
						fileType: "",
						tracks: [],
					};
					result.files.push(currentFile);
				}

				currentFile.tracks.push(currentTrack);
				result.totalTracks++;
				break;
			}

			case "FLAGS":
				if (currentTrack) {
					currentTrack.flags = tokens.slice(1);
				}
				break;

			case "ISRC":
				if (currentTrack && tokens[1]) {
					currentTrack.isrc = unquote(tokens[1]);
				}
				break;

			case "PREGAP":
				if (currentTrack && tokens[1]) {
					currentTrack.pregap = parseCueTimestamp(tokens[1]);
				}
				break;

			case "POSTGAP":
				if (currentTrack && tokens[1]) {
					currentTrack.postgap = parseCueTimestamp(tokens[1]);
				}
				break;

			case "INDEX":
				if (currentTrack && tokens.length >= 3) {
					const idxNum = Number.parseInt(tokens[1] ?? "0", 10) || 0;
					const timeVal = parseCueTimestamp(tokens[2] ?? "00:00:00");
					currentTrack.indices.push({
						number: idxNum,
						timestamp: timeVal,
					});
				}
				break;
		}
	}

	return result;
}

/**
 * Converts CUE sheet input bytes to structured JSON string encoded into an ArrayBuffer.
 */
export function convertCueToJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.1, "Reading CUE text file");
	const decoder = new TextDecoder("utf-8");
	const text = decoder.decode(input);

	onProgress?.(0.5, "Parsing CD-DA tracklist and chapter frames");
	const cueData = parseCue(text);

	onProgress?.(0.9, "Serializing JSON output");
	const jsonStr = JSON.stringify(cueData, null, 2);
	const encoder = new TextEncoder();
	const uint8 = encoder.encode(jsonStr);

	return uint8.buffer.slice(
		uint8.byteOffset,
		uint8.byteOffset + uint8.byteLength,
	) as ArrayBuffer;
}
