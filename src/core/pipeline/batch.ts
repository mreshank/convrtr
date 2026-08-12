import { outputFilename, readFile } from "@/core/io";
import type { ParamValue } from "@/core/quality";
import { JobError, runJob } from "./client";
import { resolveConcurrency, runPool } from "./pool";
import type { ErrorCode } from "./protocol";

export type BatchItem = { id: string; file: File };

export type BatchOutcome =
	| {
			id: string;
			status: "done";
			output: ArrayBuffer;
			outputName: string;
			inputSize: number;
			outputSize: number;
	  }
	| { id: string; status: "error"; code: ErrorCode; message: string }
	| { id: string; status: "cancelled" };

/** Per-item events, so a caller can render one progress row per file. */
export type BatchItemEvent =
	| { id: string; type: "progress"; ratio: number; phase: string }
	| { id: string; type: "done" }
	| { id: string; type: "error"; code: ErrorCode; message: string }
	| { id: string; type: "cancelled" };

/**
 * What `runItem` (see below) is given for a single item. Deliberately a
 * narrow slice of `BatchConfig` — the runner only needs the job's engine
 * list and params, not concurrency or the injection seam itself.
 */
export type BatchJobConfig = {
	engines: string[];
	params: Record<string, ParamValue>;
};

/**
 * Runs a single item end to end and reports its own progress through
 * `onProgress`. This is the seam `BatchConfig.runItem` injects into: the
 * default (`defaultRunner`, below) reads the file and hands it to the real
 * `runJob` worker-per-job client; tests substitute a fake with no real
 * `File.arrayBuffer()`/`Worker` involved, so timing and failures are fully
 * controllable. A later task testing the real end-to-end path can call
 * `runBatch` with no `runItem` override at all and get the production
 * behavior.
 */
export type BatchItemRunner = (
	item: BatchItem,
	config: BatchJobConfig,
	onProgress: (ratio: number, phase: string) => void,
	signal: AbortSignal,
) => Promise<{ output: ArrayBuffer; inputSize: number }>;

export type BatchConfig = BatchJobConfig & {
	/** Extension (no leading dot) applied to each item's output filename. */
	outputExt: string;
	/** Overrides the computed concurrency cap. Mainly for tests. */
	concurrency?: number;
	/** Overrides `navigator.hardwareConcurrency` when computing the cap. */
	hardwareConcurrency?: number;
	/**
	 * Injection seam: see `BatchItemRunner`. Defaults to `defaultRunner`,
	 * which performs the real `readFile` + `runJob` conversion.
	 */
	runItem?: BatchItemRunner;
};

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

const defaultRunner: BatchItemRunner = async (
	item,
	config,
	onProgress,
	signal,
) => {
	const input = await readFile(item.file);
	const output = await runJob(
		{ id: item.id, engines: config.engines, params: config.params, input },
		(event) => {
			if (event.type === "progress") onProgress(event.ratio, event.phase);
		},
		signal,
	);
	return { output, inputSize: input.byteLength };
};

function defaultHardwareConcurrency(): number | undefined {
	return typeof navigator === "undefined"
		? undefined
		: navigator.hardwareConcurrency;
}

/**
 * Runs `items` through `config.runItem` (or the real conversion path by
 * default) with bounded concurrency, reporting per-item progress through
 * `onItemEvent`.
 *
 * Cancellation: `signal` is shared across the whole batch — there is no
 * per-item signal. Aborting it stops any item that hasn't started yet from
 * ever starting (it settles as `"cancelled"` without invoking `runItem`)
 * and propagates into in-flight items via the same signal, which `runJob`
 * already honors by tearing down that item's worker. Items that had already
 * reached `"done"` or `"error"` before the abort keep those outcomes
 * untouched — a user who cancels 80 files into a batch of 100 still gets
 * outcomes for those 80.
 *
 * The returned array's order always matches `items`, regardless of the
 * order tasks actually finish in, so a caller can zip outcomes back against
 * the original file list without re-sorting.
 */
export async function runBatch(
	items: BatchItem[],
	config: BatchConfig,
	onItemEvent: (event: BatchItemEvent) => void,
	signal: AbortSignal,
): Promise<BatchOutcome[]> {
	const runItem = config.runItem ?? defaultRunner;
	const concurrency =
		config.concurrency ??
		resolveConcurrency(
			config.hardwareConcurrency ?? defaultHardwareConcurrency(),
		);

	const tasks = items.map((item) => async (): Promise<BatchOutcome> => {
		if (signal.aborted) {
			onItemEvent({ id: item.id, type: "cancelled" });
			return { id: item.id, status: "cancelled" };
		}

		try {
			const result = await runItem(
				item,
				{ engines: config.engines, params: config.params },
				(ratio, phase) =>
					onItemEvent({ id: item.id, type: "progress", ratio, phase }),
				signal,
			);
			onItemEvent({ id: item.id, type: "done" });
			return {
				id: item.id,
				status: "done",
				output: result.output,
				outputName: outputFilename(item.file.name, config.outputExt),
				inputSize: result.inputSize,
				outputSize: result.output.byteLength,
			};
		} catch (error) {
			if (isAbortError(error)) {
				onItemEvent({ id: item.id, type: "cancelled" });
				return { id: item.id, status: "cancelled" };
			}
			const code = error instanceof JobError ? error.code : "ENGINE_FAILURE";
			const message =
				error instanceof Error ? error.message : "Unknown failure";
			onItemEvent({ id: item.id, type: "error", code, message });
			return { id: item.id, status: "error", code, message };
		}
	});

	const settled = await runPool(tasks, concurrency);

	return settled.map((outcome, index) => {
		if (outcome.status === "fulfilled") return outcome.value;
		// Every task above catches internally and resolves rather than
		// rejects, so this is unreachable in practice; kept only so the
		// pool's generic (and intentionally reject-tolerant) contract doesn't
		// leave a hole in this function's own return type.
		const item = items[index];
		const message =
			outcome.reason instanceof Error
				? outcome.reason.message
				: "Unknown failure";
		if (!item) {
			// Fail loudly rather than fabricating an outcome with an empty id.
			// Callers key UI rows off `id`, so a blank one would silently
			// collide with any other blank and collapse several files into one
			// row — losing a user's converted output without saying so. If the
			// pool ever returns more outcomes than it was given tasks, that is
			// a bug worth surfacing, not papering over.
			throw new Error(
				`runBatch: pool returned outcome ${index} with no matching input item`,
			);
		}
		return {
			id: item.id,
			status: "error",
			code: "ENGINE_FAILURE",
			message,
		};
	});
}
