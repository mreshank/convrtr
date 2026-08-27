import { describe, expect, it, vi } from "vitest";
import {
	acceptsFile,
	canStreamToDisk,
	outputFilename,
	saveOutputStream,
} from "../index";

describe("outputFilename", () => {
	it("swaps the extension", () => {
		expect(outputFilename("diagram.png", "webp")).toBe("diagram.webp");
	});

	it("handles names containing dots", () => {
		expect(outputFilename("my.holiday.photo.png", "webp")).toBe(
			"my.holiday.photo.webp",
		);
	});

	it("appends when there is no extension", () => {
		expect(outputFilename("noext", "webp")).toBe("noext.webp");
	});
});

describe("acceptsFile", () => {
	const accept = { mime: ["image/png"], ext: ["png"] };

	it("accepts a matching mime type", () => {
		expect(
			acceptsFile(new File([], "a.png", { type: "image/png" }), accept),
		).toBe(true);
	});

	it("falls back to the extension when mime is empty", () => {
		expect(acceptsFile(new File([], "a.png", { type: "" }), accept)).toBe(true);
	});

	it("rejects a non-matching file", () => {
		expect(
			acceptsFile(new File([], "a.gif", { type: "image/gif" }), accept),
		).toBe(false);
	});
});

describe("canStreamToDisk", () => {
	it("is false when the File System Access API is absent", () => {
		// The anchor-download fallback cannot stream: it needs a Blob URL, and
		// building that Blob is exactly the allocation being avoided. Callers
		// with a very large payload need to know this before starting work,
		// not after two minutes of conversion.
		expect(canStreamToDisk()).toBe(false);
	});
});

describe("saveOutputStream", () => {
	it("reports false rather than silently falling back when it cannot stream", async () => {
		const source = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array([1, 2, 3]));
				controller.close();
			},
		});
		expect(
			await saveOutputStream(source, "out.bin", "application/octet-stream"),
		).toBe(false);
	});

	it("treats a dismissed save dialog as a cancellation, not a failure", async () => {
		const picker = vi.fn(async () => {
			throw new DOMException("The user aborted a request.", "AbortError");
		});
		(window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker =
			picker;
		try {
			const source = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.close();
				},
			});
			// True means "handled" — cancelling must not fall through to a
			// fallback that saves the file the user just declined.
			await expect(
				saveOutputStream(source, "out.bin", "application/octet-stream"),
			).resolves.toBe(true);
		} finally {
			(
				window as unknown as { showSaveFilePicker?: unknown }
			).showSaveFilePicker = undefined;
		}
	});
});
