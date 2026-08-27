import type { ParamValue } from "@/core/quality";
import type { ImageEncoder } from "./types";

/** Outcome of a target-size search, including whether the target was met. */
export interface TargetSizeResult {
	output: ArrayBuffer;
	/** The quality value the search settled on. */
	quality: number;
	/** False when even the lowest quality could not reach the target. */
	achieved: boolean;
	/** How many encodes the search performed. */
	attempts: number;
}

/** Quality is bounded 1-100; below 1 the encoders reject the value outright. */
const MIN_QUALITY = 1;
const MAX_QUALITY = 100;

/**
 * `log2(100)` is ~6.6, so seven halvings resolve the whole range to a single
 * quality point. Each attempt is a full encode, so this is a real time budget,
 * not a formality: on a large photo the difference between 7 and 20 attempts
 * is seconds of the user's life for a result they cannot perceive.
 */
const MAX_ATTEMPTS = 7;

/**
 * Finds the highest quality whose encoded output fits within `targetBytes`.
 *
 * Binary search rather than stepping down from 100: image encoders are not
 * remotely linear in quality-to-size, so a linear walk either overshoots
 * badly or takes dozens of encodes. Seven encodes resolve the entire 1-100
 * range.
 *
 * The search is deliberately conservative — it keeps the best result that is
 * *under* the target rather than the closest one overall. A file that misses
 * an upload limit by 3 KB is useless, so being slightly smaller than asked is
 * always the right side to err on.
 *
 * When even quality 1 overshoots, this returns that smallest attempt with
 * `achieved: false` rather than throwing. The caller still gets the best file
 * obtainable, and can tell the user plainly that the target was unreachable —
 * silently handing back an oversized file as though it had succeeded is the
 * failure mode this exists to avoid.
 */
export async function encodeToTargetSize(
	encoder: ImageEncoder,
	image: ImageData,
	params: Record<string, ParamValue>,
	targetBytes: number,
	onAttempt?: (attempt: number, quality: number, size: number) => void,
): Promise<TargetSizeResult> {
	if (targetBytes <= 0) {
		throw new Error(
			`encodeToTargetSize: target must be positive, got ${targetBytes}`,
		);
	}

	let low = MIN_QUALITY;
	let high = MAX_QUALITY;
	let best: { output: ArrayBuffer; quality: number } | undefined;
	let smallest: { output: ArrayBuffer; quality: number } | undefined;
	let attempts = 0;

	while (low <= high && attempts < MAX_ATTEMPTS) {
		const quality = Math.floor((low + high) / 2);
		const output = await encoder.encode(image, {
			...params,
			quality,
			// A target-size request is inherently a lossy one; leaving a lossless
			// flag set would make every attempt the same size and the search
			// meaningless.
			lossless: 0,
		});
		attempts += 1;
		onAttempt?.(attempts, quality, output.byteLength);

		if (!smallest || output.byteLength < smallest.output.byteLength) {
			smallest = { output, quality };
		}

		if (output.byteLength <= targetBytes) {
			// Fits — record it and try for better quality.
			if (!best || quality > best.quality) best = { output, quality };
			low = quality + 1;
		} else {
			high = quality - 1;
		}
	}

	if (best) {
		return { ...best, achieved: true, attempts };
	}

	if (!smallest) {
		throw new Error("encodeToTargetSize: search produced no encode attempts");
	}
	return { ...smallest, achieved: false, attempts };
}
