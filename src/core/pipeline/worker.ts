import { selectEngine } from "@/core/engines";
import { supportsStreaming } from "@/core/engines/types";
import { createFileSink } from "@/core/io/sink";
import type { AnyJobRequest, JobEvent } from "./protocol";
import { runStreamingConversion } from "./stream-runner";

self.onmessage = async (event: MessageEvent<AnyJobRequest>) => {
	const request = event.data;
	const { id, engines, params } = request;
	const post = (message: JobEvent) => self.postMessage(message);

	try {
		const engine = await selectEngine(engines);
		if (!engine) {
			post({
				type: "error",
				id,
				code: "CAPABILITY_MISSING",
				message: "No supported engine",
			});
			return;
		}

		const onProgress = (ratio: number, phase: string) =>
			post({ type: "progress", id, ratio, phase });
		const onNotice = (message: string) => post({ type: "notice", id, message });

		if (request.mode === "stream") {
			// Refuse rather than silently falling back to the buffered path. The
			// caller chose streaming because the file does not fit in memory, so
			// quietly buffering it would crash the tab — the precise failure the
			// choice was made to avoid.
			if (!supportsStreaming(engine)) {
				post({
					type: "error",
					id,
					code: "CAPABILITY_MISSING",
					message: `${engine.id} cannot convert this file without loading it into memory`,
				});
				return;
			}

			const sink = await createFileSink(request.handle);
			const bytes = await runStreamingConversion(
				engine,
				request.input,
				params,
				onProgress,
				sink,
				request.handle,
				onNotice,
			);
			post({ type: "streamed", id, bytes });
			return;
		}

		const output = await engine.run(
			request.input,
			params,
			onProgress,
			onNotice,
		);
		post({ type: "done", id, output });
	} catch (error) {
		post({
			type: "error",
			id,
			code: "ENGINE_FAILURE",
			message: error instanceof Error ? error.message : "Unknown failure",
		});
	}
};
