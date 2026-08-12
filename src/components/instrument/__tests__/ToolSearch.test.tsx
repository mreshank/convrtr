import { describe, expect, it } from "vitest";
import type { ToolRow } from "@/app/tools/toolRow";
import { filterToolRows } from "../ToolSearch";

const ROWS: ToolRow[] = [
	{
		id: "image/png-to-webp",
		href: "/image/png-to-webp",
		name: "Convert PNG to WebP",
		description: "Convert PNG images to WebP without uploading them.",
		intent: "Convert PNG images to WebP without uploading them.",
		category: "image",
		fromExt: "png",
		toExt: "webp",
	},
	{
		id: "image/jpg-to-png",
		href: "/image/jpg-to-png",
		name: "Convert JPG to PNG",
		description: "Turn a JPEG photo into a lossless PNG.",
		intent: "Turn a JPEG photo into a lossless PNG.",
		category: "image",
		fromExt: "jpg",
		toExt: "png",
	},
	{
		id: "video/mp4-to-webm",
		href: "/video/mp4-to-webm",
		name: "Convert MP4 to WebM",
		description: "Re-encode MP4 video into the smaller WebM container.",
		intent: "Re-encode MP4 video into the smaller WebM container.",
		category: "video",
		fromExt: "mp4",
		toExt: "webm",
	},
];

describe("filterToolRows", () => {
	it("returns every row, in the given order, for an empty query", () => {
		expect(filterToolRows(ROWS, "")).toEqual(ROWS);
	});

	it("returns every row for a whitespace-only query", () => {
		expect(filterToolRows(ROWS, "   ")).toEqual(ROWS);
	});

	it("matches case-insensitively on tool name", () => {
		const result = filterToolRows(ROWS, "webp");
		expect(result.map((r) => r.id)).toEqual(["image/png-to-webp"]);
	});

	it("matches on the source extension", () => {
		const result = filterToolRows(ROWS, "mp4");
		expect(result.map((r) => r.id)).toEqual(["video/mp4-to-webm"]);
	});

	it("matches on the output extension", () => {
		const result = filterToolRows(ROWS, "webm");
		expect(result.map((r) => r.id)).toEqual(["video/mp4-to-webm"]);
	});

	it("matches on category", () => {
		const result = filterToolRows(ROWS, "video");
		expect(result.map((r) => r.id)).toEqual(["video/mp4-to-webm"]);
	});

	it("matches on intent text that never appears in the name or extensions", () => {
		const result = filterToolRows(ROWS, "container");
		expect(result.map((r) => r.id)).toEqual(["video/mp4-to-webm"]);
	});

	it("requires every whitespace-separated token to match (AND, not OR)", () => {
		const result = filterToolRows(ROWS, "png image");
		expect(result.map((r) => r.id).sort()).toEqual([
			"image/jpg-to-png",
			"image/png-to-webp",
		]);
	});

	it("returns an empty array when no row matches every token", () => {
		expect(filterToolRows(ROWS, "png video")).toEqual([]);
	});

	it("returns an empty array for a query with no matches at all", () => {
		expect(filterToolRows(ROWS, "does-not-exist")).toEqual([]);
	});

	it("ranks a name-prefix match above a name-substring match", () => {
		const rows: ToolRow[] = [
			{
				id: "a",
				href: "/a",
				name: "Batch resize PNG",
				description: "",
				intent: "",
				category: "image",
				fromExt: "png",
				toExt: "png",
			},
			{
				id: "b",
				href: "/b",
				name: "PNG to AVIF",
				description: "",
				intent: "",
				category: "image",
				fromExt: "png",
				toExt: "avif",
			},
		];
		const result = filterToolRows(rows, "png");
		expect(result.map((r) => r.id)).toEqual(["b", "a"]);
	});

	it("does not mutate the input array", () => {
		const copy = [...ROWS];
		filterToolRows(ROWS, "png");
		expect(ROWS).toEqual(copy);
	});
});
