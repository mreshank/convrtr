import type { ParamValue } from "@/core/quality";
import type { Engine } from "../../types";
import { IMAGE_ENCODERS } from "../registry";

/**
 * Splits an animated GIF into numbered PNG frames, returned as a ZIP.
 *
 * Uses the platform's own `ImageDecoder` (WebCodecs) rather than a bundled GIF
 * parser: the browser already ships a hardened, well-tested GIF decoder, so
 * pulling in a JavaScript reimplementation would add weight and a second
 * source of bugs for no gain.
 *
 * Naming hazard worth knowing about: the global `ImageDecoder` used here is
 * the platform class and is unrelated to this codebase's own `ImageDecoder`
 * interface in `../types`. They are deliberately not imported into the same
 * scope. If that ever becomes necessary, alias one of them.
 *
 * Availability is narrower than the rest of the image pack — `ImageDecoder`
 * is absent in Firefox at time of writing — so `probe()` feature-detects and
 * the engine simply will not be selected there, rather than failing mid-run.
 */

type PlatformImageDecoder = {
	new (init: {
		data: ArrayBuffer | Uint8Array;
		type: string;
	}): {
		completed: Promise<void>;
		tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } };
		decode(options: { frameIndex: number }): Promise<{ image: VideoFrame }>;
		close(): void;
	};
	isTypeSupported(type: string): Promise<boolean>;
};

function platformDecoder(): PlatformImageDecoder | undefined {
	return (globalThis as { ImageDecoder?: PlatformImageDecoder }).ImageDecoder;
}

/**
 * A hard ceiling on frames written.
 *
 * A long GIF can hold thousands of frames, and each becomes a full PNG — a
 * 500-frame animation at 800x600 is well over a gigabyte of output. Refusing
 * past a limit is kinder than producing a ZIP the browser cannot hold, and
 * the cap is surfaced rather than silently truncating: a user who receives 300
 * of 900 frames with no warning has been given a broken result.
 */
const MAX_FRAMES = 300;

async function frameToImageData(frame: VideoFrame): Promise<ImageData> {
	const canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("gif-frames: could not obtain a 2D context");
	}
	context.drawImage(frame, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

export const gifFramesEngine: Engine = {
	id: "image:gif-frames-pack",

	async probe() {
		const Decoder = platformDecoder();
		if (!Decoder) return false;
		try {
			return await Decoder.isTypeSupported("image/gif");
		} catch {
			return false;
		}
	},

	async run(
		input: ArrayBuffer,
		_params: Record<string, ParamValue>,
		onProgress: (ratio: number, phase: string) => void,
	) {
		const Decoder = platformDecoder();
		if (!Decoder) {
			throw new Error(
				"gif-frames: this browser has no ImageDecoder. Chrome, Edge and Safari 17+ support it; Firefox does not yet.",
			);
		}
		const encoder = IMAGE_ENCODERS.get("png");
		if (!encoder) {
			throw new Error("gif-frames: png encoder is not registered");
		}

		onProgress(0.05, "DECODE");
		const decoder = new Decoder({ data: input, type: "image/gif" });

		const files: Record<string, Uint8Array> = {};
		let written = 0;
		let total = 0;

		try {
			await decoder.tracks.ready;
			total = decoder.tracks.selectedTrack?.frameCount ?? 0;
			if (total === 0) {
				throw new Error(
					"gif-frames: no frames found — is this actually an animated GIF?",
				);
			}

			const limit = Math.min(total, MAX_FRAMES);
			// Pad so frame files sort correctly in a file manager: frame-2 would
			// otherwise sort after frame-10.
			const width = String(limit).length;

			for (let index = 0; index < limit; index += 1) {
				onProgress(0.1 + (0.8 * index) / limit, "DECODE");
				const { image } = await decoder.decode({ frameIndex: index });
				try {
					const pixels = await frameToImageData(image);
					const png = await encoder.encode(pixels, { optimise: false });
					const name = `frame-${String(index + 1).padStart(width, "0")}.png`;
					files[name] = new Uint8Array(png);
					written += 1;
				} finally {
					// VideoFrames hold real decoder resources; leaking them across a
					// few hundred iterations will exhaust the pool.
					image.close();
				}
			}
		} finally {
			decoder.close();
		}

		// Say so plainly when frames were dropped. Handing back 300 of 900
		// frames silently would be a broken result presented as a success.
		if (total > written) {
			files["TRUNCATED.txt"] = new TextEncoder().encode(
				`This GIF has ${total} frames. Only the first ${written} were extracted, because ` +
					`each frame becomes a full PNG and a longer animation produces more data than a ` +
					`browser can hold in one archive.\n`,
			);
		}

		onProgress(0.95, "PACKAGE");
		const { zipSync } = await import("fflate");
		// PNGs are already compressed; deflating again costs CPU for nothing.
		const zipped = zipSync(files, { level: 0 });
		onProgress(1, "PACKAGE");
		return zipped.buffer as ArrayBuffer;
	},
};
