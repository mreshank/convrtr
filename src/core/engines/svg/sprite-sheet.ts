import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Builds an SVG symbol sprite sheet from several SVG images.
 *
 * The classic "sprite sheet" rounds every image into one raster — a loss the
 * inputs do not deserve. SVG's native sprite sheet is the `<symbol>` element:
 * each source becomes a symbol holding its original vector markup
 * byte-for-byte, and consumers reference it with `<use>`. Refactoring the
 * files into one sprite sheet therefore loses nothing at all, which is the
 * exact opposite of the raster approach.
 *
 * The ZIP carries three files:
 *
 *   sprite.svg  — <svg> with one <symbol> per input, referenced by
 *                 <use href="sprite.svg#icon-1"> from the page.
 *   sprites.css — per-symbol size classes. Sizes come from each source's
 *                 viewBox, because that is what the markup actually draws.
 *   demo.html   — a working page showing the symbols in use, so arrival at
 *                 "how do I put these on a page?" is a paste away, not a
 *                 mystery.
 *
 * Fidelity: lossless. The symbols are the sources' markup, not a
 * re-render. The only cost is the <use> indirection.
 */
const SYMBOL_NS = "http://www.w3.org/2000/svg";

/**
 * Pulls the viewBox "0 0 w h" out of a source <svg> root.
 *
 * A symbol without dimensions still works through <use> (it inherits the
 * contextual font-size and fill), but the sheet is far more useful when every
 * icon has a known size. The viewBox is honoured when present, width/height
 * are honoured when viewBox is absent, and a missing pair of both degenerates
 * to a generic box rather than failing the whole sheet — an icon you cannot
 * spell is worse than one sized 1x1.
 */
function viewBoxOf(svg: string): string {
	const match = svg.match(/viewBox\s*=\s*["']([0-9. ]+)["']/i);
	if (match) {
		const parts = (match[1] ?? "").trim().split(/[ ]+/);
		if (parts.length === 4) return parts.join(" ");
	}

	const width = svg.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
	const height = svg.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
	if (width && height && width[1] && height[1])
		return `0 0 ${width[1]} ${height[1]}`;
	return "0 0 24 24";
}

/**
 * Extracts the inner markup of one source <svg> wrap, for embedding inside a
 * <symbol>. Outer namespace is preserved by the symbol root; stray
 * xmlns-to-same-namespace duplicates on nested elements are harmless and
 * untouched.
 */
function symbolBody(svg: string): string {
	const match = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
	if (!match) {
		throw new Error(
			"sprite sheet: input did not contain an <svg> element — is it really an SVG?",
		);
	}
	return match[1] ?? "";
}

/**
 * One lambda of the sheet as it will appear in the CSS.
 */
function cssForSymbol(index: number, viewBox: string): string {
	const [, , w = "24", h = "24"] = viewBox.split(/[ ]+/);
	return `.icon-${index} {\n\twidth: ${w}px;\n\theight: ${h}px;\n}\n`;
}

const DEMO = (ids: number[]): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sprite sheet preview</title>
<style>
  body { font: 16px/1.5 sans-serif; margin: 40px; }
  .tile { display: inline-flex; flex-direction: column; align-items: center; margin: 0 24px 24px 0; }
  .tile svg { display: block; }
  .tile code { margin-top: 8px; font-size: 12px; }
  .icon { display: block; }
</style>
</head>
<body>
<h1>Generated sprite sheet</h1>
<p>Each icon is one <code>&lt;symbol&gt;</code> in <code>sprite.svg</code>. Reference it from the page
with <code>&lt;svg class="icon icon-1"&gt;&lt;use href="sprite.svg#icon-1"/&gt;&lt;/svg&gt;</code>.</p>

${ids
	.map(
		(i) => `<div class="tile">
  <svg class="icon icon-${i}"><use href="sprite.svg#icon-${i}"/></svg>
  <code>#icon-${i}</code>
</div>`,
	)
	.join("\n")}
</body>
</html>
`;

/**
 * Builds a symbol sprite sheet from an unbounded number of SVGs, via the
 * combining engine path. The run() single-input path is refused explicitly —
 * there is nothing to combine with one file, and silently echoing a lone symbol
 * would suggest a sheet happened.
 */
export const svgSpriteSheetEngine: Engine = {
	id: "svg:sprite-sheet",

	async probe() {
		// Pure text processing — no WASM, no canvas, no platform APIs.
		return true;
	},

	async run(input: ArrayBuffer) {
		void input;
		throw new Error(
			"A sprite sheet needs at least two SVGs. Add another file to combine.",
		);
	},

	async runMany(
		inputs: ArrayBuffer[],
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		if (inputs.length < 2) {
			throw new Error(
				"A sprite sheet needs at least two SVGs. Add another file to combine.",
			);
		}

		const decoder = new TextDecoder();
		const symbols: string[] = [];
		let css = "";
		const ids: number[] = [];

		for (const [index, input] of inputs.entries()) {
			onProgress(0.1 + (0.8 * index) / inputs.length, "BUILD");
			const source = decoder.decode(input);
			const viewBox = viewBoxOf(source);
			const body = symbolBody(source);
			const symbolIndex = index + 1;
			symbols.push(
				`<symbol id="icon-${symbolIndex}" viewBox="${viewBox}">${body}</symbol>`,
			);
			css += cssForSymbol(symbolIndex, viewBox);
			ids.push(symbolIndex);
		}

		onProgress(0.92, "BUILD");
		const sprite = `<svg xmlns="${SYMBOL_NS}" style="display:none">${symbols.join("")}</svg>`;

		onProgress(0.95, "PACKAGE");
		const { zipSync } = await import("fflate");
		const encoder = new TextEncoder();
		const files: Record<string, Uint8Array> = {
			"sprite.svg": encoder.encode(sprite),
			"sprites.css": encoder.encode(`.icon {\n\tdisplay: block;\n}\n${css}`),
			"demo.html": encoder.encode(DEMO(ids)),
		};
		const zipped = zipSync(files, { level: 6 });

		onProgress(1, "PACKAGE");
		return zipped.buffer as ArrayBuffer;
	},
};
