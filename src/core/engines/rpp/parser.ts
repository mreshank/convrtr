export interface RppItemSummary {
	name: string | null;
	position: number | null;
	length: number | null;
	sources: string[];
}

export interface RppTrackSummary {
	name: string;
	items: RppItemSummary[];
	fx: string[];
}

export interface RppMarkerSummary {
	id: number | null;
	position: number | null;
	end: number | null;
	name: string;
	isRegion: boolean;
}

export interface RppProjectSummary {
	format: "reaper-project";
	appVersion: string | null;
	tempo: number | null;
	timeSignature: string | null;
	trackCount: number;
	itemCount: number;
	tracks: RppTrackSummary[];
	markers: RppMarkerSummary[];
	sourceFiles: string[];
	fx: string[];
	note: string;
}

/**
 * Parses a REAPER project (.rpp / .rpp-bak) into a structured session summary.
 *
 * RPP is a plain-text chunk language: `<TAG args…>` opens a chunk, `>` closes
 * it, anything else is a `TOKEN args…` struct with `"quoted strings"`. This
 * extracts the story of the session — tempo map, tracks, items + source media,
 * markers, regions and FX — so collaborators, archivists and DAW-migrants can
 * inventory a project without REAPER installed. Pure client-side text parse.
 */
export function parseRpp(fileBytes: Uint8Array): RppProjectSummary {
	const text = new TextDecoder("utf-8").decode(fileBytes);
	if (!text.includes("<REAPER_PROJECT")) {
		throw new Error(
			"Not a REAPER project: missing <REAPER_PROJECT header. (.rpp files are plain text starting with <REAPER_PROJECT.)",
		);
	}

	const summary: RppProjectSummary = {
		format: "reaper-project",
		appVersion: null,
		tempo: null,
		timeSignature: null,
		trackCount: 0,
		itemCount: 0,
		tracks: [],
		markers: [],
		sourceFiles: [],
		fx: [],
		note: "Structural inventory only: tempo, tracks, items, referenced media files, markers, regions and plugin names. Audio/MIDI content is referenced, not embedded — use the source-file list to locate media on disk. Rendering still needs REAPER.",
	};

	const stack: string[] = [];
	let currentTrack: RppTrackSummary | null = null;
	let currentItem: RppItemSummary | null = null;
	let inSource = false;

	const finishItem = () => {
		if (currentItem && currentTrack) {
			currentTrack.items.push(currentItem);
			summary.itemCount++;
			for (const s of currentItem.sources) {
				if (!summary.sourceFiles.includes(s)) summary.sourceFiles.push(s);
			}
		}
		currentItem = null;
		inSource = false;
	};
	const finishTrack = () => {
		finishItem();
		if (currentTrack) {
			summary.tracks.push(currentTrack);
			summary.trackCount++;
			for (const f of currentTrack.fx) {
				if (!summary.fx.includes(f)) summary.fx.push(f);
			}
		}
		currentTrack = null;
	};

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;

		if (line === ">") {
			const closed = stack.pop();
			if (closed === "ITEM") finishItem();
			else if (closed === "TRACK") finishTrack();
			else if (closed === "SOURCE") inSource = false;
			continue;
		}

		if (line.startsWith("<")) {
			const { token, args } = splitTokens(line.slice(1));
			const tag = token.toUpperCase();
			stack.push(tag);
			if (tag === "REAPER_PROJECT") {
				// <REAPER_PROJECT 0.1 "7.02/win64" 1700000000
				summary.appVersion = args.find((a) => a.includes("/")) ?? null;
			} else if (tag === "TRACK") {
				finishTrack();
				currentTrack = { name: "Untitled", items: [], fx: [] };
			} else if (tag === "ITEM") {
				finishItem();
				currentItem = { name: null, position: null, length: null, sources: [] };
			} else if (tag === "SOURCE") {
				inSource = true;
			} else if (
				(tag === "VST" ||
					tag === "VST3" ||
					tag === "AU" ||
					tag === "JS" ||
					tag === "DX") &&
				currentTrack &&
				args[0]
			) {
				// Plugin chunks open inline: <VST "VST3i: Serum (Xfer)" ...>
				const name = stripPluginPrefix(args[0]);
				if (name && !currentTrack.fx.includes(name)) currentTrack.fx.push(name);
			}
			continue;
		}

		const { token, args } = splitTokens(line);
		const t = token.toUpperCase();

		if (t === "TEMPO" && summary.tempo === null && stack.length <= 2) {
			const bpm = Number(args[0]);
			if (Number.isFinite(bpm) && bpm > 20 && bpm < 300) summary.tempo = bpm;
			if (args[1] && args[2]) summary.timeSignature = `${args[1]}/${args[2]}`;
		} else if (t === "NAME" && args[0] !== undefined) {
			if (currentItem && stack.includes("ITEM")) currentItem.name = args[0];
			else if (currentTrack && !currentItem) currentTrack.name = args[0];
		} else if (t === "POSITION" && currentItem && args[0] !== undefined) {
			const v = Number(args[0]);
			if (Number.isFinite(v)) currentItem.position = v;
		} else if (t === "LENGTH" && currentItem && args[0] !== undefined) {
			const v = Number(args[0]);
			if (Number.isFinite(v)) currentItem.length = v;
		} else if (
			t === "FILE" &&
			inSource &&
			currentItem &&
			args[0] !== undefined
		) {
			const base = basename(args[0]);
			if (base && !currentItem.sources.includes(base)) {
				currentItem.sources.push(base);
			}
		} else if (
			(t === "VST" || t === "VST3" || t === "AU" || t === "JS" || t === "DX") &&
			currentTrack &&
			args[0]
		) {
			const name = stripPluginPrefix(args[0]);
			if (name && !currentTrack.fx.includes(name)) currentTrack.fx.push(name);
		} else if (t === "MARKER" && args.length >= 2) {
			summary.markers.push({
				id: numOrNull(args[0]),
				position: numOrNull(args[1]),
				end: null,
				name: args[2] ?? "",
				isRegion: false,
			});
		} else if (t === "REGION" && args.length >= 3) {
			summary.markers.push({
				id: numOrNull(args[0]),
				position: numOrNull(args[1]),
				end: numOrNull(args[2]),
				name: args[3] ?? "",
				isRegion: true,
			});
		}
	}
	finishTrack();
	return summary;
}

