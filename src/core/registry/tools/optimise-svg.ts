import type { Tool } from "../types";

export const optimiseSvg: Tool = {
	id: "image/optimise-svg",
	slug: "optimise-svg",
	category: "image",
	kind: "compress",
	accept: { mime: ["image/svg+xml", "text/xml"], ext: ["svg"] },
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["svg:optimise"],
	quality: {
		losslessAvailable: false,
		defaultPreset: "visually-lossless",
		presets: [
			{
				id: "visually-lossless",
				label: "Visually lossless",
				explanation:
					"Removes editor cruft and redundant markup. Coordinates keep enough precision that nothing shifts.",
				params: { floatPrecision: 3, multipass: true, cleanupIds: false },
			},
			{
				id: "balanced",
				label: "Balanced",
				explanation:
					"Rounds coordinates harder. Fine for icons; can nudge hairlines in detailed artwork.",
				params: { floatPrecision: 2, multipass: true, cleanupIds: false },
			},
			{
				id: "smallest",
				label: "Smallest",
				explanation:
					"Aggressive rounding and id renaming. Check the result — external CSS or JS referencing an id will break.",
				params: { floatPrecision: 1, multipass: true, cleanupIds: true },
			},
		],
		advanced: [
			{
				control: "stepper",
				key: "floatPrecision",
				label: "Coordinate precision",
				group: "Geometry",
				min: 0,
				max: 8,
				step: 1,
				default: 3,
			},
			{
				control: "toggle",
				key: "multipass",
				label: "Multiple passes",
				group: "Optimiser",
				default: true,
			},
			{
				control: "toggle",
				key: "cleanupIds",
				label: "Shorten and remove unused ids",
				group: "Optimiser",
				default: false,
			},
		],
	},
	seo: {
		title: "Optimise an SVG — smaller files, same drawing | convrtr",
		h1: "Optimise an SVG",
		intent:
			"SVGs exported from design tools carry a lot of dead weight: editor metadata, comments, redundant groups, and coordinates written to six decimal places. This strips that out with SVGO and hands back a smaller file that draws the same. It runs in your browser, so the file is never uploaded.",
		faq: [
			{
				q: "Is optimising an SVG lossless?",
				a: "Removing comments, metadata and redundant markup is. Rounding coordinates is not — that is a real trade, which is why precision is a control rather than a hidden default. At 3 decimal places nothing visibly moves; at 1, hairlines and tight joins in detailed artwork can shift slightly.",
			},
			{
				q: "Why do you keep the viewBox when SVGO removes it by default?",
				a: "Because removing it breaks responsive scaling, which is the main reason to use SVG on the web in the first place. It is deliberately overridden here.",
			},
			{
				q: "Why are ids kept by default?",
				a: "An id may be targeted by CSS or JavaScript elsewhere in your project, or by a <use> element in another file. Renaming ids saves bytes and silently breaks those references, so it is opt-in — available on the Smallest preset and as a switch.",
			},
			{
				q: "Does it remove anything sensitive?",
				a: "Editor metadata often contains the authoring tool's name and sometimes the full filesystem path of the source document. Both go.",
			},
		],
		related: [
			"image/png-to-webp",
			"image/favicon-generator",
			"image/compress-jpg",
		],
	},
};
