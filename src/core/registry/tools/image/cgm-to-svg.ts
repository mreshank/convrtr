import type { Tool } from "../../types";

export const cgmToSvg: Tool = {
	id: "image/cgm-to-svg",
	slug: "cgm-to-svg",
	category: "image",
	kind: "convert",
	accept: {
		mime: [
			"image/cgm",
			"image/x-cgm",
			"application/cgm",
			"application/x-cgm",
			"application/octet-stream",
		],
		ext: ["cgm"],
	},
	output: { ext: "svg", mime: "image/svg+xml" },
	engines: ["extract:cgm-to-svg"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Scalable Vector Graphics (SVG)",
				explanation:
					"Translates ISO/IEC 8632 Computer Graphics Metafile (.cgm) technical vector diagrams, aerospace blueprints, and engineering schematics into clean, standard SVG.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"CGM to SVG — Convert Computer Graphics Metafile (.cgm) to Scalable SVG | convrtr",
		h1: "Convert Computer Graphics Metafile (CGM) to SVG",
		intent:
			"Convert ISO/IEC 8632 Computer Graphics Metafile (.cgm) engineering schematics, aerospace technical illustrations, and CAD blueprints into clean W3C standard SVG vectors directly in your browser. 100% client-side with zero data uploads.",
		faq: [
			{
				q: "What is a Computer Graphics Metafile (.cgm) file?",
				a: "CGM is an international ISO/IEC 8632 standard vector and bitmap format developed for technical illustrations, CAD archives, electronic technical manuals, and aerospace documentation (such as ATA Spec 2100 and WebCGM).",
			},
			{
				q: "Why convert CGM to SVG?",
				a: "Modern web browsers, operating systems, and vector design tools (like Figma and Adobe Illustrator) do not natively render CGM files. Converting to SVG transforms legacy technical drawings into modern, resolution-independent vector graphics.",
			},
			{
				q: "Are both binary and clear-text CGM formats supported?",
				a: "Yes! convrtr supports both binary-encoded CGM commands and clear-text CGM directives, accurately reconstructing polylines, polygons, rectangles, circles, and line styles.",
			},
			{
				q: "Are my proprietary engineering schematics uploaded to any server?",
				a: "Never. All CGM parsing and vector synthesis execute entirely within your browser memory using pure client-side TypeScript. Your sensitive diagrams and CAD assets never leave your device.",
			},
		],
		related: [
			"document/dxf-to-svg",
			"image/wmf-to-svg",
			"image/studio3-to-svg",
		],
	},
};
