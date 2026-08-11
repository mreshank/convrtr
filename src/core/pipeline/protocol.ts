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
};

export type JobEvent =
	| { type: "progress"; id: string; ratio: number; phase: string }
	| { type: "done"; id: string; output: ArrayBuffer }
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
		case "error":
			return (
				typeof event.code === "string" && typeof event.message === "string"
			);
		default:
			return false;
	}
}
