import type { ParamValue } from "@/core/quality";
import type { Engine } from "../../types";
import { getDecoderFor, IMAGE_ENCODERS } from "../registry";
import { resizeTransform } from "../transforms/resize";

/**
 * The icon set a site actually needs, and why each one is here rather than
 * shipping the usual scattergun of fifteen sizes:
 *
 *   16 / 32   — classic favicon sizes, still what desktop browsers request
 *               for tabs and bookmarks.
 *   180       — apple-touch-icon. iOS ignores the manifest and looks for this.
 *   192 / 512 — the two sizes the web app manifest specification calls for;
 *               512 is what Android uses for the splash screen.
 *
 * Older guides recommend a dozen more (57, 60, 72, 76, 114, 120, 144...) for
 * long-obsolete iOS versions. Emitting them makes the download larger and the
 * HTML noisier for no practical gain, so they are deliberately omitted.
 */
const SIZES = [16, 32, 180, 192, 512] as const;

function nameFor(size: number): string {
	if (size === 180) return "apple-touch-icon.png";
	return `icon-${size}.png`;
}

/**
 * The HTML that actually needs to go in <head>, shipped alongside the icons.
 *
 * Generating the images without telling someone how to reference them leaves
 * the job half done — this is the part people most often get wrong.
 */
const HTML_SNIPPET = `<link rel="icon" href="/icon-32.png" sizes="32x32">
<link rel="icon" href="/icon-16.png" sizes="16x16">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
`;

const MANIFEST = `{
	"icons": [
		{ "src": "/icon-192.png", "type": "image/png", "sizes": "192x192" },
		{ "src": "/icon-512.png", "type": "image/png", "sizes": "512x512" }
	]
}
`;

/**
 * Produces a full icon set as a ZIP.
 *
 * `Engine` is bytes-in/bytes-out, which at first looks like it cannot express
 * a one-to-many operation. A ZIP is the natural resolution: the tool stays an
 * ordinary conversion as far as the pipeline, the batch runner and the save
 * path are concerned, with no special-casing anywhere upstream.
 *
 * Every size is resampled from the original with Lanczos3 rather than by
 * scaling one intermediate down repeatedly, which would compound resampling
 * error and leave the small icons noticeably mushier.
 */
export const faviconPackEngine: Engine = {
	id: "image:favicon-pack",

	async probe() {
		return typeof WebAssembly === "object";
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const mime = String(params.inputMime ?? "image/png");
		const decoder = getDecoderFor(mime);
		if (!decoder) {
			throw new Error(`favicon pack: no decoder for "${mime}"`);
		}
		const encoder = IMAGE_ENCODERS.get("png");
		if (!encoder) {
			throw new Error("favicon pack: png encoder is not registered");
		}

		onProgress(0.05, "DECODE");
		const source = await decoder.decode(input);

		const files: Record<string, Uint8Array> = {};
		for (const [index, size] of SIZES.entries()) {
			onProgress(0.1 + (0.8 * index) / SIZES.length, "RESIZE");
			// Always resample from the original, never from a previous step.
			const resized = await resizeTransform.apply(source, {
				width: size,
				height: size,
				fitMethod: "contain",
				method: "lanczos3",
			});
			const png = await encoder.encode(resized, { optimise: true });
			files[nameFor(size)] = new Uint8Array(png);
		}

		files["site.webmanifest"] = new TextEncoder().encode(MANIFEST);
		files["head-snippet.html"] = new TextEncoder().encode(HTML_SNIPPET);

		onProgress(0.95, "PACKAGE");
		const { zipSync } = await import("fflate");
		// PNGs are already compressed; deflating them again costs CPU for
		// roughly nothing, so everything is stored.
		const zipped = zipSync(files, { level: 0 });

		onProgress(1, "PACKAGE");
		return zipped.buffer as ArrayBuffer;
	},
};
