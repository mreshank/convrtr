import { describe, expect, it } from "vitest";
import { imageToPdfEngine } from "../image-to-pdf";

/** Smallest valid 1x1 JPEG. */
const JPEG_1X1 = Uint8Array.from(
	atob(
		"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
	),
	(c) => c.charCodeAt(0),
);

/** Smallest valid 1x1 PNG. */
const PNG_1X1 = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	),
	(c) => c.charCodeAt(0),
);

function buf(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

function isPdf(output: ArrayBuffer): boolean {
	const header = new TextDecoder().decode(
		new Uint8Array(output).subarray(0, 5),
	);
	return header === "%PDF-";
}

describe("imageToPdfEngine", () => {
	it("produces a valid PDF from a JPEG", async () => {
		const out = await imageToPdfEngine.run(buf(JPEG_1X1), {}, () => {});
		expect(isPdf(out)).toBe(true);
	}, 20_000);

	it("produces a valid PDF from a PNG", async () => {
		const out = await imageToPdfEngine.run(buf(PNG_1X1), {}, () => {});
		expect(isPdf(out)).toBe(true);
	}, 20_000);

	it("embeds the original JPEG bytes rather than re-encoding them", async () => {
		// The entire justification for this engine. A rasterising implementation
		// would re-compress the photo, so the original scan data would not
		// survive into the PDF. Search the output for a distinctive run of the
		// source bytes.
		const out = new Uint8Array(
			await imageToPdfEngine.run(buf(JPEG_1X1), {}, () => {}),
		);
		const needle = JPEG_1X1.subarray(JPEG_1X1.length - 24);

		let found = false;
		outer: for (let i = 0; i <= out.length - needle.length; i++) {
			for (let j = 0; j < needle.length; j++) {
				if (out[i + j] !== needle[j]) continue outer;
			}
			found = true;
			break;
		}
		expect(found, "original JPEG bytes must appear verbatim in the PDF").toBe(
			true,
		);
	}, 20_000);

	it("refuses formats it cannot embed rather than silently re-compressing", async () => {
		// WebP has no PDF-native representation. Transcoding it here would mean
		// the user asked for a container change and quietly got a quality loss.
		const webpish = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0]);
		await expect(
			imageToPdfEngine.run(buf(webpish), {}, () => {}),
		).rejects.toThrow(/JPEG and PNG/);
	});

	it("reports monotonic progress ending at 1", async () => {
		const ticks: number[] = [];
		await imageToPdfEngine.run(buf(PNG_1X1), {}, (ratio) => ticks.push(ratio));
		expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
		expect(ticks.at(-1)).toBe(1);
	}, 20_000);

	it("uses the image's own dimensions in actual-size mode", async () => {
		const fit = await imageToPdfEngine.run(
			buf(PNG_1X1),
			{ pageMode: "fit" },
			() => {},
		);
		const actual = await imageToPdfEngine.run(
			buf(PNG_1X1),
			{ pageMode: "actual" },
			() => {},
		);
		// A 1x1 page and an A4 page cannot produce identical bytes.
		expect(new Uint8Array(actual)).not.toEqual(new Uint8Array(fit));
	}, 20_000);
});
