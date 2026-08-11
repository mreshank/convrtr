import { isJobEvent, type JobEvent, type JobRequest } from "./protocol";

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
				reject(new Error(message.message));
			}
		};

		worker.onerror = (event: ErrorEvent) => {
			cleanup();
			reject(new Error(event.message || "Worker failed"));
		};

		worker.postMessage(request, [request.input]);
	});
}
