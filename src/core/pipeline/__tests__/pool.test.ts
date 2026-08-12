import { describe, expect, it } from "vitest";
import { type PoolTask, resolveConcurrency, runPool } from "../pool";

/** Resolves a manually-controlled task, letting tests decide exactly when
 * each "unit of work" finishes rather than racing real timers. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

/** Flushes pending microtasks (and one macrotask turn) so async continuations
 * scheduled by resolving a gate have had a chance to run before assertions. */
function flush(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("resolveConcurrency", () => {
	it("leaves one core free for the UI thread", () => {
		expect(resolveConcurrency(5)).toBe(4);
	});

	it("caps at 8 regardless of core count", () => {
		expect(resolveConcurrency(32)).toBe(8);
	});

	it("defaults to 4 cores when hardwareConcurrency is undefined", () => {
		expect(resolveConcurrency(undefined)).toBe(3);
	});

	it("never returns less than 1, even on a single-core machine", () => {
		expect(resolveConcurrency(1)).toBe(1);
		expect(resolveConcurrency(0)).toBe(1);
	});

	it("respects a custom cap", () => {
		expect(resolveConcurrency(32, 2)).toBe(2);
	});
});

describe("runPool", () => {
	it("never runs more tasks in flight than the concurrency cap", async () => {
		const concurrency = 3;
		const total = 8;
		let inFlight = 0;
		let peak = 0;
		const gates = Array.from({ length: total }, () => deferred<void>());

		const tasks: PoolTask<number>[] = gates.map((gate, index) => async () => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await gate.promise;
			inFlight -= 1;
			return index;
		});

		const resultPromise = runPool(tasks, concurrency);
		await flush();
		expect(inFlight).toBe(concurrency);

		for (const gate of gates) {
			gate.resolve();
			await flush();
			expect(inFlight).toBeLessThanOrEqual(concurrency);
		}

		const results = await resultPromise;
		expect(peak).toBe(concurrency);
		expect(
			results.map((result) =>
				result.status === "fulfilled" ? result.value : -1,
			),
		).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it("uses at most one worker per task when there are fewer tasks than the cap", async () => {
		let peak = 0;
		let inFlight = 0;
		const tasks: PoolTask<void>[] = [1, 2].map(() => async () => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await Promise.resolve();
			inFlight -= 1;
		});

		await runPool(tasks, 8);
		expect(peak).toBe(2);
	});

	it("lets other items complete when one task rejects", async () => {
		const tasks: PoolTask<string>[] = [
			async () => "a",
			async () => {
				throw new Error("boom");
			},
			async () => "c",
		];

		const results = await runPool(tasks, 2);

		expect(results[0]).toEqual({ status: "fulfilled", value: "a" });
		expect(results[1]?.status).toBe("rejected");
		expect(results[2]).toEqual({ status: "fulfilled", value: "c" });
	});

	it("preserves task order in the result array regardless of completion order", async () => {
		const gates = [deferred<void>(), deferred<void>(), deferred<void>()];
		const tasks: PoolTask<number>[] = gates.map((gate, index) => async () => {
			await gate.promise;
			return index;
		});

		const resultPromise = runPool(tasks, 3);
		await flush();

		// Resolve out of order: index 2, then 0, then 1.
		gates[2]?.resolve();
		await flush();
		gates[0]?.resolve();
		await flush();
		gates[1]?.resolve();

		const results = await resultPromise;
		expect(
			results.map((result) =>
				result.status === "fulfilled" ? result.value : -1,
			),
		).toEqual([0, 1, 2]);
	});

	it("resolves to an empty array for no tasks", async () => {
		expect(await runPool([], 4)).toEqual([]);
	});
});
