export interface SbvCue {
	startMs: number;
	endMs: number;
	text: string;
}

function parseTimestamp(raw: string): number | null {
	const m = /^(\d+):(\d{2}):(\d{2})[.,](\d{1,3})$/.exec(raw.trim());
	if (!m?.[1] || !m?.[2] || !m?.[3] || !m?.[4]) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	const s = Number(m[3]);
	const ms = Number(m[4].padEnd(3, "0").slice(0, 3));
	if (![h, min, s, ms].every(Number.isFinite)) return null;
	return h * 3600000 + min * 60000 + s * 1000 + ms;
}

/**
 * Converts YouTube SubViewer (`.sbv`) captions to SubRip (.srt).
 *
 * SBV is SRT's close cousin with two differences: timestamps use dots
 * (`0:00:00.000,0:00:02.000`) and cues are unnumbered. Parsing splits on
 * blank lines, converts each timestamp pair, and numbers the cues —
 * inline `<b>`/`<i>`/`<u>` survive (both formats share them), anything
 * else passes through as plain text.
 */
export function parseSbv(fileBytes: Uint8Array): SbvCue[] {
	const text = new TextDecoder("utf-8").decode(fileBytes);
	const cues: SbvCue[] = [];
	for (const block of text.split(/\r?\n\s*\r?\n/)) {
		const lines = block
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length < 2) continue;
		const [startRaw, endRaw] = (lines[0] ?? "").split(",");
		const startMs = startRaw ? parseTimestamp(startRaw) : null;
		const endMs = endRaw ? parseTimestamp(endRaw) : null;
		if (startMs === null || endMs === null || endMs <= startMs) continue;
		const body = lines.slice(1).join("\n").trim();
		if (!body) continue;
		cues.push({ startMs, endMs, text: body });
	}
	if (cues.length === 0) {
		throw new Error(
			"No SBV cues found: expected blocks like `0:00:01.000,0:00:04.000` followed by caption lines.",
		);
	}
	return cues;
}

function formatSrtTimestamp(ms: number): string {
	const total = Math.max(0, Math.round(ms));
	const pad = (n: number, w: number) => String(n).padStart(w, "0");
	return `${pad(Math.floor(total / 3600000), 2)}:${pad(Math.floor((total % 3600000) / 60000), 2)}:${pad(Math.floor((total % 60000) / 1000), 2)},${pad(total % 1000, 3)}`;
}

export function convertSbvToSrt(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading caption blocks...");
	const cues = parseSbv(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${cues.length} cues...`);
	const blocks = cues.map(
		(c, i) =>
			`${i + 1}\n${formatSrtTimestamp(c.startMs)} --> ${formatSrtTimestamp(c.endMs)}\n${c.text}\n`,
	);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(`${blocks.join("\n")}\n`)
		.buffer as ArrayBuffer;
}
