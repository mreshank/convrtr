import { describe, expect, it } from "vitest";
import { acceptsFile, outputFilename } from "../index";

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
