import { describe, expect, it } from "vitest";
import {
	type BatchItem,
	type BatchItemEvent,
	type BatchItemRunner,
	runBatch,
} from "../batch";
import { JobError } from "../client";

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

function flush(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function item(id: string): BatchItem {
	return { id, file: new File([`content-${id}`], `${id}.png`) };
}

function output(id: string): ArrayBuffer {
	return new TextEncoder().encode(`out-${id}`).buffer as ArrayBuffer;
}

describe("runBatch", () => {
	it("preserves input order in the returned outcomes regardless of completion order", async () => {
		const items = [item("a"), item("b"), item("c")];
		const gates = {
			a: deferred<void>(),
			b: deferred<void>(),
			c: deferred<void>(),
		};

		const runItem: BatchItemRunner = async (batchItem) => {
			await gates[batchItem.id as keyof typeof gates].promise;
			return { output: output(batchItem.id), inputSize: 1 };
		};

		const controller = new AbortController();
		const resultPromise = runBatch(
			items,
			{
				engines: ["x"],
				params: {},
				outputExt: "webp",
				concurrency: 3,
				runItem,
			},
			() => {},
			controller.signal,
		);

		await flush();
		// Resolve out of order: c, then a, then b.
		gates.c.resolve();
		await flush();
		gates.a.resolve();
		await flush();
		gates.b.resolve();

		const outcomes = await resultPromise;
		expect(outcomes.map((outcome) => outcome.id)).toEqual(["a", "b", "c"]);
		expect(outcomes.every((outcome) => outcome.status === "done")).toBe(true);
	});

	it("lets other items finish when one item fails", async () => {
		const items = [item("a"), item("b"), item("c")];
		const runItem: BatchItemRunner = async (batchItem) => {
			if (batchItem.id === "b") {
				throw new JobError("CORRUPT_INPUT", "bad file");
			}
			return { output: output(batchItem.id), inputSize: 1 };
		};

		const controller = new AbortController();
		const outcomes = await runBatch(
			items,
			{
				engines: ["x"],
				params: {},
				outputExt: "webp",
				concurrency: 3,
				runItem,
			},
			() => {},
			controller.signal,
		);

		expect(outcomes.map((outcome) => outcome.status)).toEqual([
			"done",
			"error",
			"done",
		]);
		const failed = outcomes[1];
		if (failed?.status !== "error") throw new Error("expected item b to fail");
		expect(failed.code).toBe("CORRUPT_INPUT");
		expect(failed.message).toBe("bad file");
	});

	it("never runs more items concurrently than the configured cap", async () => {
		const items = Array.from({ length: 6 }, (_, i) => item(`i${i}`));
		let inFlight = 0;
		let peak = 0;
		const gates = new Map<string, ReturnType<typeof deferred<void>>>();

		const runItem: BatchItemRunner = async (batchItem) => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			const gate = deferred<void>();
			gates.set(batchItem.id, gate);
			await gate.promise;
			inFlight -= 1;
			return { output: output(batchItem.id), inputSize: 1 };
		};

		const controller = new AbortController();
		const resultPromise = runBatch(
			items,
			{
				engines: ["x"],
				params: {},
				outputExt: "webp",
				concurrency: 2,
				runItem,
			},
			() => {},
			controller.signal,
		);

		await flush();
		expect(inFlight).toBe(2);

		// Release gates as they appear, letting the pool backfill from the
		// queue, and keep checking the cap holds throughout.
		for (let i = 0; i < items.length; i++) {
			// Resolve whichever gates currently exist.
			for (const gate of gates.values()) gate.resolve();
			gates.clear();
			await flush();
			expect(inFlight).toBeLessThanOrEqual(2);
		}

		await resultPromise;
		expect(peak).toBe(2);
	});

	it("preserves already-finished outcomes and cancels the rest when the signal aborts mid-batch", async () => {
		const items = [item("a"), item("b"), item("c"), item("d"), item("e")];
		const gates = new Map<string, ReturnType<typeof deferred<void>>>();
		const started: string[] = [];

		const runItem: BatchItemRunner = (
			batchItem,
			_config,
			_onProgress,
			signal,
		) => {
			started.push(batchItem.id);
			return new Promise((resolve, reject) => {
				if (signal.aborted) {
					reject(new DOMException("Cancelled", "AbortError"));
					return;
				}
				const gate = deferred<void>();
				gates.set(batchItem.id, gate);
				signal.addEventListener(
					"abort",
					() => reject(new DOMException("Cancelled", "AbortError")),
					{ once: true },
				);
				gate.promise.then(() =>
					resolve({ output: output(batchItem.id), inputSize: 1 }),
				);
			});
		};

		const controller = new AbortController();
		const events: BatchItemEvent[] = [];
		const resultPromise = runBatch(
			items,
			{
				engines: ["x"],
				params: {},
				outputExt: "webp",
				concurrency: 2,
				runItem,
			},
			(event) => events.push(event),
			controller.signal,
		);

		// a, b start immediately (concurrency 2).
		await flush();
		expect(started).toEqual(["a", "b"]);

		gates.get("a")?.resolve();
		await flush(); // a finishes, c starts
		expect(started).toEqual(["a", "b", "c"]);

		gates.get("b")?.resolve();
		await flush(); // b finishes, d starts
		expect(started).toEqual(["a", "b", "c", "d"]);

		// c and d are now in flight; e is still queued behind the concurrency
		// cap and has never been started.
		controller.abort();
		await flush();

		const outcomes = await resultPromise;
		expect(outcomes.map((outcome) => outcome.status)).toEqual([
			"done",
			"done",
			"cancelled",
			"cancelled",
			"cancelled",
		]);
		// e was never started at all — cancellation of a queued item must not
		// invoke the runner.
		expect(started).toEqual(["a", "b", "c", "d"]);
	});

	it("reports per-item progress and terminal events through onItemEvent", async () => {
		const items = [item("a")];
		const runItem: BatchItemRunner = async (batchItem, _config, onProgress) => {
			onProgress(0.5, "encode");
			return { output: output(batchItem.id), inputSize: 1 };
		};

		const events: BatchItemEvent[] = [];
		const controller = new AbortController();
		await runBatch(
			items,
			{ engines: ["x"], params: {}, outputExt: "webp", runItem },
			(event) => events.push(event),
			controller.signal,
		);

		expect(events).toEqual([
			{ id: "a", type: "progress", ratio: 0.5, phase: "encode" },
			{ id: "a", type: "done" },
		]);
	});

	it("computes outputName from outputExt and reports byte sizes", async () => {
		const items = [{ id: "a", file: new File(["hello"], "photo.png") }];
		const runItem: BatchItemRunner = async () => ({
			output: new ArrayBuffer(3),
			inputSize: 5,
		});

		const controller = new AbortController();
		const [outcome] = await runBatch(
			items,
			{ engines: ["x"], params: {}, outputExt: "webp", runItem },
			() => {},
			controller.signal,
		);

		if (outcome?.status !== "done") throw new Error("expected a done outcome");
		expect(outcome.outputName).toBe("photo.webp");
		expect(outcome.inputSize).toBe(5);
		expect(outcome.outputSize).toBe(3);
	});
});
