import { selectEngine } from "@/core/engines";
import type { JobEvent, JobRequest } from "./protocol";

self.onmessage = async (event: MessageEvent<JobRequest>) => {
	const { id, engines, input, params } = event.data;
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

		const output = await engine.run(input, params, (ratio, phase) =>
			post({ type: "progress", id, ratio, phase }),
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
