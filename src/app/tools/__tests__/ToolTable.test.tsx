import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolTable } from "../ToolTable";
import type { ToolRow } from "../toolRow";

const ROWS: ToolRow[] = [
	{
		id: "image/png-to-webp",
		href: "/image/png-to-webp",
		name: "Convert PNG to WebP",
		description: "Turn a PNG into a smaller WebP.",
		intent: "Turn a PNG into a smaller WebP.",
		category: "image",
		fromExt: "png",
		toExt: "webp",
	},
];

describe("ToolTable", () => {
	it("renders its column headers at the normal weight, like the other two tables", () => {
		// A `<th>` is bold by UA default. These are 11px mono labels in
		// `--ink-muted`, the quietest text on the page, and v2's display and
		// headline faces are both weight 400 — so weight 700 here made the
		// table's headers the boldest thing on `/tools`. `BatchTable` and
		// `ComparisonTable` both carry `font-normal`; this table had missed
		// the convention.
		//
		// happy-dom applies no UA stylesheet and resolves no Tailwind, so
		// this asserts the opt-out class is present rather than the computed
		// weight — the computed 700 was measured in a browser.
		render(<ToolTable rows={ROWS} caption="Tools" />);
		const headers = screen.getAllByRole("columnheader");
		expect(headers).toHaveLength(3);
		for (const header of headers) {
			expect(header.className).toContain("font-normal");
		}
	});
});
