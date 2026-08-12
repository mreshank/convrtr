/**
 * A generic bounded-concurrency task runner. `batch.ts` is the only current
 * caller, but nothing here knows about jobs, files, or the conversion
 * pipeline — it just runs async thunks with an upper bound on how many run
 * at once.
 */

/** A unit of work the pool runs. Takes no arguments; capture whatever the
 * task needs (an item, a signal, ...) in the closure. */
export type PoolTask<T> = () => Promise<T>;

export type PoolOutcome<T> =
	| { status: "fulfilled"; value: T }
	| { status: "rejected"; reason: unknown };

/**
 * Resolves the worker pool's concurrency cap from the host's reported core
 * count.
 *
 * `hardwareConcurrency - 1` leaves one core free for the UI thread — without
 * it, saturating every core with WASM codec work makes the tab feel frozen
 * even though conversions are still progressing. The upper bound of 8 exists
 * independent of core count: each in-flight job holds a WASM codec instance,
 * and those are memory-hungry enough that parallelism beyond ~8 trades
 * throughput for OOM risk rather than gaining anything on typical hardware.
 *
 * `hardwareConcurrency` is `undefined` in some browser/embedding contexts,
 * so it defaults to 4 (a reasonably conservative middle ground) rather than
 * producing `NaN` through the arithmetic below.
 */
export function resolveConcurrency(
	hardwareConcurrency: number | undefined,
	cap = 8,
): number {
	const cores = hardwareConcurrency ?? 4;
	return Math.max(1, Math.min(cores - 1, cap));
}

/**
 * Runs `tasks` with at most `concurrency` in flight at any moment, resolving
 * once every task has settled. Each task's outcome is captured individually
 * — a rejection is recorded as `{ status: "rejected" }` rather than
 * propagated, so one failing item can never abort the rest of the pool (the
 * same guarantee `Promise.allSettled` gives, but with a concurrency cap
 * `Promise.allSettled` has no way to express).
 *
 * The returned array is indexed identically to `tasks`: `result[i]` is
 * always the outcome of `tasks[i]`, regardless of the order in which tasks
 * actually complete. This is what lets a caller preserve input order without
 * doing any sorting of its own.
 */
export async function runPool<T>(
	tasks: PoolTask<T>[],
	concurrency: number,
): Promise<PoolOutcome<T>[]> {
	const results: PoolOutcome<T>[] = new Array(tasks.length);
	let nextIndex = 0;

	async function worker(): Promise<void> {
		for (;;) {
			const index = nextIndex;
			nextIndex += 1;
			if (index >= tasks.length) return;

			const task = tasks[index];
			if (task === undefined) return;

			try {
				const value = await task();
				results[index] = { status: "fulfilled", value };
			} catch (reason) {
				results[index] = { status: "rejected", reason };
			}
		}
	}

	const workerCount = Math.max(1, Math.min(concurrency, tasks.length));
	await Promise.all(Array.from({ length: workerCount }, () => worker()));

	return results;
}
