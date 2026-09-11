import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { convertGmlToGeoJson } from "./parser";

export * from "./parser";
export * from "./types";

/**
 * GML (Geography Markup Language) to GeoJSON conversion engine.
 * Converts OGC GML 2.x and 3.x XML spatial features, polygons, polylines,
 * and attributes into standard RFC 7946 GeoJSON client-side.
 */
export const gmlToGeoJsonEngine: Engine = {
	id: "extract:gml-to-geojson",

	async probe() {
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	): Promise<ArrayBuffer> {
		onProgress(0.1, "Reading GML XML stream");
		const result = convertGmlToGeoJson(input);
		onProgress(0.8, "Serializing RFC 7946 GeoJSON");
		const jsonString = JSON.stringify(result.geoJson, null, 2);
		const out = new TextEncoder().encode(jsonString);
		onProgress(1.0, "Conversion complete");
		return out.buffer.slice(
			out.byteOffset,
			out.byteOffset + out.byteLength,
		) as ArrayBuffer;
	},
};
