import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertTcxToGeoJson } from "./parser";

/**
 * Garmin Training Center XML (.tcx) to GeoJSON conversion engine.
 * Converts GPS activities, multi-lap tracks, heart rate, cadence, power,
 * and course points into standard RFC 7946 GeoJSON FeatureCollections in-browser.
 */
export const tcxToGeoJsonEngine: Engine = {
	id: "extract:tcx-to-geojson",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertTcxToGeoJson(input, onProgress);
	},
};
