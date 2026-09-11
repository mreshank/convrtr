import type { Tool } from "../../types";

export const fitToCsv: Tool = {
	id: "document/fit-to-csv",
	slug: "fit-to-csv",
	category: "document",
	kind: "convert",
	accept: {
		mime: [
			"application/vnd.ant.fit",
			"application/x-fit",
			"application/fit",
			"application/octet-stream",
		],
		ext: ["fit"],
	},
	output: { ext: "csv", mime: "text/csv" },
	engines: ["extract:fit-to-csv"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Universal Excel / Sheets CSV",
				explanation:
					"Decodes binary FIT activity recordings (GPS trackpoints, timestamps, elevation, heart rate, cadence, power, speed, temperature) and formats them into an RFC 4180 CSV table with UTF-8 BOM encoding for seamless analysis in Microsoft Excel, Google Sheets, Python pandas, and R.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"FIT to CSV — Convert Garmin & Strava FIT Activity Files to Excel Online | convrtr",
		h1: "Convert FIT Activity to CSV Spreadsheet",
		intent:
			"Convert Garmin Edge, Forerunner, Wahoo ELEMNT, and Strava FIT activity recordings into clean, structured CSV spreadsheets for Microsoft Excel, Google Sheets, and sports analytics directly in your browser. 100% private with zero server uploads.",
		faq: [
			{
				q: "Which devices and apps produce .fit files?",
				a: "The FIT (Flexible and Interoperable Data Transfer) protocol is the standard binary format created by Dynastream/ANT+ and used by Garmin (Edge, Forerunner, Fenix), Wahoo Fitness (ELEMNT, BOLT), Hammerhead Karoo, Bryton, Coros, Zwift, TrainerRoad, and Strava.",
			},
			{
				q: "What metrics are extracted into the CSV spreadsheet?",
				a: "Every recorded trackpoint is decoded into a dedicated row containing: ISO 8601 Timestamp, Latitude (degrees), Longitude (degrees), Altitude (meters), Cumulative Distance (meters), Heart Rate (BPM), Cadence (RPM), Power (Watts), Speed (km/h), and Temperature (°C).",
			},
			{
				q: "How does convrtr handle dropped or missing sensor data?",
				a: "In the FIT specification, unrecorded or missing sensor values are flagged with maximum sentinel integers (such as 0xFF or 0xFFFF). convrtr automatically filters out these sentinels and outputs clean, blank CSV cells rather than corrupting your graphs with unrealistic spikes.",
			},
			{
				q: "Is my personal GPS and biometric training data private?",
				a: "Yes. Fitness and GPS tracking files reveal exact home locations, daily routines, and physiological metrics. convrtr processes your FIT file completely in-memory inside your browser client. No GPS coordinates or activity data are ever transmitted to any cloud or third-party server.",
			},
		],
		related: ["document/vcf-to-csv", "document/xmind-to-markdown"],
	},
};
