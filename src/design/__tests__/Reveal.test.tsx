import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reveal } from "@/design/primitives/Reveal";

describe("Reveal", () => {
	it("splits into one span per word by default", () => {
		const { container } = render(<Reveal text="convert anything" />);
		const spans = container.querySelectorAll("[data-reveal-part]");
		expect(spans.length).toBe(2);
		expect(spans[0]?.textContent).toBe("convert");
	});

	it("splits into one span per character when asked", () => {
		const { container } = render(<Reveal text="abc" by="char" />);
		expect(container.querySelectorAll("[data-reveal-part]").length).toBe(3);
	});

	it("staggers via an index custom property rather than inline delays", () => {
		// The stagger is a CSS calc over --reveal-i, so the timing lives in
		// the stylesheet with the rest of the motion rather than being
		// recomputed in JS for every span.
		const { container } = render(<Reveal text="a b c" />);
		const spans = container.querySelectorAll<HTMLElement>("[data-reveal-part]");
		expect(spans[0]?.style.getPropertyValue("--reveal-i")).toBe("0");
		expect(spans[2]?.style.getPropertyValue("--reveal-i")).toBe("2");
	});

	it("exposes the whole string to assistive technology, not the fragments", () => {
		// Per-character spans make a screen reader announce a headline letter
		// by letter. The container carries the real text and the fragments
		// are hidden — without this the site's largest type is unusable for
		// anyone who cannot see it.
		render(<Reveal text="convert anything" by="char" />);
		const el = screen.getByLabelText("convert anything");
		expect(el).toBeDefined();
		for (const span of el.querySelectorAll("[data-reveal-part]")) {
			expect(span.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("preserves spacing between word fragments", () => {
		// Splitting on whitespace and rendering bare spans would run the
		// words together; the rendered text must still read normally when
		// copied or read aloud from the DOM.
		const { container } = render(<Reveal text="convert anything" />);
		expect(container.textContent?.replace(/\s+/g, " ").trim()).toBe(
			"convert anything",
		);
	});
});
