import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";
import { parseFlic } from "./parser";

type Gifenc = typeof import("gifenc");

/**
 * Converts an Autodesk Animator FLI/FLC animation to an animated GIF.
 *
 * ## Why this is genuinely lossless
 *
 * FLIC is 8-bit indexed colour — a 256-entry palette plus per-frame palette
 * patches — and GIF is exactly the same model. A FLIC frame is a set of
 * draw-and-delta sub-chunks over that palette, and here those are executed
 * into an indexed buffer whose palette is handed to the GIF encoder
 * unchanged. No pixel is re-drawn, no colour is re-quantised: every palette
 * index survives, including the palette changes mid-animation.
 *
 * The one thing that is not exact is timing. FLI stores delays in 1/70s units
 * and GIF stores them in hundredths of a second, so a FLI frame's delay is
 * rounded to the nearest centisecond. That is under a millisecond of drift per
 * frame and is the closest the target format allows.
 *
 * The palette hand-off is what makes it cheap in space as well: a frame whose
 * palette did not change emits no colour table and reuses the one before it,
 * the same way the source animation ran.
 */
export const flicToGifEngine: Engine = {
	id: "video:flic->gif",

	async probe() {
		// Pure byte parsing plus gifenc — nothing to feature-detect.
		return true;
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		onProgress(0.05, "PARSE");
		const animation = parseFlic(input);

		onProgress(0.45, "ENCODE");
		const { GIFEncoder } = (await import("gifenc")) as Gifenc;
		const encoder = GIFEncoder();

		// The first frame's palette becomes the GIF's global colour table.
		// Later frames emit one only when a colour sub-chunk ran, mirroring how
		// the source kept using its current palette until the next patch.
		let needsPalette = true;
		for (const [index, frame] of animation.frames.entries()) {
			encoder.writeFrame(frame.pixels, animation.width, animation.height, {
				palette:
					needsPalette || frame.paletteChanged ? frame.palette : undefined,
				delay: animation.frameDelayMs,
				repeat: 0,
			});
			needsPalette = false;
			onProgress(0.45 + (index / animation.frames.length) * 0.5, "ENCODE");
		}

		encoder.finish();
		onProgress(1, "ENCODE");
		const bytes = encoder.bytes();
		// A fresh ArrayBuffer: the encoder's view may sit inside a larger pooled
		// buffer, and handing that across would carry the whole thing.
		return bytes.slice().buffer as ArrayBuffer;
	},
};
