import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertOsmToGeoJson } from "./parser";

/**
 * OpenStreetMap XML (.osm) to GeoJSON conversion engine.
 * Parses points, ways, highways, buildings, and multipolygon boundaries
 * into standard RFC 7946 GeoJSON FeatureCollections in-browser.
 */
export const osmToGeoJsonEngine: Engine = {
	id: "extract:osm-to-geojson",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		const out = await convertOsmToGeoJson(input, onProgress);
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
