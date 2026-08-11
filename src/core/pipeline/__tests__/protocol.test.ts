import { describe, expect, it } from "vitest";
import { isJobEvent, makeJobId } from "../protocol";

describe("makeJobId", () => {
	it("produces unique ids", () => {
		const ids = new Set(Array.from({ length: 100 }, () => makeJobId()));
		expect(ids.size).toBe(100);
	});

	it("produces string ids", () => {
		expect(typeof makeJobId()).toBe("string");
	});
});

describe("isJobEvent", () => {
	it("accepts a progress event", () => {
		expect(
			isJobEvent({ type: "progress", id: "a", ratio: 0.5, phase: "encode" }),
		).toBe(true);
	});

	it("accepts a done event", () => {
		expect(
			isJobEvent({ type: "done", id: "a", output: new ArrayBuffer(2) }),
		).toBe(true);
	});

	it("accepts an error event", () => {
		expect(
			isJobEvent({
				type: "error",
				id: "a",
				code: "ENGINE_FAILURE",
				message: "x",
			}),
		).toBe(true);
	});

	it("rejects an unknown shape", () => {
		expect(isJobEvent({ type: "nonsense" })).toBe(false);
	});

	it("rejects null", () => {
		expect(isJobEvent(null)).toBe(false);
	});

	it("rejects undefined", () => {
		expect(isJobEvent(undefined)).toBe(false);
	});

	it("rejects a primitive", () => {
		expect(isJobEvent("progress")).toBe(false);
		expect(isJobEvent(42)).toBe(false);
	});

	it("rejects an object with a missing id", () => {
		expect(isJobEvent({ type: "progress", ratio: 0.5, phase: "encode" })).toBe(
			false,
		);
	});

	it("rejects an object with a non-string id", () => {
		expect(
			isJobEvent({ type: "progress", id: 7, ratio: 0.5, phase: "encode" }),
		).toBe(false);
	});

	it("rejects a progress event with a non-numeric ratio", () => {
		expect(
			isJobEvent({ type: "progress", id: "a", ratio: "half", phase: "encode" }),
		).toBe(false);
	});

	it("rejects a progress event with a missing phase", () => {
		expect(isJobEvent({ type: "progress", id: "a", ratio: 0.5 })).toBe(false);
	});

	it("rejects a done event whose output is not an ArrayBuffer", () => {
		expect(isJobEvent({ type: "done", id: "a", output: "not-a-buffer" })).toBe(
			false,
		);
	});

	it("rejects a done event with a missing output", () => {
		expect(isJobEvent({ type: "done", id: "a" })).toBe(false);
	});

	it("rejects an error event with a missing code", () => {
		expect(isJobEvent({ type: "error", id: "a", message: "x" })).toBe(false);
	});

	it("rejects an error event with a non-string message", () => {
		expect(
			isJobEvent({
				type: "error",
				id: "a",
				code: "ENGINE_FAILURE",
				message: 5,
			}),
		).toBe(false);
	});

	it("rejects an unknown type with an otherwise well-formed payload", () => {
		expect(
			isJobEvent({
				type: "cancelled",
				id: "a",
				ratio: 1,
				output: new ArrayBuffer(0),
			}),
		).toBe(false);
	});

	it("rejects an array", () => {
		expect(isJobEvent([])).toBe(false);
	});

	it("rejects an object with no type", () => {
		expect(isJobEvent({ id: "a" })).toBe(false);
	});
});
