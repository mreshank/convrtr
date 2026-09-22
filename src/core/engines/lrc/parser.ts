export interface LrcCue {
	startMs: number;
	endMs: number;
	text: string;
}

/**
 * Converts karaoke LRC lyrics to SubRip (.srt) cues.
 *
 * LRC lines carry one or more `[mm:ss.xx]` timestamps (centisecond or
 * millisecond fractions; bare `[mm:ss]` allowed) plus `[ti|ar|al|by|offset:]`
 * headers. Each timestamp becomes a cue; a line with several timestamps fans
 * out to several cues; cue ends default to the next cue's start (2s for the
 * last). Word-timing `<mm:ss.xx>` tags are stripped to plain lines.
 */
export function parseLrc(fileBytes: Uint8Array): LrcCue[] {
	const text = new TextDecoder("utf-8").decode(fileBytes);
	const offset = readOffset(text);
	const cues: LrcCue[] = [];

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("[ti:") || line.startsWith("[ar:")) continue;
		if (/^\[(al|by|au|la|ve|offset):/i.test(line)) continue;

		const stamps = [
			...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g),
		];
		if (stamps.length === 0) continue;
		const lyric = line
			.replace(/\[[^\]]*\]/g, "")
			.replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, "")
			.trim();
		if (!lyric) continue;

		for (const s of stamps) {
			const ms = toMs(s[1] ?? "0", s[2] ?? "00", s[3]) + offset;
			if (ms < 0) continue;
			cues.push({ startMs: ms, endMs: ms, text: lyric });
		}
	}

	if (cues.length === 0) {
		throw new Error(
			"No lyric timestamps found: expected LRC lines like `[01:23.45] lyric text` with optional [ti:]/[ar:]/[offset:] headers.",
		);
	}

	cues.sort((a, b) => a.startMs - b.startMs);
	// Merge identical timestamps, then chain ends.
	const merged: LrcCue[] = [];
	for (const c of cues) {
		const last = merged[merged.length - 1];
		if (last && last.startMs === c.startMs) {
			last.text += `\n${c.text}`;
		} else {
			merged.push({ ...c });
		}
	}
	for (let i = 0; i < merged.length; i++) {
		const cur = merged[i];
		const next = merged[i + 1];
		if (cur)
			cur.endMs = next
				? Math.min(next.startMs, cur.startMs + 8000)
				: cur.startMs + 2000;
	}
	return merged.filter((c) => c.endMs > c.startMs);
}

function readOffset(text: string): number {
	const m = /\[offset:\s*([+-]?\d+)\s*\]/i.exec(text);
	return m?.[1] ? Number(m[1]) : 0;
}

function toMs(min: string, sec: string, frac: string | undefined): number {
	const minutes = Number(min);
	const seconds = Number(sec);
	let ms = 0;
	if (frac !== undefined) {
		// 1 digit = tenths, 2 = centiseconds, 3 = milliseconds.
		ms = Number(frac.padEnd(3, "0").slice(0, 3));
	}
	return minutes * 60000 + seconds * 1000 + (Number.isFinite(ms) ? ms : 0);
}

export function formatSrtTimestamp(ms: number): string {
	const total = Math.max(0, Math.round(ms));
	const h = Math.floor(total / 3600000);
	const m = Math.floor((total % 3600000) / 60000);
	const s = Math.floor((total % 60000) / 1000);
	const rest = total % 1000;
	const pad = (n: number, w: number) => String(n).padStart(w, "0");
	return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(rest, 3)}`;
}

export function convertLrcToSrt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading lyric timestamps...");
	const cues = parseLrc(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${cues.length} cues...`);
	const blocks = cues.map(
		(c, i) =>
			`${i + 1}\n${formatSrtTimestamp(c.startMs)} --> ${formatSrtTimestamp(c.endMs)}\n${c.text}\n`,
	);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(`${blocks.join("\n")}\n`)
		.buffer as ArrayBuffer;
}
