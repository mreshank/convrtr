import { canStreamToDisk } from "./index";
import { shouldUseOpfs } from "./opfs";

/**
 * Decides, before any work starts, whether this device can handle this file.
 *
 * Without this a 3GB input is read straight into an ArrayBuffer and the tab
 * dies — no error, no explanation, just a crash the user cannot interpret and
 * would reasonably blame on the site. The error taxonomy already has
 * OUT_OF_MEMORY; the problem was that nothing raised it until it was too late
 * to say anything useful.
 *
 * Refusing early is not the pessimistic choice. Spending two minutes decoding
 * before failing is strictly worse than saying up front that it will not fit,
 * because the second option leaves the user able to do something about it.
 */

export type PreflightVerdict =
	| { ok: true; strategy: "memory" | "stream" }
	| { ok: false; reason: string; suggestion: string };

/**
 * A conversion needs the input resident, the decoded pixels, and the encoded
 * output — decoded RGBA is routinely several times the compressed size, so
 * peak usage is far above the file size alone. Three is a deliberately
 * conservative multiplier that has to hold on a phone, not just a laptop.
 */
const PEAK_MULTIPLIER = 3;

/**
 * `navigator.deviceMemory` is coarse (rounded to 0.25/0.5/1/2/4/8) and absent
 * in Safari and Firefox. When missing, assume 4GB: high enough not to refuse
 * ordinary work on a capable machine, low enough to still catch genuinely
 * absurd inputs.
 */
const ASSUMED_DEVICE_MEMORY_GB = 4;

/**
 * A tab never gets the whole machine. Browsers cap a single tab's heap well
 * below physical memory, and the OS, the browser itself and other tabs are
 * all competing — so budget a quarter and stay honest about it.
 */
const USABLE_FRACTION = 0.25;

function deviceMemoryGb(nav: Navigator = navigator): number {
	const reported = (nav as Navigator & { deviceMemory?: number }).deviceMemory;
	return typeof reported === "number" && reported > 0
		? reported
		: ASSUMED_DEVICE_MEMORY_GB;
}

export function memoryBudgetBytes(nav: Navigator = navigator): number {
	return deviceMemoryGb(nav) * 1024 * 1024 * 1024 * USABLE_FRACTION;
}

/**
 * @param fileSize   bytes of the input
 * @param canStream  whether output can be written to disk without buffering
 * @param budget     bytes this tab can reasonably use
 */
export function preflight(
	fileSize: number,
	canStream: boolean = canStreamToDisk(),
	budget: number = memoryBudgetBytes(),
): PreflightVerdict {
	if (fileSize <= 0) {
		return {
			ok: false,
			reason: "The file is empty.",
			suggestion: "Check the file opened correctly before converting it.",
		};
	}

	const projectedPeak = fileSize * PEAK_MULTIPLIER;

	if (projectedPeak <= budget) {
		return {
			ok: true,
			strategy: shouldUseOpfs(fileSize) ? "stream" : "memory",
		};
	}

	// Streaming to disk removes the output copy from the budget but not the
	// input or the decoded pixels, so it raises the ceiling without removing
	// it. Roughly two thirds of the peak remains.
	if (canStream && projectedPeak * 0.66 <= budget) {
		return { ok: true, strategy: "stream" };
	}

	const gb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;

	if (!canStream) {
		return {
			ok: false,
			reason: `This file is ${gb(fileSize)}, and this browser cannot write large files directly to disk.`,
			suggestion:
				"Chrome or Edge can stream the result straight to disk, which handles much larger files. Otherwise, split the file first.",
		};
	}

	return {
		ok: false,
		reason: `This file is ${gb(fileSize)}, which is beyond what this device can hold — a conversion needs roughly ${gb(projectedPeak)} at peak.`,
		suggestion:
			"Try a machine with more memory, or split the file into smaller pieces first.",
	};
}
