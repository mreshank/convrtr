import type { ParamValue } from "@/core/quality";
import type { Engine } from "../types";

/**
 * Turns a section of a video into an animated GIF.
 *
 * This is the one tool in the video pack that cannot be honest about being
 * lossless, and it is worth being plain about why rather than burying it: GIF
 * holds at most 256 colours per frame, while the video it came from holds
 * millions. Every GIF is a heavy approximation. The interesting question is
 * therefore not whether quality is lost but how it is spent, which is what the
 * options here control.
 *
 * ## The palette decision
 *
 * The default builds one palette from pixels sampled across the whole clip and
 * uses it for every frame. The alternative — a fresh palette per frame — gives
 * each frame better colours in isolation but makes them disagree with each
 * other, so flat areas crawl and shimmer between frames in a way that is more
 * distracting than the colour error it fixes. It also costs a colour table per
 * frame. ffmpeg's `palettegen`/`paletteuse` pair works the same way for the
 * same reason, and per-frame remains available for clips where the subject
 * changes completely partway through.
 *
 * ## Why frame count is capped
 *
 * Frames are held as decoded pixels until the palette is built, because a
 * palette sampled from the whole clip cannot be computed until the whole clip
 * has been seen. At 480px wide that is roughly 1MB per frame, so a long clip
 * at a high frame rate will exhaust memory. Refusing up front with a specific
 * number beats dying halfway through.
 */

type Mediabunny = typeof import("mediabunny");

/**
 * A ceiling on decoded frames held at once.
 *
 * 300 frames at 480px wide is around 300MB of RGBA — high enough that no
 * reasonable GIF hits it (10 seconds at 15fps is 150) and low enough to stay
 * inside a phone's budget.
 */
const MAX_FRAMES = 300;

function clampNumber(
	value: ParamValue | undefined,
	fallback: number,
	min: number,
	max: number,
): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, value));
}

export function createGifEngine(container: string): Engine {
	return {
		id: `gif:${container}`,

		async probe() {
			return (
				typeof VideoDecoder !== "undefined" &&
				typeof OffscreenCanvas !== "undefined"
			);
		},

		async run(
			input: ArrayBuffer,
			params: Record<string, ParamValue>,
			onProgress: (ratio: number, phase: string) => void,
			onNotice?: (message: string) => void,
		) {
			const lib: Mediabunny = await import("mediabunny");
			onProgress(0.02, "DEMUX");

			const source = new lib.Input({
				source: new lib.BufferSource(input),
				formats: lib.ALL_FORMATS,
			});
			const track = await source.getPrimaryVideoTrack();
			if (!track) {
				throw new Error(
					"This file has no video track, so there is nothing to animate.",
				);
			}

			const duration = await source.computeDuration();
			const start = clampNumber(params.start, 0, 0, Math.max(0, duration));
			const rawEnd = clampNumber(params.end, duration, 0, duration);
			const end = rawEnd > start ? rawEnd : duration;
			const fps = clampNumber(params.fps, 12, 1, 50);
			const width = clampNumber(params.width, 480, 64, 1920);
			const maxColors = clampNumber(params.colors, 256, 2, 256);
			const perFramePalette = params.perFramePalette === true;

			const span = end - start;
			const frameCount = Math.max(1, Math.floor(span * fps));
			if (frameCount > MAX_FRAMES) {
				throw new Error(
					`That would need ${frameCount} frames, and ${MAX_FRAMES} is the most that fits in memory. Shorten the clip or lower the frame rate.`,
				);
			}

			// GIF stores frame delays in hundredths of a second, so most frame
			// rates cannot be represented exactly. Saying so beats letting
			// someone wonder why their 15fps GIF runs slightly slow.
			const delayCentiseconds = Math.max(2, Math.round(100 / fps));
			const effectiveFps = 100 / delayCentiseconds;
			if (Math.abs(effectiveFps - fps) > 0.5) {
				onNotice?.(
					`GIF stores frame delays in hundredths of a second, so ${fps} frames per second becomes ${effectiveFps.toFixed(1)}. The animation is the closest GIF can represent.`,
				);
			}

			// CanvasSink scales while decoding, so frames are never held at full
			// resolution only to be shrunk afterwards.
			const sink = new lib.CanvasSink(track, { width, poolSize: 0 });

			const frames: { data: Uint8ClampedArray; w: number; h: number }[] = [];
			for (let i = 0; i < frameCount; i++) {
				const at = start + i / fps;
				const result = await sink.getCanvas(at);
				if (!result) break;
				const context = result.canvas.getContext("2d");
				if (!context) {
					throw new Error(
						"This browser would not provide a 2D drawing context, so the frames cannot be read out.",
					);
				}
				const pixels = (
					context as OffscreenCanvasRenderingContext2D
				).getImageData(0, 0, result.canvas.width, result.canvas.height);
				frames.push({
					data: pixels.data,
					w: result.canvas.width,
					h: result.canvas.height,
				});
				onProgress(0.05 + (i / frameCount) * 0.55, "DECODE");
			}

			if (frames.length === 0) {
				throw new Error(
					"No frames were found in that part of the video. Try a different section.",
				);
			}

			onProgress(0.65, "ENCODE");
			const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
			const encoder = GIFEncoder();

			// One palette for the whole clip, built from pixels sampled evenly
			// across it so a late scene is represented as well as an early one.
			let globalPalette: number[][] | null = null;
			if (!perFramePalette) {
				const sampleCount = Math.min(frames.length, 12);
				const stride = Math.max(1, Math.floor(frames.length / sampleCount));
				const chosen: (typeof frames)[number][] = [];
				for (let i = 0; i < frames.length; i += stride) {
					const frame = frames[i];
					if (frame) chosen.push(frame);
				}

				// Copied into one buffer rather than spread into an array.
				// `push(...frame.data)` passes every pixel as a separate argument,
				// which is half a million arguments for a single 480px frame and
				// overflows the stack — it failed on the first real file, with
				// "Maximum call stack size exceeded" and no hint of where.
				const total = chosen.reduce((sum, frame) => sum + frame.data.length, 0);
				const sampled = new Uint8Array(total);
				let offset = 0;
				for (const frame of chosen) {
					sampled.set(frame.data, offset);
					offset += frame.data.length;
				}
				globalPalette = quantize(sampled, maxColors);
			}

			for (const [index, frame] of frames.entries()) {
				const palette =
					globalPalette ?? quantize(new Uint8Array(frame.data), maxColors);
				const indexed = applyPalette(new Uint8Array(frame.data), palette);
				encoder.writeFrame(indexed, frame.w, frame.h, {
					// The first frame's palette becomes the file's global colour
					// table, so with a shared palette later frames need none of
					// their own — which is most of the size saving.
					palette: globalPalette && index > 0 ? undefined : palette,
					delay: delayCentiseconds * 10,
					repeat: 0,
				});
				onProgress(0.65 + (index / frames.length) * 0.33, "ENCODE");
			}

			encoder.finish();
			const bytes = encoder.bytes();
			onProgress(1, "ENCODE");
			// A fresh ArrayBuffer: the encoder's view may sit inside a larger
			// pooled buffer, and handing that across would carry the whole thing.
			return bytes.slice().buffer as ArrayBuffer;
		},
	};
}
