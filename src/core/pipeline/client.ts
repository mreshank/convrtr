import {
	type ErrorCode,
	isJobEvent,
	type JobEvent,
	type JobRequest,
	type ManyJobRequest,
	type StreamJobRequest,
} from "./protocol";

/**
 * An error raised by a job that carries the worker's `ErrorCode` (see
 * `protocol.ts`) rather than discarding it. Without this, every rejection at
 * the client boundary collapsed to a bare `Error`, making the taxonomy the
 * worker carefully assigns unreachable by any caller.
 */
export class JobError extends Error {
	readonly code: ErrorCode;

	constructor(code: ErrorCode, message: string) {
		super(message);
		this.name = "JobError";
		this.code = code;
	}
}

export function runJob(
	request: JobRequest,
	onEvent: (event: JobEvent) => void,
	signal: AbortSignal,
): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Cancelled", "AbortError"));
			return;
		}

		const worker = new Worker(new URL("./worker.ts", import.meta.url), {
			type: "module",
		});

		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener("abort", onAbort);
		};

		const onAbort = () => {
			cleanup();
			reject(new DOMException("Cancelled", "AbortError"));
		};
		signal.addEventListener("abort", onAbort);

		worker.onmessage = (event: MessageEvent<unknown>) => {
			if (!isJobEvent(event.data)) return;
			const message = event.data;
			onEvent(message);

			if (message.type === "done") {
				cleanup();
				resolve(message.output);
				return;
			}

			if (message.type === "error") {
				cleanup();
				reject(new JobError(message.code, message.message));
			}
		};

		worker.onerror = (event: ErrorEvent) => {
			cleanup();
			reject(new JobError("ENGINE_FAILURE", event.message || "Worker failed"));
		};

		worker.postMessage(request, [request.input]);
	});
}

/**
 * Runs a conversion that writes straight to a file the user already chose.
 *
 * Resolves with the number of bytes on disk instead of the bytes themselves —
 * there is no output buffer, which is the entire point. Callers therefore
 * cannot preview the result or re-save it, and must present it as a file
 * already written rather than one waiting to be downloaded.
 *
 * The `handle` must come from a picker opened during the user's click; see
 * `pickSaveFile`. Passing a handle obtained any other way will fail the
 * browser's permission check at write time, long after the work has started.
 */
export function runStreamJob(
	request: StreamJobRequest,
	onEvent: (event: JobEvent) => void,
	signal: AbortSignal,
): Promise<number> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Cancelled", "AbortError"));
			return;
		}

		const worker = new Worker(new URL("./worker.ts", import.meta.url), {
			type: "module",
		});

		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener("abort", onAbort);
		};

		const onAbort = () => {
			// Terminating mid-write leaves the writable neither committed nor
			// aborted, so the browser discards the swap file and no partial
			// output is presented as finished. That is the same outcome as an
			// explicit discard, which is why cancelling needs no extra handling
			// here.
			cleanup();
			reject(new DOMException("Cancelled", "AbortError"));
		};
		signal.addEventListener("abort", onAbort);

		worker.onmessage = (event: MessageEvent<unknown>) => {
			if (!isJobEvent(event.data)) return;
			const message = event.data;
			onEvent(message);

			if (message.type === "streamed") {
				cleanup();
				resolve(message.bytes);
				return;
			}

			if (message.type === "error") {
				cleanup();
				reject(new JobError(message.code, message.message));
			}
		};

		worker.onerror = (event: ErrorEvent) => {
			cleanup();
			reject(new JobError("ENGINE_FAILURE", event.message || "Worker failed"));
		};

		// Neither the Blob nor the handle is transferred: both are cloneable, and
		// the Blob's bytes stay where they are rather than being copied, since a
		// clone shares the underlying data.
		worker.postMessage(request);
	});
}

/**
 * Runs a conversion that combines several files into one.
 *
 * The inputs are transferred, which empties the caller's buffers — the same
 * contract `runJob` has for its single input, and worth stating because
 * transferring a list is easy to misread as transferring a copy of it.
 */
export function runManyJob(
	request: ManyJobRequest,
	onEvent: (event: JobEvent) => void,
	signal: AbortSignal,
): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Cancelled", "AbortError"));
			return;
		}

		const worker = new Worker(new URL("./worker.ts", import.meta.url), {
			type: "module",
		});

		const cleanup = () => {
			worker.terminate();
			signal.removeEventListener("abort", onAbort);
		};

		const onAbort = () => {
			cleanup();
			reject(new DOMException("Cancelled", "AbortError"));
		};
		signal.addEventListener("abort", onAbort);

		worker.onmessage = (event: MessageEvent<unknown>) => {
			if (!isJobEvent(event.data)) return;
			const message = event.data;
			onEvent(message);

			if (message.type === "done") {
				cleanup();
				resolve(message.output);
				return;
			}

			if (message.type === "error") {
				cleanup();
				reject(new JobError(message.code, message.message));
			}
		};

		worker.onerror = (event: ErrorEvent) => {
			cleanup();
			reject(new JobError("ENGINE_FAILURE", event.message || "Worker failed"));
		};

		worker.postMessage(request, request.inputs);
	});
}
