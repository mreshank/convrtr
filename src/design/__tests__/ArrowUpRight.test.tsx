import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

describe("ArrowUpRight", () => {
	it("is hidden from assistive technology", () => {
		// It sits beside a link that already names its destination; announcing
		// "arrow" after that is noise, not information.
		const { container } = render(<ArrowUpRight />);
		expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});

	it("draws in currentColor so it inherits whatever ground it sits on", () => {
		// Including an inverted one — the footer redefines --ink locally, and
		// a hardcoded token would not follow.
		const { container } = render(<ArrowUpRight />);
		expect(container.querySelector("path")?.getAttribute("stroke")).toBe(
			"currentColor",
		);
	});

	it("is marked so the stylesheet can reveal it on parent hover", () => {
		const { container } = render(<ArrowUpRight />);
		expect(container.querySelector("[data-arrow]")).not.toBeNull();
	});

	it("honours a custom size", () => {
		const { container } = render(<ArrowUpRight size={32} />);
		expect(container.querySelector("svg")?.getAttribute("width")).toBe("32");
	});
});
