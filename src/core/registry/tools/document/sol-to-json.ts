import type { Tool } from "../../types";

export const solToJson: Tool = {
	id: "document/sol-to-json",
	slug: "sol-to-json",
	category: "document",
	kind: "extract",
	accept: {
		mime: ["application/octet-stream", "application/x-shockwave-flash"],
		ext: ["sol"],
	},
	output: { ext: "json", mime: "application/json" },
	engines: ["extract:sol-to-json"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "pretty",
		presets: [
			{
				id: "pretty",
				label: "Indented JSON",
				explanation:
					"Formats all Flash SharedObject variables into human-readable, 2-space indented JSON for easy inspection and editing.",
				params: { pretty: true },
			},
			{
				id: "compact",
				label: "Compact JSON",
				explanation:
					"Outputs minified JSON without whitespace for automated pipelines.",
				params: { pretty: false },
			},
		],
		advanced: [],
	},
	seo: {
		title: "SOL to JSON — Convert Flash Save Files to JSON | convrtr",
		h1: "Convert Flash SOL Save File to JSON",
		intent:
			"Convert Adobe Flash Local Shared Object (.sol) save game files and cookies to clean, editable JSON. Inspect game progress, recover save data, and edit Flash variables without command-line tools.",
		faq: [
			{
				q: "What is an Adobe Flash .sol file?",
				a: "A .sol file is a Flash Local Shared Object, commonly referred to as a Flash cookie. Flash web games and applications use it to store local persistent variables like high scores, inventory, and save states in AMF binary format.",
			},
			{
				q: "Can I use this to inspect Flashpoint or Ruffle game saves?",
				a: "Yes. Save files from Adobe Flash Player, Flashpoint Archive, Ruffle, and browser storage can all be unpacked into JSON.",
			},
			{
				q: "Which AMF data types are supported?",
				a: "Numbers (IEEE-754 floats), Booleans, Strings, Objects, ECMA Mixed Arrays, Strict Arrays, Dates, and nested properties are all parsed into standard JSON equivalents.",
			},
			{
				q: "Are my save files uploaded anywhere?",
				a: "No. The AMF decoder runs completely in your browser's client-side runtime.",
			},
		],
		related: [
			"document/als-to-json",
			"document/rpp-to-json",
			"document/xmind-to-markdown",
		],
	},
};
