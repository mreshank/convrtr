import type { QualityPreset, Tool } from "@/core/registry";

export type ParamValue = number | string | boolean;

export type QualityState = {
	preset: QualityPreset;
	params: Record<string, ParamValue>;
};

function advancedDefaults(tool: Tool): Record<string, ParamValue> {
	const out: Record<string, ParamValue> = {};
	for (const param of tool.quality.advanced) {
		if (param.control === "timerange") {
			// Two keys, and a default that depends on a file nothing has loaded
			// yet. Zero for both means "from the beginning, to the end", which
			// the engine reads as the whole file — so an untouched control is
			// the identity operation rather than an empty selection.
			out[param.startKey] = 0;
			out[param.endKey] = 0;
			continue;
		}
		if (param.control === "timestamp") {
			// The first frame, which is the one someone wants often enough to be
			// a sensible default and is always valid whatever the file's length.
			out[param.key] = 0;
			continue;
		}
		out[param.key] = param.default;
	}
	return out;
}

function presetParams(
	tool: Tool,
	preset: QualityPreset,
): Record<string, ParamValue> {
	return tool.quality.presets.find((p) => p.id === preset)?.params ?? {};
}

export function applyPreset(tool: Tool, preset: QualityPreset): QualityState {
	return {
		preset,
		params: { ...advancedDefaults(tool), ...presetParams(tool, preset) },
	};
}

export function initialQuality(tool: Tool): QualityState {
	return applyPreset(tool, tool.quality.defaultPreset);
}

function matchesPreset(
	tool: Tool,
	preset: QualityPreset,
	params: Record<string, ParamValue>,
): boolean {
	const candidate = {
		...advancedDefaults(tool),
		...presetParams(tool, preset),
	};
	const keys = new Set([...Object.keys(candidate), ...Object.keys(params)]);
	for (const key of keys) if (candidate[key] !== params[key]) return false;
	return true;
}

export function setParam(
	tool: Tool,
	state: QualityState,
	key: string,
	value: ParamValue,
): QualityState {
	const params = { ...state.params, [key]: value };
	const match = tool.quality.presets.find((p) =>
		matchesPreset(tool, p.id, params),
	);
	return { preset: match?.id ?? "custom", params };
}

/**
 * What kind of conversion this is, as a closed set rather than a sentence.
 *
 * Spec §4.5 encodes fidelity as stroke pattern — solid means nothing was
 * given up, dashed means something was — and that is a *categorical* claim,
 * so it has to be driven by a categorical answer. The 0-100 figure from
 * `fidelityScore` cannot stand in for it at any threshold: `balanced` JPEG
 * declares quality 78, and a threshold that calls 78 intact would draw a
 * solid ring over a DCT-quantised image on the site's most-used conversion.
 *
 * `describeFidelity` is the human-readable rendering of this same answer, so
 * the ring and the label can never disagree.
 */
export type FidelityState =
	| "lossless"
	| "visually-lossless"
	| "lossy"
	| "inherently-lossy";

export function fidelityState(tool: Tool, state: QualityState): FidelityState {
	// Checked first, and unconditionally: a tool whose encoder has no
	// lossless path cannot be talked into one by a preset name or a quality
	// of 100, so no later branch is allowed to overrule this.
	if (!tool.quality.losslessAvailable) return "inherently-lossy";
	if (state.params.lossless === 1 || state.params.lossless === true)
		return "lossless";
	if (state.preset === "visually-lossless") return "visually-lossless";
	return "lossy";
}

export function describeFidelity(tool: Tool, state: QualityState): string {
	switch (fidelityState(tool, state)) {
		case "inherently-lossy":
			return "INHERENTLY LOSSY";
		case "lossless":
			return "LOSSLESS";
		case "visually-lossless":
			return "VISUALLY LOSSLESS";
		default: {
			const quality = state.params.quality;
			return typeof quality === "number" ? `LOSSY · Q${quality}` : "LOSSY";
		}
	}
}

/**
 * A 0-100 losslessness figure for the current quality state, meant to drive
 * a plain visual indicator (a fidelity ring) rather than to be read as a
 * measured quality metric.
 *
 * This is a *declared* figure — it comes straight from the preset/parameter
 * values the user chose, not from comparing output pixels to input pixels.
 * Spec §5.9 anticipates swapping this for a measured perceptual score
 * (SSIM/butteraugli) once an engine can produce one; callers take a plain
 * number precisely so that swap needs no UI change.
 */
export function fidelityScore(tool: Tool, state: QualityState): number {
	// A tool that cannot be lossless must never score 100, whatever its params
	// happen to say. Without this, a format like GIF — where `describeFidelity`
	// correctly reports INHERENTLY LOSSY — could still render a full ring, and
	// the two indicators would contradict each other on the same screen.
	const ceiling = tool.quality.losslessAvailable ? 100 : 99;

	if (
		tool.quality.losslessAvailable &&
		(state.params.lossless === 1 || state.params.lossless === true)
	) {
		return 100;
	}

	const quality = state.params.quality;
	if (typeof quality === "number") {
		return Math.min(ceiling, Math.max(0, quality));
	}
	return Math.min(ceiling, 50);
}
