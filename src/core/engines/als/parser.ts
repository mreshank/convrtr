import * as fflate from "fflate";

export interface AlsTrackSummary {
	name: string;
	type: "audio" | "midi" | "return" | "master" | "unknown";
	devices: string[];
	sampleRefs: string[];
}

export interface AlsProjectSummary {
	format: "ableton-live-set";
	abletonVersion: string | null;
	tempo: number | null;
	timeSignature: string | null;
	trackCount: number;
	tracks: AlsTrackSummary[];
	devices: string[];
	sampleRefs: string[];
	note: string;
}

/**
 * Parses an Ableton Live Set (.als) into a structured project summary.
 *
 * An .als file is a gzip-compressed XML document describing tempo, tracks,
 * devices/plugins and referenced sample files — no audio is stored inside.
 * This extracts the story of the track (arrangement metadata) so heirs,
 * collaborators, archivists, or DAW-migrants can inventory a project without
 * owning Ableton Live. Pure client-side: fflate gunzip + tolerant regex
 * extraction that degrades gracefully across Live 8–12 schema drift.
 */
export function parseAls(fileBytes: Uint8Array): AlsProjectSummary {
	const xml = readAlsXml(fileBytes);

	const abletonVersion = firstAttr(xml, /Creator="Ableton Live ([^"]+)"/);

	const tempo = readTempo(xml);
	const timeSignature = readTimeSignature(xml);
	const tracks = readTracks(xml);

	const deviceSet: string[] = [];
	const sampleSet: string[] = [];
	for (const t of tracks) {
		for (const d of t.devices) if (!deviceSet.includes(d)) deviceSet.push(d);
		for (const s of t.sampleRefs) if (!sampleSet.includes(s)) sampleSet.push(s);
	}

	return {
		format: "ableton-live-set",
		abletonVersion,
		tempo,
		timeSignature,
		trackCount: tracks.length,
		tracks,
		devices: deviceSet,
		sampleRefs: sampleSet,
		note: "Structural inventory only: tempo, tracks, devices and referenced sample file names. No audio is embedded in .als files, so stems cannot be recovered from the project file alone — use this list to locate the samples on disk.",
	};
}

