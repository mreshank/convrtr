/**
 * Scenarist Closed Caption (.scc) Parser & Converter.
 *
 * SCC is the broadcast television and digital streaming specification standard
 * for CEA-608 (Line 21) closed captions. Used universally by Amazon Prime Video,
 * iTunes/Apple, Netflix, and broadcast networks for archival programming.
 */

export interface SccCue {
	startSec: number;
	endSec: number;
	text: string;
}

const SPECIAL_CHARS: Record<number, string> = {
	48: "®",
	49: "°",
	50: "½",
	51: "¿",
	52: "™",
	53: "¢",
	54: "£",
	55: "♪",
	56: "à",
	57: " ",
	58: "è",
	59: "â",
	60: "ê",
	61: "î",
	62: "ô",
	63: "û",
};

export function parseSccTimecode(tc: string, defaultFps = 29.97): number {
	const isDropFrame = tc.includes(";");
	const parts = tc.replace(";", ":").split(":").map(Number);
	if (parts.length < 4) return 0;
	const [hh = 0, mm = 0, ss = 0, ff = 0] = parts;

	if (isDropFrame) {
		const totalMinutes = hh * 60 + mm;
		const dropFrames = totalMinutes * 2 - Math.floor(totalMinutes / 10) * 2;
		const totalFrames = (totalMinutes * 60 + ss) * 30 + ff - dropFrames;
		return Math.max(0, totalFrames / 29.97);
	}
	return Math.max(0, hh * 3600 + mm * 60 + ss + ff / defaultFps);
}

export function parseScc(sccText: string): SccCue[] {
	const lines = sccText.split(/\r?\n/);
	const cues: SccCue[] = [];

	let offscreenBuffer = "";
	let currentCue: { startSec: number; text: string } | null = null;
	let lastCommand = "";

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith("Scenarist_SCC")) continue;

		// Timecode matches: 00:01:23:14 or 00:01:23;14 followed by whitespace and hex words
		const tcMatch = line.match(/^(\d{2}:\d{2}:\d{2}[:;]\d{2})\s+(.+)$/);
		if (!tcMatch) continue;

		const timecodeStr = tcMatch[1] ?? "";
		const wordsStr = tcMatch[2] ?? "";
		const timeSec = parseSccTimecode(timecodeStr);

		const words = wordsStr.trim().split(/\s+/);

		for (const word of words) {
			if (word.length !== 4) continue;

			// Skip repeated duplicate commands sent for broadcast redundancy
			if (word === lastCommand) {
				continue;
			}
			lastCommand = word;

			const b1 = Number.parseInt(word.substring(0, 2), 16) & 0x7f;
			const b2 = Number.parseInt(word.substring(2, 4), 16) & 0x7f;

			// EIA-608 Control codes
			if (b1 === 0x14 || b1 === 0x1c) {
				if (b2 === 0x20) {
					// Resume Caption Loading (RCL) - pop-on start
					continue;
				}
				if (b2 === 0x2f) {
					// End of Caption (EOC) - swap buffer to display
					if (currentCue) {
						if (currentCue.text.trim()) {
							cues.push({
								startSec: currentCue.startSec,
								endSec: Math.max(currentCue.startSec + 0.8, timeSec),
								text: currentCue.text.trim(),
							});
						}
						currentCue = null;
					}
					if (offscreenBuffer.trim()) {
						currentCue = {
							startSec: timeSec,
							text: offscreenBuffer.trim(),
						};
					}
					offscreenBuffer = "";
					continue;
				}
				if (b2 === 0x2c) {
					// Erase Displayed Memory (EDM) - caption off
					if (currentCue) {
						if (currentCue.text.trim()) {
							cues.push({
								startSec: currentCue.startSec,
								endSec: Math.max(currentCue.startSec + 0.8, timeSec),
								text: currentCue.text.trim(),
							});
						}
						currentCue = null;
					}
					continue;
				}
				if (b2 === 0x2e) {
					// Erase Non-Displayed Memory (ENM)
					offscreenBuffer = "";
					continue;
				}
				if (b2 === 0x2d) {
					// Carriage return
					offscreenBuffer += "\n";
					continue;
				}
			}

			// Special characters table (0x11 0x30..0x3F)
			if (b1 === 0x11 && b2 >= 0x30 && b2 <= 0x3f) {
				const special = SPECIAL_CHARS[b2];
				if (special) offscreenBuffer += special;
				continue;
			}

			// Preamble Address Code or Mid-Row codes (styles, row shifts)
			if (b1 >= 0x11 && b1 <= 0x17) {
				continue;
			}

			// Regular printable ASCII characters
			if (b1 >= 0x20 && b1 <= 0x7e) {
				offscreenBuffer += String.fromCharCode(b1);
			}
			if (b2 >= 0x20 && b2 <= 0x7e) {
				offscreenBuffer += String.fromCharCode(b2);
			}
		}
	}

	// Flush trailing cue if still displayed
	if (currentCue && currentCue.text.trim()) {
		cues.push({
			startSec: currentCue.startSec,
			endSec: currentCue.startSec + 2.5,
			text: currentCue.text.trim(),
		});
	}

	return cues;
}

function formatTimestamp(totalSeconds: number, separator: "," | "."): string {
	const totalMs = Math.round(totalSeconds * 1000);
	const ms = totalMs % 1000;
	const s = Math.floor(totalMs / 1000) % 60;
	const m = Math.floor(totalMs / 60000) % 60;
	const h = Math.floor(totalMs / 3600000);

	const hh = String(h).padStart(2, "0");
	const mm = String(m).padStart(2, "0");
	const ss = String(s).padStart(2, "0");
	const mmm = String(ms).padStart(3, "0");

	return `${hh}:${mm}:${ss}${separator}${mmm}`;
}

export function formatSrt(cues: SccCue[]): string {
	const blocks: string[] = [];
	for (let i = 0; i < cues.length; i++) {
		const cue = cues[i];
		if (!cue) continue;
		const start = formatTimestamp(cue.startSec, ",");
		const end = formatTimestamp(cue.endSec, ",");
		blocks.push(`${i + 1}\n${start} --> ${end}\n${cue.text}\n`);
	}
	return `${blocks.join("\n")}\n`;
}

export function formatVtt(cues: SccCue[]): string {
	const blocks: string[] = ["WEBVTT\n"];
	for (let i = 0; i < cues.length; i++) {
		const cue = cues[i];
		if (!cue) continue;
		const start = formatTimestamp(cue.startSec, ".");
		const end = formatTimestamp(cue.endSec, ".");
		blocks.push(`${i + 1}\n${start} --> ${end}\n${cue.text}\n`);
	}
	return `${blocks.join("\n")}\n`;
}

export function convertScc(
	input: ArrayBuffer,
	asVtt = false,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Parsing Scenarist SCC closed caption data...");
	const text = new TextDecoder("latin1").decode(input);
	const cues = parseScc(text);

	if (cues.length === 0) {
		throw new Error("No closed caption cues found in .scc file.");
	}

	onProgress?.(
		0.7,
		`Formatting ${cues.length} cues as ${asVtt ? "WebVTT" : "SubRip SRT"}...`,
	);
	const outputStr = asVtt ? formatVtt(cues) : formatSrt(cues);

	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(outputStr).buffer as ArrayBuffer;
}
