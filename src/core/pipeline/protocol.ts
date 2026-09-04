import type { ParamValue } from "@/core/quality";

export type ErrorCode =
	| "UNSUPPORTED_INPUT"
	| "CORRUPT_INPUT"
	| "CAPABILITY_MISSING"
	| "OUT_OF_MEMORY"
	| "USER_CANCELLED"
	| "ENGINE_FAILURE";

export type JobRequest = {
	id: string;
	engines: string[];
	input: ArrayBuffer;
	params: Record<string, ParamValue>;
	mode?: "buffer";
};

/**
 * A conversion that writes straight to disk instead of returning bytes.
 *
 * The input is a `Blob` rather than an `ArrayBuffer` because the point is to
 * never hold the file whole — the demuxer slices it as it reads. The output
 * destination is a `FileSystemFileHandle`, which is structured-cloneable, so
 * the worker can create the writable itself and no chunk ever crosses back to
 * the main thread.
 *
 * There is deliberately no `output` on the matching event. By the time the job
 * finishes the bytes are already on disk, so there is nothing to hand back —
 * and nothing to preview, which is a real difference the UI has to reflect
 * rather than paper over.
 */
export type StreamJobRequest = {
	id: string;
	engines: string[];
	input: Blob;
	params: Record<string, ParamValue>;
	handle: FileSystemFileHandle;
	mode: "stream";
};

/**
 * Several files in, one out.
 *
 * Separate from `JobRequest` rather than making `input` an array, so a
 * one-file engine cannot silently receive a list and process only the first.
 */
export type ManyJobRequest = {
	id: string;
	engines: string[];
	inputs: ArrayBuffer[];
	params: Record<string, ParamValue>;
	mode: "many";
};

export type AnyJobRequest = JobRequest | StreamJobRequest | ManyJobRequest;

export type JobEvent =
	| { type: "progress"; id: string; ratio: number; phase: string }
	| { type: "done"; id: string; output: ArrayBuffer }
	| { type: "streamed"; id: string; bytes: number }
	| { type: "notice"; id: string; message: string }
	| { type: "outputType"; id: string; ext: string; mime: string }
	| { type: "error"; id: string; code: ErrorCode; message: string };

export function makeJobId(): string {
	return crypto.randomUUID();
}

export function isJobEvent(value: unknown): value is JobEvent {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const event = value as Record<string, unknown>;
	if (typeof event.id !== "string") return false;

	switch (event.type) {
		case "progress":
			return typeof event.ratio === "number" && typeof event.phase === "string";
		case "done":
			return event.output instanceof ArrayBuffer;
		case "streamed":
			return typeof event.bytes === "number";
		case "notice":
			return typeof event.message === "string";
		case "outputType":
			return typeof event.ext === "string" && typeof event.mime === "string";
		case "error":
			return (
				typeof event.code === "string" && typeof event.message === "string"
			);
		default:
			return false;
	}
}
