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

export function setParam(
	tool: Tool,
	state: QualityState,
	key: string,
	value: ParamValue,
): QualityState {
	const params = { ...state.params, [key]: value };
	const baseline = {
		...advancedDefaults(tool),
		...presetParams(tool, state.preset),
	};
	const deviates = Object.keys(params).some((k) => params[k] !== baseline[k]);
	return { preset: deviates ? "custom" : state.preset, params };
}

export function describeFidelity(tool: Tool, state: QualityState): string {
	if (!tool.quality.losslessAvailable) return "INHERENTLY LOSSY";
	if (state.params.lossless === 1 || state.params.lossless === true)
		return "LOSSLESS";
	if (state.preset === "visually-lossless") return "VISUALLY LOSSLESS";
	const quality = state.params.quality;
	return typeof quality === "number" ? `LOSSY · Q${quality}` : "LOSSY";
}
