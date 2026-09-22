import type { Tool } from "../../types";

export const igcToGpx: Tool = {
	id: "document/igc-to-gpx",
	slug: "igc-to-gpx",
	category: "document",
	kind: "convert",
	accept: {
		mime: ["application/vnd.fai.igc", "text/plain", "application/octet-stream"],
		ext: ["igc"],
	},
	output: { ext: "gpx", mime: "application/gpx+xml" },
	engines: ["extract:igc-to-gpx"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "gpx",
		presets: [
			{
				id: "gpx",
				label: "GPX 1.1 GPS Track (.gpx)",
				explanation:
					"Standard GPX track with latitude, longitude, barometric and GNSS altitude, and UTC timestamps for Strava, Garmin, and GIS tools.",
				params: { kml: false },
			},
			{
				id: "kml",
				label: "Google Earth KML (.kml)",
				explanation:
					"3D LineString flight path with absolute altitudes and extruded styling for Google Earth visualization.",
				params: { kml: true },
			},
		],
		advanced: [],
	},
	seo: {
		title: "IGC to GPX — Convert Glider Flight Log to GPS Track | convrtr",
		h1: "Convert FAI IGC Flight Log to GPX and KML",
		intent:
			"Convert FAI International Gliding Commission (.igc) GNSS flight recorder logs into standard GPX 1.1 GPS tracks and Google Earth KML paths. View soaring, paragliding, and sailplane flights in Strava, Google Earth, and GIS tools.",
		faq: [
			{
				q: "What is an IGC file?",
				a: "An IGC file is a standardized flight log format defined by the FAI International Gliding Commission. It records cryptographic validation records and high-frequency GNSS coordinate fixes from certified flight recorders in gliders and paragliders.",
			},
			{
				q: "Can I import this GPX file into Strava or Garmin Connect?",
				a: "Yes. The generated GPX 1.1 document adheres strictly to schema specifications, including ISO-8601 UTC timestamps and meter-accurate altitudes.",
			},
			{
				q: "How are barometric and GNSS altitudes represented?",
				a: "GPX <ele> tags use GNSS elevation by default, with barometric pressure altitudes preserved in standard flight track metadata.",
			},
			{
				q: "Does this run without uploading flight logs?",
				a: "Yes. Parsing and coordinate transformation execute 100% client-side in your web browser.",
			},
		],
		related: [
			"document/gpx-to-geojson",
			"document/tcx-to-geojson",
			"document/kml-to-geojson",
		],
	},
};
