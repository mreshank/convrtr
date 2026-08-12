import type { QualityPreset, Tool } from "@/core/registry";

export type ParamValue = number | string | boolean;

export type QualityState = {
	preset: QualityPreset;
	params: Record<string, ParamValue>;
};

function advancedDefaults(tool: Tool): Record<string, ParamValue> {
	const out: Record<string, ParamValue> = {};
	for (const param of tool.quality.advanced) out[param.key] = param.default;
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

export function describeFidelity(tool: Tool, state: QualityState): string {
	if (!tool.quality.losslessAvailable) return "INHERENTLY LOSSY";
	if (state.params.lossless === 1 || state.params.lossless === true)
		return "LOSSLESS";
	if (state.preset === "visually-lossless") return "VISUALLY LOSSLESS";
	const quality = state.params.quality;
	return typeof quality === "number" ? `LOSSY · Q${quality}` : "LOSSY";
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
