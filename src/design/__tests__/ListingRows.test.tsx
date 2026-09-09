import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListingRows } from "@/design/families/ListingRows";

const ITEMS = [
	{
		href: "/blog/first-post",
		title: "First post",
		meta: "27 August 2026",
		description: "The first thing we wrote.",
	},
	{
		href: "/blog/second-post",
		title: "Second post",
		meta: "1 September 2026",
		description: "The second thing we wrote.",
	},
	{
		href: "/blog/third-post",
		title: "Third post",
	},
];

const SOURCE = readFileSync("src/design/families/ListingRows.tsx", "utf8");
const FAMILIES_CSS = readFileSync("src/design/families/families.css", "utf8");

/**
 * Block comments stripped before a raw-text scan of this component's own
 * source. Without this, the doc comment ABOVE the component -- which quotes
 * the exact defect this file replaces, `text-[18px]` and a bare
 * `underline`, by name -- trips the very guards below on the mention rather
 * than a use. `design-system.test.ts`'s gradient guard hit this identical
 * failure mode first ("a raw-text scan cannot tell a mention from a use")
 * and the fix is the same one: strip comments, then scan.
 */
const CODE_ONLY = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "");

describe("ListingRows", () => {
	it("renders one row per item", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		expect(container.querySelectorAll("[data-row]").length).toBe(ITEMS.length);
	});

	it("is a table of rows, not a bulleted list", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		expect(container.querySelectorAll("ul, li").length).toBe(0);
	});

	it("sets the title from the type scale, not a literal size", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		for (const title of container.querySelectorAll("[data-title]")) {
			expect((title as HTMLElement).style.fontSize).toBe("var(--label-size)");
		}
	});

	it("writes no Tailwind arbitrary type value anywhere in its own source", () => {
		// The spacing sweep in design-system.test.ts polices arbitrary
		// SPACING utilities (`p-[17px]`, `gap-[13px]`) but has nothing to say
		// about a `text-[18px]` -- confirmed by that file's own fixture table,
		// which lists `className="text-[13px]"` under `mustNotFlag`. That gap
		// is exactly how the component this replaces shipped
		// `text-[18px]`/`text-[14px]` bypassing --label-size and --body-size
		// entirely. Closed here, scoped to this file rather than the whole
		// tree: a tree-wide ban would also fail roughly a dozen existing
		// components (ToolTable, OptionsPanel, ErrorPanel, ...) that carry
		// the same pattern and are out of this task's scope to retrofit.
		expect(CODE_ONLY).not.toMatch(/text-\[/);
	});

	it("makes the whole row the link target, not just the title", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		const rows = container.querySelectorAll("[data-row]");
		expect(rows.length).toBe(ITEMS.length);
		rows.forEach((row, i) => {
			expect(row.tagName).toBe("A");
			expect(row.getAttribute("href")).toBe(ITEMS[i]?.href);
		});
		// Exactly one link per item -- no second, title-scoped <a> nested
		// inside the row's own.
		expect(container.querySelectorAll("a").length).toBe(ITEMS.length);
	});

	it("carries no browser-default underline", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		for (const row of container.querySelectorAll("[data-row]")) {
			expect((row as HTMLElement).style.textDecoration).toBe("none");
		}
	});

	it("renders meta only when the item carries one", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		const rows = container.querySelectorAll("[data-row]");
		expect(rows[0]?.querySelector(".mono")?.textContent).toBe("27 August 2026");
		expect(rows[1]?.querySelector(".mono")?.textContent).toBe(
			"1 September 2026",
		);
		// The third item has no meta -- nothing renders in its place.
		expect(rows[2]?.querySelector(".mono")).toBeNull();
	});

	it("renders description only when the item carries one", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		const rows = container.querySelectorAll("[data-row]");
		expect(rows[0]?.textContent).toContain("The first thing we wrote.");
		expect(rows[2]?.textContent).not.toContain("undefined");
	});

	it("hides the arrow from assistive technology, since the row already names its destination", () => {
		const { container } = render(<ListingRows items={ITEMS} />);
		const arrows = container.querySelectorAll("[data-arrow]");
		expect(arrows.length).toBe(ITEMS.length);
		for (const arrow of arrows) {
			expect(arrow.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("marks every row as the arrow's hover/focus host", () => {
		// `primitives.css`'s `[data-arrow-host]:hover [data-arrow],
		// [data-arrow-host]:focus-within [data-arrow]` rule is what actually
		// reveals the arrow -- this only proves the row carries the hook that
		// rule depends on, since jsdom/happy-dom never loads the stylesheet a
		// component-level render test runs under.
		const { container } = render(<ListingRows items={ITEMS} />);
		for (const row of container.querySelectorAll("[data-row]")) {
			expect(row.hasAttribute("data-arrow-host")).toBe(true);
		}
	});

	it("declares its own band cap with no horizontal padding on that object", () => {
		expect(SOURCE).toMatch(/maxWidth:\s*"var\(--max-width\)"/);
	});

	it("draws hairlines between rows only -- never around them", () => {
		// The union of "top border on every row but the first" is 0 borders on
		// row 1 and none on any row's bottom, which is exactly what
		// `[data-row]:not(:first-child) { border-top: ... }` produces with no
		// companion rule needed. Read from the raw stylesheet rather than a
		// jsdom computed style, for the same reason the arrow-host test above
		// does: happy-dom never loads `families.css` for a bare component
		// render.
		expect(FAMILIES_CSS).toMatch(
			/\[data-listing-rows\]\s*>\s*\[data-row\]:not\(:first-child\)\s*\{\s*border-top:\s*var\(--rule-width\)\s*solid\s*var\(--rule\);?\s*\}/,
		);
		expect(FAMILIES_CSS).not.toMatch(/\[data-row\][^{]*\{[^}]*border-bottom/);
	});

	it("declares no bare unstyled underline utility", () => {
		expect(CODE_ONLY).not.toMatch(/\bunderline\b/);
	});
});
