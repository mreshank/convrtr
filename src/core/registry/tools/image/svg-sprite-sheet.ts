import type { Tool } from "../../types";

export const svgSpriteSheet: Tool = {
	id: "image/svg-sprite-sheet",
	slug: "svg-sprite-sheet",
	category: "image",
	kind: "generate",
	accept: { mime: ["image/svg+xml", "text/xml"], ext: ["svg"] },
	output: { ext: "zip", mime: "application/zip" },
	engines: ["svg:sprite-sheet"],
	// Several SVGs in, one sprite sheet out — so dropping many files must not
	// run the per-file batch path.
	combinesInputs: true,
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Lossless",
				explanation:
					"Each source's vector markup is lifted into a <symbol> unchanged — no raster pass, no re-render, nothing re-encoded.",
				params: {},
			},
		],
		advanced: [],
	},
	seo: {
		title:
			"SVG sprite sheet — combine SVGs into one sprite.svg + CSS | convrtr",
		h1: "Build an SVG sprite sheet",
		intent:
			'Drop several SVG icons and get back a single sprite.svg where every file lives as a <symbol>, plus a CSS file with the size class for each one and a demo page showing them in use. No canvas pass, no rasterisation, no loss — each symbol keeps the exact vector markup it was given. Runs entirely in the browser; nothing is uploaded. Reference any icon on your page with <svg class="icon icon-2"><use href="sprite.svg#icon-2"/></svg>.',
		faq: [
			{
				q: "Is this lossless?",
				a: "Yes. The classic sprite-sheet workflow flattens every image into one grid of pixels, which throws away the very thing SVG is for. This tool instead lifts each file's markup unaltered into a <symbol>, so the vectors, gradients and filters you drew are byte-for-byte what comes out.",
			},
			{
				q: "What is in the ZIP?",
				a: "Three files: sprite.svg (the sheet, with one symbol per input in the order you added them), sprites.css (an .icon base rule plus a size class per symbol derived from each file's viewBox), and demo.html (a working page that references the sheet and shows every icon).",
			},
			{
				q: "How do I use a symbol on a page?",
				a: 'Load the sheet once in your HTML, then reference any icon with <svg class="icon icon-1"><use href="sprite.svg#icon-1"/></svg>. The size classes in sprites.css set the width and height from the source viewBox so icons render at the size they were drawn.',
			},
			{
				q: "Why does the sheet include display:none on the sprite root?",
				a: "A sprite sheet is a library, not a glyph on the page. Keeping the root hidden means the symbols define content without the sheet itself painting anything; each icon only appears where you put a <use>.",
			},
		],
		related: ["image/optimise-svg", "image/svgz-to-svg", "image/wmf-to-svg"],
	},
};