/** Splits `TOKEN arg "quoted arg" 1.5` into token + args (quotes unescaped). */
function splitTokens(line: string): { token: string; args: string[] } {
	const args: string[] = [];
	const re = /"((?:[^"\\]|\\.)*)"|(\S+)/g;
	let m: RegExpExecArray | null;
	let first = true;
	let token = "";
	// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
	while ((m = re.exec(line)) !== null) {
		const value =
			m[1] !== undefined
				? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
				: (m[2] ?? "");
		if (first) {
			token = value;
			first = false;
		} else {
			args.push(value);
		}
		if (m[0].length === 0) re.lastIndex++;
	}
	return { token, args };
}

function basename(p: string): string {
	const clean = p.replace(/^file:/i, "");
	const parts = clean.split(/[\\/]/);
	return parts[parts.length - 1] || p;
}

function stripPluginPrefix(raw: string): string {
	// VST lines look like: VST "VST3i: Serum (Xfer)" Serum.vst3 0 "" ...
	return raw
		.replace(/^(VST3?[ie]:|AU[ie]:|JSi?:|DX[ie]?:)\s*/i, "")
		.replace(/\s*\(.+\)\s*$/, "")
		.trim();
}

function numOrNull(raw: string | undefined): number | null {
	if (raw === undefined) return null;
	const v = Number(raw);
	return Number.isFinite(v) ? v : null;
}

export function convertRppToJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.2, "Reading REAPER project chunks...");
	const summary = parseRpp(new Uint8Array(input));
	onProgress?.(0.75, "Summarising tracks, items and markers...");
	const json = `${JSON.stringify(summary, null, 2)}\n`;
	onProgress?.(1.0, "Complete");
	return new TextEncoder().encode(json).buffer as ArrayBuffer;
}
