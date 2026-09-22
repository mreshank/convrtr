import type { Tool } from "../../types";

export const djiToCsv: Tool = {
	id: "document/dji-to-csv",
	slug: "dji-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["text/plain", "application/octet-stream"],
		ext: ["srt"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:dji-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Full Flight Log",
				explanation:
					"Reads every telemetry cue (bracket and legacy model families) into a union-column CSV — GPS, altitude, camera settings, timestamps. No field is dropped silently.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title: "DJI SRT to CSV — Drone Telemetry to Flight Log | convrtr",
		h1: "Convert DJI SRT Telemetry to CSV",
		intent:
			"Turn a DJI drone's SRT telemetry sidecar into a CSV flight log — GPS track, altitude, camera settings per frame — for mapping, GPX pipelines, surveys and flight analysis. Handles Mini/Mavic/Air bracket format and legacy Mavic/Phantom format. Entirely in your browser.",
		faq: [
			{
				q: "Where is the .srt file?",
				a: "Enable video captions/subtitles in your DJI app (or keep the default) — the drone records a same-named .srt next to each video with per-frame telemetry instead of captions.",
			},
			{
				q: "Which drones are supported?",
				a: "Both telemetry families: the [bracket] format (Mini 3, Air 2S, Mavic 3 and newer) and the legacy HOME()/GPS() format (Mavic Pro, Phantom and older). Columns are the union of all fields found, so mixed fleets work.",
			},
			{
				q: "What do I do with the CSV?",
				a: "Plot the GPS track in Google Earth/QGIS, build GPX tracks, analyse altitude and speed, or join camera settings to frames for photogrammetry QC.",
			},
			{
				q: "Is my flight location data uploaded anywhere?",
				a: "No — flight paths are sensitive. Parsing runs entirely inside your browser.",
			},
		],
		related: [
			"document/gpx-to-geojson",
			"document/fit-to-csv",
			"document/tcx-to-geojson",
		],
	},
};
