import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Optimises an SVG with SVGO.
 *
 * Note the import path: `svgo/browser`, not `svgo`. The package's default
 * entry is its Node build, which reaches for `fs` and `path` and cannot
 * resolve inside a browser worker bundle. That mistake cost hours elsewhere
 * in this codebase (see docs/DEPLOY.md on libheif-js), so it is worth being
 * explicit: the browser entry is the only correct one here.
 *
 * On fidelity: SVGO's default plugin set is conservative about rendering but
 * not literally lossless — it removes comments, metadata and editor cruft,
 * merges paths, and collapses redundant groups. The one genuinely risky knob
 * is coordinate precision, which is exposed rather than hidden because
 * rounding geometry is exactly the kind of change that looks free until it
 * visibly shifts a hairline or a join.
 */
export const svgOptimiseEngine: Engine = {
	id: "svg:optimise",

	async probe() {
		// Pure JS — no WASM, no platform APIs.
		return true;
	},

	async run(
		input: ArrayBuffer,
		params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.1, "PARSE");
		const source = new TextDecoder().decode(input);

		if (!source.includes("<svg")) {
			throw new Error(
				"svg optimise: input does not contain an <svg> element — is it really an SVG?",
			);
		}

		const { optimize } = await import("svgo/browser");

		const precision = Number(params.floatPrecision ?? 3);
		const multipass = params.multipass !== false;

		onProgress(0.4, "OPTIMISE");
		const result = optimize(source, {
			multipass,
			floatPrecision: precision,
			plugins: [
				{
					name: "preset-default",
					params: {
						overrides: {
							// Keeping viewBox is not optional in practice: removing it
							// breaks responsive scaling, which is the main reason
							// anyone uses SVG on the web. SVGO's default removes it.
							removeViewBox: false,
							// IDs are frequently referenced from external CSS, JS, or
							// by <use> in another document. Renaming them shrinks the
							// file and silently breaks those references, so this is
							// off unless explicitly asked for. The override takes a
							// params object or `false` — never a bare boolean.
							cleanupIds: params.cleanupIds === true ? {} : false,
						},
					},
				},
			],
		});

		onProgress(1, "OPTIMISE");
		const bytes = new TextEncoder().encode(result.data);
		return bytes.buffer as ArrayBuffer;
	},
};
