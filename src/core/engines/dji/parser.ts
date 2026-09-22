export interface DjiRow {
	srtStart: string;
	srtEnd: string;
	fields: Record<string, string>;
}

/**
 * Converts DJI drone SRT telemetry sidecars into CSV flight logs.
 *
 * DJI writes per-cue flight data in two model families, both handled:
 * - **Bracket** (Mini 3, Air 2S, Mavic 3…): `[iso: 400] [latitude: 30.1]
 *   [rel_alt: 6.5 abs_alt: -32.3]` plus `FrameCnt:`/`DiffTime:` headers and a
 *   `YYYY-MM-DD HH:MM:SS.mmm` wall-clock line.
 * - **Legacy** (Mavic Pro, Phantom…): `HOME(lon,lat) DATE GPS(lon,lat,alt)
 *   BAROMETER:x` lines with `KEY:value` pairs.
 * Columns are the union of every field seen (missing cells stay blank), so
 * no model silently drops data — the same contract as dji-srt2csv and
 * DJI_SRT_Parser, running entirely in the browser.
 */
export function parseDjiSrt(fileBytes: Uint8Array): DjiRow[] {
	const text = new TextDecoder("utf-8").decode(fileBytes);
	const blocks = text.split(/\r?\n\s*\r?\n/);
	const rows: DjiRow[] = [];

	for (const block of blocks) {
		const lines = block
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length < 2) continue;
		const timeLine = lines[1] ?? "";
		const timeMatch =
			/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/.exec(
				timeLine,
			);
		if (!timeMatch) continue;
		const body = lines.slice(2).join("\n");
		if (!looksLikeTelemetry(body)) continue;

		const fields: Record<string, string> = {};
		for (const [k, v] of extractBracketPairs(body)) fields[k] = v;
		for (const [k, v] of extractLegacy(body)) {
			if (!(k in fields)) fields[k] = v;
		}
		const datetime =
			extractDatetime(body) ?? fields.datetime ?? fields.DATE ?? "";
		if (datetime) fields.datetime = datetime;
		delete fields.DATE;
		rows.push({
			srtStart: (timeMatch[1] ?? "").replace(".", ","),
			srtEnd: (timeMatch[2] ?? "").replace(".", ","),
			fields,
		});
	}

	if (rows.length === 0) {
		throw new Error(
			"No DJI telemetry cues found: expected per-frame `[key: value]` or `HOME()/GPS()` subtitle blocks.",
		);
	}
	return rows;
}

function looksLikeTelemetry(body: string): boolean {
	return /\[latitude:|\[longitude:|GPS\(|HOME\(|rel_alt|FrameCnt/i.test(body);
}

function extractBracketPairs(body: string): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	const re = /\[([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\]]*)\]/g;
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
	while ((m = re.exec(body)) !== null) {
		const key = (m[1] ?? "").trim().toLowerCase();
		const value = (m[2] ?? "").trim();
		if (key && value) out.push([key, value]);
		if (m[0].length === 0) re.lastIndex++;
	}
	// Pair forms: [rel_alt: 6.5 abs_alt: -32.3] → split inner pairs too.
	// (Inner names may omit the second colon, so it is optional here.)
	const expanded: Array<[string, string]> = [];
	for (const [k, v] of out) {
		const full = `${k}: ${v}`;
		const inner = [
			...full.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\s:]+)/g),
		];
		if (inner.length > 1) {
			for (const im of inner) {
				if (im[1] && im[2] !== undefined)
					expanded.push([im[1].toLowerCase(), im[2]]);
			}
		} else {
			expanded.push([k, v]);
		}
	}
	return expanded;
}

function extractLegacy(body: string): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	const home = /HOME\(\s*([+-]?[\d.]+)\s*,\s*([+-]?[\d.]+)\s*\)/i.exec(body);
	if (home?.[1] && home?.[2]) {
		out.push(["home_lon", home[1]]);
		out.push(["home_lat", home[2]]);
	}
	const gps =
		/GPS\(\s*([+-]?[\d.]+)\s*,\s*([+-]?[\d.]+)\s*,?\s*([+-]?[\d.]*)\s*\)/i.exec(
			body,
		);
	if (gps?.[1] && gps?.[2]) {
		out.push(["longitude", gps[1]]);
		out.push(["latitude", gps[2]]);
		if (gps[3]) out.push(["gps_alt", gps[3]]);
	}
	for (const line of body.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("[")) continue; // bracket pairs handled above
		// Space-separated KEY:value runs: `ISO:100 Shutter:60 EV: 0 Fnum:2.2 BAROMETER:1.9`
		for (const pm of trimmed.matchAll(
			/\b([A-Za-z][A-Za-z0-9_]*)\s*:\s*([+-]?[\w/.]+)/g,
		)) {
			const key = (pm[1] ?? "").toLowerCase();
			const value = pm[2] ?? "";
			if (!key || !value || key === "framecnt" || key === "datetime") continue;
			if (key === "home" || key === "gps") continue;
			out.push([key, value]);
		}
		for (const fc of line.matchAll(/FrameCnt\s*:\s*(\d+)/gi)) {
			if (fc[1]) out.push(["framecnt", fc[1]]);
		}
	}
	return out;
}

function extractDatetime(body: string): string | null {
	const iso = /\b(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\b/.exec(body);
	if (iso?.[1]) return iso[1];
	const legacy = /\b(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\b/.exec(body);
	return legacy?.[1] ?? null;
}

function csvCell(s: string): string {
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function renderDjiCsv(rows: DjiRow[]): string {
	const columns = ["srt_start", "srt_end", "datetime"];
	for (const r of rows) {
		for (const k of Object.keys(r.fields)) {
			if (!columns.includes(k)) columns.push(k);
		}
	}
	const lines = rows.map((r) =>
		columns
			.map((c) =>
				csvCell(
					c === "srt_start"
						? r.srtStart
						: c === "srt_end"
							? r.srtEnd
							: (r.fields[c] ?? ""),
				),
			)
			.join(","),
	);
	return `\uFEFF${columns.join(",")}\n${lines.join("\n")}\n`;
}

export function convertDjiToCsv(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading telemetry cues...");
	const rows = parseDjiSrt(new Uint8Array(input));
	onProgress?.(0.6, `Writing ${rows.length} samples...`);
	const csv = renderDjiCsv(rows);
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(csv).buffer as ArrayBuffer;
}
