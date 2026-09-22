export interface StlCue {
	startMs: number;
	endMs: number;
	text: string;
}

/**
 * Converts broadcast `.stl` subtitles to SubRip (.srt).
 *
 * The extension is shared by two unrelated formats, and both are handled:
 * - **EBU STL (Tech 3264, binary):** a 1024-byte GSI header (frame rate lives
 *   in the DFC field) followed by 128-byte TTI blocks carrying binary
 *   in/out timecodes and a 112-byte text field. Text follows the ISO 6937
 *   Latin path — ASCII direct, combining diacritics resolved to precomposed
 *   characters, teletext control codes dropped, `0x8A` as the row break.
 * - **Spruce STL (text):** `HH:MM:SS:FF,HH:MM:SS:FF,text` lines with `|`
 *   row separators and `$directives`/`//` comments, frame rate from an
 *   optional `$FPS` directive (25 assumed).
 */
export function parseStl(fileBytes: Uint8Array): StlCue[] {
	if (looksLikeSpruceText(fileBytes)) return parseSpruce(fileBytes);
	return parseEbuStl(fileBytes);
}

function looksLikeSpruceText(bytes: Uint8Array): boolean {
	if (bytes.includes(0)) return false; // binary → EBU path
	const sample = new TextDecoder("utf-8").decode(bytes.subarray(0, 4096));
	if (
		/\d{2}:\d{2}:\d{2}[:;]\d{2}\s*,\s*\d{2}:\d{2}:\d{2}[:;]\d{2}/.test(sample)
	) {
		return true;
	}
	return /^\s*\$[A-Za-z]+/m.test(sample);
}

// ---------- Spruce (text) ----------

function parseSpruce(bytes: Uint8Array): StlCue[] {
	const text = new TextDecoder("utf-8").decode(bytes);
	let fps = 25;
	const fpsMatch = /\$FPS\s*=?\s*(\d+(?:\.\d+)?)/i.exec(text);
	if (fpsMatch?.[1]) {
		const v = Number(fpsMatch[1]);
		if (Number.isFinite(v) && v > 0) fps = v;
	}
	const cues: StlCue[] = [];
	const lineRe =
		/(\d{2}):(\d{2}):(\d{2})[:;](\d{2})\s*,\s*(\d{2}):(\d{2}):(\d{2})[:;](\d{2})\s*,(.*)$/;
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("//") || line.startsWith("$")) continue;
		const m = lineRe.exec(line);
		if (!m) continue;
		const startMs = tcToMs(m[1], m[2], m[3], m[4], fps);
		const endMs = tcToMs(m[5], m[6], m[7], m[8], fps);
		const body = (m[9] ?? "").replace(/\|/g, "\n").trim();
		if (!body || endMs <= startMs) continue;
		cues.push({ startMs, endMs, text: body });
	}
	if (cues.length === 0) {
		throw new Error(
			"No Spruce cues found: expected lines like `00:00:13:05,00:00:16:20,First line|Second line`.",
		);
	}
	return cues;
}

function tcToMs(
	h: string | undefined,
	m: string | undefined,
	s: string | undefined,
	f: string | undefined,
	fps: number,
): number {
	const hours = Number(h ?? 0);
	const mins = Number(m ?? 0);
	const secs = Number(s ?? 0);
	const frames = Number(f ?? 0);
	return Math.round(
		(((hours * 3600 + mins * 60 + secs) * fps + frames) / fps) * 1000,
	);
}

// ---------- EBU STL (binary, Tech 3264) ----------

const EBU_COMBINING: Record<number, string> = {
	193: "\u0300",
	194: "\u0301",
	195: "\u0302",
	196: "\u0303",
	197: "\u0304",
	198: "\u0306",
	199: "\u0307",
	200: "\u0308",
	202: "\u0327",
	204: "\u030c",
};

function decodeStlText(field: Uint8Array): string {
	const rows: string[] = [];
	let cur = "";
	const flush = () => {
		const t = cur.replace(/\s+$/u, "");
		if (t) rows.push(t);
		cur = "";
	};
	for (let i = 0; i < field.length; i++) {
		const b = field[i] ?? 0;
		if (b === 0x8a) {
			flush();
			continue;
		}
		if (b < 0x20 || (b >= 0x80 && b <= 0x9f)) continue; // teletext controls
		const combining = EBU_COMBINING[b];
		if (combining !== undefined) {
			const next = field[i + 1];
			if (next !== undefined && next >= 0x20 && next <= 0x7e) {
				// ISO 6937 stores mark-then-base; NFC composes base-then-mark.
				cur += (String.fromCharCode(next) + combining).normalize("NFC");
				i++;
			}
			continue;
		}
		if (b >= 0x20 && b <= 0x7e) cur += String.fromCharCode(b);
		else if (b === 0x7f)
			cur += "\u266A"; // EBU eighth-note
		else if (b >= 0xa0) cur += String.fromCharCode(b); // Latin-1 fallback
	}
	flush();
	return rows.slice(0, 4).join("\n");
}

function parseEbuStl(bytes: Uint8Array): StlCue[] {
	if (bytes.length < 1152) {
		throw new Error(
			"Too small for EBU STL: need a 1024-byte GSI header plus at least one 128-byte TTI block (Spruce text was not detected either).",
		);
	}
	const dfcText = new TextDecoder("ascii").decode(bytes.subarray(3, 11)).trim();
	const fpsParsed = Number.parseInt(dfcText, 10);
	const fps = Number.isFinite(fpsParsed) && fpsParsed > 0 ? fpsParsed : 25;

	const cues: StlCue[] = [];
	for (let off = 1024; off + 128 <= bytes.length; off += 128) {
		const ebn = bytes[off + 2] ?? 0;
		if (ebn === 0xff) continue; // extension block, no cue text
		const startMs = stlTc(bytes, off + 4, fps);
		const endMs = stlTc(bytes, off + 8, fps);
		if (startMs === null || endMs === null || endMs <= startMs) continue;
		const text = decodeStlText(bytes.subarray(off + 16, off + 128));
		if (!text) continue;
		cues.push({ startMs, endMs, text });
	}
	if (cues.length === 0) {
		throw new Error(
			"No subtitle cues decoded from this EBU STL file (empty text fields or unreadable timecodes).",
		);
	}
	return cues;
}

function stlTc(bytes: Uint8Array, at: number, fps: number): number | null {
	const h = bytes[at] ?? 0;
	const m = bytes[at + 1] ?? 0;
	const s = bytes[at + 2] ?? 0;
	const f = bytes[at + 3] ?? 0;
	if (m > 59 || s > 59 || f > fps) return null;
	return Math.round((((h * 3600 + m * 60 + s) * fps + f) / fps) * 1000);
}

export function formatSrtTimestamp(ms: number): string {
	const total = Math.max(0, Math.round(ms));
	const pad = (n: number, w: number) => String(n).padStart(w, "0");
	return `${pad(Math.floor(total / 3600000), 2)}:${pad(Math.floor((total % 3600000) / 60000), 2)}:${pad(Math.floor((total % 60000) / 1000), 2)},${pad(total % 1000, 3)}`;
}

export function convertStlToSrt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading subtitle blocks...");
	const cues = parseStl(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${cues.length} cues...`);
	const blocks = cues.map(
		(c, i) =>
			`${i + 1}\n${formatSrtTimestamp(c.startMs)} --> ${formatSrtTimestamp(c.endMs)}\n${c.text}\n`,
	);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(`${blocks.join("\n")}\n`)
		.buffer as ArrayBuffer;
}
