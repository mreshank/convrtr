import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobError, runJob, runStreamJob } from "../client";
import type { JobEvent } from "../protocol";

/**
 * happy-dom does not run real Web Workers, and the pipeline never imports
 * `Worker` directly — it reaches for the global. Stubbing that global lets
 * these tests drive `worker.onmessage`/`worker.onerror` by hand and assert
 * on what `runJob` does at the client boundary, without needing a real
 * worker thread.
 */
let lastWorker: FakeWorker | null = null;

class FakeWorker {
	onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	terminated = false;

	constructor() {
		// `client.ts` reaches for the global `Worker` constructor directly,
		// so the stub must itself be `new`-able — an arrow function passed to
		// `vi.fn().mockImplementation(...)` is not, since arrow functions have
		// no [[Construct]]. A real class sidesteps that entirely.
		lastWorker = this;
	}

	postMessage(): void {
		// Individual tests drive onmessage/onerror manually.
	}

	terminate(): void {
		this.terminated = true;
	}
}

beforeEach(() => {
	lastWorker = null;
	vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function request() {
	return { id: "job-1", engines: ["x"], input: new ArrayBuffer(0), params: {} };
}

describe("runJob", () => {
	it("rejects immediately on an already-aborted signal without creating a worker", async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			runJob(request(), () => {}, controller.signal),
		).rejects.toMatchObject({ name: "AbortError" });
		expect(lastWorker).toBeNull();
	});

	it("rejects with a JobError carrying the worker's error code", async () => {
		const controller = new AbortController();
		const promise = runJob(request(), () => {}, controller.signal);

		const worker = lastWorker;
		if (!worker) throw new Error("expected a worker to be created");
		worker.onmessage?.({
			data: {
				type: "error",
				id: "job-1",
				code: "CAPABILITY_MISSING",
				message: "No supported engine",
			} satisfies JobEvent,
		} as MessageEvent<unknown>);

		await expect(promise).rejects.toBeInstanceOf(JobError);
		await expect(promise).rejects.toMatchObject({
			code: "CAPABILITY_MISSING",
			message: "No supported engine",
		});
		expect(worker.terminated).toBe(true);
	});

	it("rejects with an ENGINE_FAILURE JobError when the worker itself crashes", async () => {
		const controller = new AbortController();
		const promise = runJob(request(), () => {}, controller.signal);

		const worker = lastWorker;
		if (!worker) throw new Error("expected a worker to be created");
		worker.onerror?.({ message: "boom" } as ErrorEvent);

		await expect(promise).rejects.toBeInstanceOf(JobError);
		await expect(promise).rejects.toMatchObject({
			code: "ENGINE_FAILURE",
			message: "boom",
		});
	});

	it("resolves with the output bytes on a done event", async () => {
		const controller = new AbortController();
		const output = new ArrayBuffer(4);
		const promise = runJob(request(), () => {}, controller.signal);

		const worker = lastWorker;
		if (!worker) throw new Error("expected a worker to be created");
		worker.onmessage?.({
			data: { type: "done", id: "job-1", output } satisfies JobEvent,
		} as MessageEvent<unknown>);

		await expect(promise).resolves.toBe(output);
	});

	it("rejects with an AbortError and terminates the worker on cancellation", async () => {
		const controller = new AbortController();
		const promise = runJob(request(), () => {}, controller.signal);

		const worker = lastWorker;
		if (!worker) throw new Error("expected a worker to be created");
		controller.abort();

		await expect(promise).rejects.toMatchObject({ name: "AbortError" });
		expect(worker.terminated).toBe(true);
	});
});

describe("runStreamJob", () => {
	function streamRequest() {
		return {
			id: "job-1",
			engines: ["x"],
			input: new Blob(["x"]),
			params: {},
			handle: {} as FileSystemFileHandle,
			mode: "stream" as const,
		};
	}

	it("rejects immediately on an already-aborted signal without creating a worker", async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			runStreamJob(streamRequest(), () => {}, controller.signal),
		).rejects.toThrow(/Cancelled/);
		expect(lastWorker).toBeNull();
	});

	it("resolves with the size on disk rather than a buffer", async () => {
		const promise = runStreamJob(
			streamRequest(),
			() => {},
			new AbortController().signal,
		);
		lastWorker?.onmessage?.(
			new MessageEvent("message", {
				data: { type: "streamed", id: "job-1", bytes: 2048 },
			}),
		);

		await expect(promise).resolves.toBe(2048);
		expect(lastWorker?.terminated).toBe(true);
	});

	it("does not resolve on a buffered `done` event", async () => {
		const settled = vi.fn();
		const promise = runStreamJob(
			streamRequest(),
			() => {},
			new AbortController().signal,
		).then(settled, settled);

		// A streaming job that received `done` would mean the worker took the
		// buffered path after being asked to stream — silently loading a file
		// too large for memory. Resolving here would hide that.
		lastWorker?.onmessage?.(
			new MessageEvent("message", {
				data: { type: "done", id: "job-1", output: new ArrayBuffer(8) },
			}),
		);
		await Promise.resolve();

		expect(settled).not.toHaveBeenCalled();

		lastWorker?.onmessage?.(
			new MessageEvent("message", {
				data: { type: "streamed", id: "job-1", bytes: 8 },
			}),
		);
		await promise;
	});

	it("surfaces the worker's error code rather than a bare Error", async () => {
		const promise = runStreamJob(
			streamRequest(),
			() => {},
			new AbortController().signal,
		);
		lastWorker?.onmessage?.(
			new MessageEvent("message", {
				data: {
					type: "error",
					id: "job-1",
					code: "CAPABILITY_MISSING",
					message: "cannot stream",
				},
			}),
		);

		await expect(promise).rejects.toBeInstanceOf(JobError);
		await expect(promise).rejects.toMatchObject({
			code: "CAPABILITY_MISSING",
		});
	});

	it("forwards progress events to the caller", async () => {
		const events: JobEvent[] = [];
		const promise = runStreamJob(
			streamRequest(),
			(event) => events.push(event),
			new AbortController().signal,
		);
		lastWorker?.onmessage?.(
			new MessageEvent("message", {
				data: { type: "progress", id: "job-1", ratio: 0.4, phase: "COPY" },
			}),
		);
		lastWorker?.onmessage?.(
			new MessageEvent("message", {
				data: { type: "streamed", id: "job-1", bytes: 1 },
			}),
		);
		await promise;

		expect(events).toEqual([
			{ type: "progress", id: "job-1", ratio: 0.4, phase: "COPY" },
			{ type: "streamed", id: "job-1", bytes: 1 },
		]);
	});

	it("terminates the worker when cancelled mid-conversion", async () => {
		const controller = new AbortController();
		const promise = runStreamJob(streamRequest(), () => {}, controller.signal);

		controller.abort();

		await expect(promise).rejects.toThrow(/Cancelled/);
		// Terminating leaves the writable neither committed nor aborted, so the
		// browser discards it and no partial file survives.
		expect(lastWorker?.terminated).toBe(true);
	});
});