function readAlsXml(fileBytes: Uint8Array): string {
	if (fileBytes.length < 4) {
		throw new Error("Invalid Ableton file: file is smaller than 4 bytes.");
	}
	let xmlBytes: Uint8Array;
	if (fileBytes[0] === 0x1f && fileBytes[1] === 0x8b) {
		try {
			xmlBytes = fflate.gunzipSync(fileBytes);
		} catch (err) {
			throw new Error(
				`Failed to decompress Ableton gzip payload: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	} else if (fileBytes[0] === 0x3c) {
		// Rare: uncompressed XML (some third-party writers emit it raw).
		xmlBytes = fileBytes;
	} else {
		throw new Error(
			"Invalid Ableton file: expected gzip magic (1F 8B) or raw XML (<).",
		);
	}
	const xml = new TextDecoder("utf-8").decode(xmlBytes);
	if (!xml.includes("<Ableton") && !xml.includes("<LiveSet")) {
		throw new Error(
			"Not an Ableton Live Set: decompressed payload contains no <Ableton>/<LiveSet> document.",
		);
	}
	return xml;
}

function firstAttr(xml: string, re: RegExp): string | null {
	const m = re.exec(xml);
	return m?.[1] ?? null;
}

function readTempo(xml: string): number | null {
	// Preferred: the manual tempo value in the master chain.
	const tempoBlock = /<Tempo>[\s\S]*?<\/Tempo>/.exec(xml)?.[0];
	const sources = [
		tempoBlock ? /<Manual\s+Value="([\d.]+)"/.exec(tempoBlock)?.[1] : undefined,
		/<Tempo>[\s\S]{0,2000}?<FloatEvent[^>]*Value="([\d.]+)"/.exec(xml)?.[1],
		/<EffectiveTempo\s+Value="([\d.]+)"/.exec(xml)?.[1],
	];
	for (const raw of sources) {
		if (raw !== undefined) {
			const v = Number.parseFloat(raw);
			if (Number.isFinite(v) && v > 20 && v < 300) return v;
		}
	}
	return null;
}

function readTimeSignature(xml: string): string | null {
	const m =
		/<TimeSignature>[\s\S]{0,3000}?Numerator\s+Value="(\d+)"[\s\S]{0,500}?Denominator\s+Value="(\d+)"/.exec(
			xml,
		) ??
		/<SignatureNumerator\s+Value="(\d+)"[\s\S]{0,500}?<SignatureDenominator\s+Value="(\d+)"/.exec(
			xml,
		);
	if (m?.[1] && m?.[2]) return `${m[1]}/${m[2]}`;
	return null;
}

function readTracks(xml: string): AlsTrackSummary[] {
	const tracks: AlsTrackSummary[] = [];
	const trackRe =
		/<(AudioTrack|MidiTrack|ReturnTrack|MasterTrack)\b[^>]*>([\s\S]*?)<\/\1>/g;
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
	while ((m = trackRe.exec(xml)) !== null) {
		const kind = m[1] ?? "";
		const body = m[2] ?? "";
		const type =
			kind === "AudioTrack"
				? "audio"
				: kind === "MidiTrack"
					? "midi"
					: kind === "ReturnTrack"
						? "return"
						: kind === "MasterTrack"
							? "master"
							: "unknown";

		const name =
			/<EffectiveName\s+Value="([^"]*)"/.exec(body)?.[1] ||
			/<UserName\s+Value="([^"]*)"/.exec(body)?.[1] ||
			(type === "master" ? "Master" : "Untitled");

		const devices = collectOrderedUnique([
			...matchAll(body, /<PluginName\s+Value="([^"]+)"/g),
			...matchAll(
				body,
				/<(?:VstPluginInfo|AuPluginInfo|MaxDeviceInfo)[\s\S]{0,800}?<Name\s+Value="([^"]+)"/g,
			),
			...matchAll(
				body,
				/<(?:AudioEffectGroupDevice|MidiEffectGroupDevice|InstrumentGroupDevice)[^>]*>[\s\S]{0,400}?<UserName\s+Value="([^"]+)"/g,
			),
		]);

		const sampleRefs = collectOrderedUnique([
			...matchAll(body, /<FileRef>[\s\S]{0,1200}?<Path\s+Value="([^"]+)"/g).map(
				basename,
			),
			...matchAll(body, /<SampleRef>[\s\S]{0,1200}?<Name\s+Value="([^"]+)"/g),
		]);

		tracks.push({ name, type, devices, sampleRefs });
	}
	return tracks;
}

function matchAll(body: string, re: RegExp): string[] {
	const out: string[] = [];
	const r = new RegExp(
		re.source,
		re.flags.includes("g") ? re.flags : `${re.flags}g`,
	);
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: streaming regex scan
	while ((m = r.exec(body)) !== null) {
		if (m[1]) out.push(decodeXmlEntities(m[1]));
		if (m[0].length === 0) r.lastIndex++;
	}
	return out;
}

function collectOrderedUnique(values: string[]): string[] {
	const out: string[] = [];
	for (const v of values) {
		const t = v.trim();
		if (t && !out.includes(t)) out.push(t);
	}
	return out;
}

function basename(p: string): string {
	const parts = p.split(/[\\/]/);
	return parts[parts.length - 1] || p;
}

function decodeXmlEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}

export function convertAlsToJson(
	input: ArrayBuffer,
	onProgress?: (ratio: number, phase: string) => void,
): ArrayBuffer {
	onProgress?.(0.15, "Decompressing Live Set...");
	const bytes = new Uint8Array(input);
	const summary = parseAls(bytes);

	onProgress?.(0.75, "Summarising tracks, devices and samples...");
	const json = `${JSON.stringify(summary, null, 2)}\n`;
	onProgress?.(1.0, "Complete");

	return new TextEncoder().encode(json).buffer as ArrayBuffer;
}
