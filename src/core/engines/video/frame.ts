import type { ParamValue } from "@/core/quality";
import { pngEncoder } from "../image/encoders/png";
import type { Engine } from "../types";

/**
 * Extracts a single frame from a video as a PNG.
 *
 * The fidelity claim here is narrower than elsewhere and worth stating
 * precisely: the PNG is an exact record of the frame as decoded, but the frame
 * itself came out of a lossy codec. Nothing further is lost — PNG is lossless,
 * and the pixels are written as the decoder produced them — yet this cannot
 * recover detail the video never had. Calling that "lossless" without
 * qualification would be the kind of half-true claim this project exists to
 * avoid, so the tool says "exact copy of the frame" rather than "lossless
 * conversion".
 *
 * Unlike trimming, this genuinely has to decode: a still image cannot be made
 * out of a copied inter-frame packet, which is only meaningful relative to
 * frames around it. The decode is one frame, though — the seek lands on the
 * preceding keyframe and decodes forward to the requested moment, rather than
 * walking the whole file.
 */

type Mediabunny = typeof import("mediabunny");

export function createFrameExtractionEngine(container: string): Engine {
	return {
		id: `frame:${container}`,

		async probe() {
			// A real decode, so this needs WebCodecs — and OffscreenCanvas,
			// because the engine runs in a worker where there is no DOM canvas to
			// draw into.
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
			onProgress(0.05, "DEMUX");

			const source = new lib.Input({
				source: new lib.BufferSource(input),
				formats: lib.ALL_FORMATS,
			});

			const track = await source.getPrimaryVideoTrack();
			if (!track) {
				throw new Error(
					"This file has no video track, so there is no frame to extract.",
				);
			}

			const requested = typeof params.time === "number" ? params.time : 0;
			onProgress(0.3, "DECODE");

			// CanvasSink hands back the frame already rasterised, which avoids
			// reimplementing YUV-to-RGB conversion — a step where a hand-rolled
			// version would be both slower and subtly wrong on anything but
			// BT.709.
			const sink = new lib.CanvasSink(track, { poolSize: 0 });
			const result = await sink.getCanvas(requested);
			if (!result) {
				throw new Error(
					"No frame was found at that point in the file. Try a moment inside the video's duration.",
				);
			}

			// The frame returned is the last one at or before the requested time,
			// so the moment delivered is usually a little earlier. At ordinary
			// frame rates that is under 40ms and not worth a message; a large gap
			// means a very low frame rate, which is worth knowing about.
			if (requested - result.timestamp > 0.25) {
				onNotice?.(
					`The nearest frame to that point starts at ${result.timestamp.toFixed(2)}s, so that is the one extracted — this video has few frames per second.`,
				);
			}

			const context = result.canvas.getContext("2d");
			if (!context) {
				throw new Error(
					"This browser would not provide a 2D drawing context, so the frame cannot be read out.",
				);
			}

			const pixels = (
				context as OffscreenCanvasRenderingContext2D
			).getImageData(0, 0, result.canvas.width, result.canvas.height);

			onProgress(0.7, "ENCODE");

			// The same PNG encoder every image tool uses, so a frame gets the
			// same lossless encode and optional oxipng recompression rather than
			// canvas.toBlob's take on it.
			const encoded = await pngEncoder.encode(pixels, params);
			onProgress(1, "ENCODE");
			return encoded;
		},
	};
}
