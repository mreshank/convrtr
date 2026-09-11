import type { Tool } from "../../types";

export const gpxToGeoJson: Tool = {
	id: "document/gpx-to-geojson",
	slug: "gpx-to-geojson",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/gpx+xml",
			"application/x-gpx+xml",
			"application/xml",
			"text/xml",
			"application/octet-stream",
		],
		ext: ["gpx"],
	},
	output: { ext: "geojson", mime: "application/geo+json" },
	engines: ["extract:gpx-to-geojson"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Standard GeoJSON (RFC 7946)",
				explanation:
					"Converts GPS Exchange Format (.gpx) waypoints, routes, and multi-segment tracks with elevation, distance, and heart rate telemetry into RFC 7946 GeoJSON.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"GPX to GeoJSON — Convert GPS Tracks & Waypoints to GeoJSON | convrtr",
		h1: "Convert GPX to GeoJSON",
		intent:
			"Convert GPS Exchange Format (.gpx) activities from Garmin, Strava, Komoot, and Apple Watch into clean, standard RFC 7946 GeoJSON in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "What is a GPX file?",
				a: "GPX (GPS Exchange Format) is an XML schema designed for exchanging GPS data including waypoints, planned routes, and recorded trackpoints between GPS receivers and fitness software.",
			},
			{
				q: "Why convert GPX to GeoJSON?",
				a: "GeoJSON is the universal JSON-based geospatial standard used by modern web mapping frameworks including Mapbox, Leaflet, OpenLayers, Kepler.gl, and QGIS.",
			},
			{
				q: "Does this tool preserve track elevation and workout telemetry?",
				a: "Yes! Waypoint coordinates, elevation profiles, timestamps, calculated distances, elevation gains, and heart rate extensions are preserved in standard GeoJSON geometries and feature properties.",
			},
			{
				q: "Is my personal location and fitness data uploaded to any server?",
				a: "Never. All parsing and conversion are executed entirely client-side in your browser memory. Your coordinates never leave your device.",
			},
		],
		related: ["document/fit-to-csv", "document/xmind-to-markdown"],
	},
};
