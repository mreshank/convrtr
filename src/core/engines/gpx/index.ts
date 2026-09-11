import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGpxToGeoJson } from "./parser";

/**
 * GPX to GeoJSON conversion engine.
 * Converts GPS Exchange Format (.gpx) tracks, routes, and waypoints into standard RFC 7946 GeoJSON.
 */
export const gpxToGeoJsonEngine: Engine = {
	id: "extract:gpx-to-geojson",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertGpxToGeoJson(input, onProgress);
	},
};

export { convertGpxToGeoJson, parseGpxToGeoJson } from "./parser";
