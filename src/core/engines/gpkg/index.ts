import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGpkgToGeoJson } from "./parser";

export * from "./parser";

/**
 * OGC GeoPackage (.gpkg) to GeoJSON engine.
 * Reads feature tables through shared sql.js, decodes GeoPackageBinary +
 * WKB with srs cross-checks, and emits an RFC 7946 FeatureCollection.
 */
export const gpkgToGeoJsonEngine: Engine = {
	id: "extract:gpkg-to-geojson",

	async probe() {
		return true; // sql.js loads on demand; placement decides, not support
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		return convertGpkgToGeoJson(input, onProgress);
	},
};
