import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonoMeta } from "@/design/primitives/MonoMeta";

describe("MonoMeta", () => {
	it("renders its children", () => {
		render(<MonoMeta>image · lossless · 2026</MonoMeta>);
		expect(screen.getByText("image · lossless · 2026")).toBeDefined();
	});

	it("carries the .meta class, not an ad-hoc treatment", () => {
		// `.meta` is v2's `label-mono` — 13px, weight 400, no uppercase, no
		// letter-spacing — declared in tokens.css. Hand-rolling those values
		// in a className is the drift this primitive exists to stop, and it
		// is why `.mono` deliberately does NOT uppercase: it renders
		// filenames, and uppercasing one would misreport the user's file.
		const { container } = render(<MonoMeta>lossless</MonoMeta>);
		const el = container.firstElementChild;
		expect(el?.className).toContain("meta");
		expect(el?.className).not.toMatch(/text-\[|tracking-\[|uppercase/);
	});

	it("renders a span by default and honours `as`", () => {
		const { container: span } = render(<MonoMeta>a</MonoMeta>);
		expect(span.firstElementChild?.tagName).toBe("SPAN");

		const { container: div } = render(<MonoMeta as="div">b</MonoMeta>);
		expect(div.firstElementChild?.tagName).toBe("DIV");
	});
});
