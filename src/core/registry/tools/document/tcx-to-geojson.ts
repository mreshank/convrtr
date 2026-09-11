import type { Tool } from "../../types";

export const tcxToGeoJson: Tool = {
	id: "document/tcx-to-geojson",
	slug: "tcx-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.garmin.tcx+xml",
			"application/x-tcx+xml",
			"application/xml",
			"text/xml",
			"application/octet-stream",
		],
		ext: ["tcx"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:tcx-to-geojson"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard GeoJSON (RFC 7946)",
				explanation:
					"Converts Garmin Training Center XML (.tcx) activity tracks, laps, heart rate, cadence, and power telemetry into RFC 7946 GeoJSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"TCX to GeoJSON — Convert Garmin Training Center (.tcx) to GeoJSON | convrtr",
		h1: "Convert Garmin TCX to GeoJSON",
		intent:
			"Convert Garmin Training Center XML (.tcx) activities and courses from Garmin Connect, Strava, and Wahoo into standard RFC 7946 GeoJSON in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a Garmin TCX file?",
				a: "TCX (Training Center XML) is Garmin's fitness exchange format. Unlike generic GPS formats, TCX structures outdoor workouts into distinct laps, sports (Biking, Running), and records rich biometric telemetry including heart rate (BPM), pedaling cadence (RPM), cycling power (Watts), and course points.",
			},
			{
				q: "How does TCX differ from GPX and FIT?",
				a: "GPX focuses primarily on raw latitude, longitude, and elevation waypoints and tracks. FIT is a binary compressed format used on modern Garmin head units. TCX is a human-readable XML format specifically designed for athletic workout analysis and training intervals.",
			},
			{
				q: "What telemetry is preserved in the GeoJSON?",
				a: "convrtr preserves 3D coordinates [longitude, latitude, elevation], workout lap splits, heart rates, cadences, power wattage, speeds, and timestamps directly in standard GeoJSON geometries and coordinateProperties arrays.",
			},
			{
				q: "Is my personal fitness or GPS location data uploaded to any server?",
				a: "Never. All XML parsing, telemetry aggregation, and GeoJSON synthesis are executed entirely client-side in your browser memory. Your sensitive coordinates never leave your device.",
			},
		],
		related: [
			"document/gpx-to-geojson",
			"document/kml-to-geojson",
			"document/fit-to-csv",
		],
	},
};
