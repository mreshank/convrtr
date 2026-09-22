import type { Tool } from "../../types";

export const gpmfToCsv: Tool = {
	id: "document/gpmf-to-csv",
	slug: "gpmf-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/octet-stream"],
		ext: ["bin"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:gpmf-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full GPS Track",
				explanation:
					"Walks DEVC/STRM boxes and scales every GPS5 fix by its SCAL denominators into an exact CSV track. No fix dropped, no rounding beyond display.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "GPMF to CSV — GoPro Telemetry to GPS Track | convrtr",
		h1: "Convert GoPro GPMF Telemetry to CSV",
		intent:
			"Turn GoPro GPMF telemetry (.bin) into a CSV GPS track — latitude, longitude, altitude, 2D/3D speed per fix — for mapping, GPX pipelines and flight analysis. SCAL-scaled exactly, entirely in your browser, nothing uploaded.",
		faq: [
			{
				q: "Where is the .bin file?",
				a: "GoPro Labs firmware and telemetry extractors save the GPMF stream as a .bin sidecar. (DJI drones instead write .srt sidecars — see dji-to-csv for those.)",
			},
			{
				q: "What about accelerometer and gyroscope data?",
				a: "Out of scope for this tool: it takes the GPS track (the mapping input). ACCL/GYRO/MAGN streams ride in the same boxes and a future tool can take them.",
			},
			{
				q: "How accurate are the coordinates?",
				a: "Exact per the file: int32 fixes divided by their SCAL denominators with no extra rounding — what the GPS chip recorded is what the CSV holds.",
			},
			{
				q: "Is my location data uploaded anywhere?",
				a: "No — GPS tracks are sensitive. Parsing runs entirely inside your browser.",
			},
		],
		related: [
			"document/dji-to-csv",
			"document/gpx-to-geojson",
			"document/fit-to-csv",
		],
	},
};
