import {
	type ErrorCode,
	isJobEvent,
	type JobEvent,
	type JobRequest,
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
