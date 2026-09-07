import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DisplayHeadline } from "@/design/primitives/DisplayHeadline";

describe("DisplayHeadline", () => {
	it("renders a real heading with the text as its accessible name", () => {
		render(<DisplayHeadline text="convert anything" />);
		expect(
			screen.getByRole("heading", { name: "convert anything", level: 1 }),
		).toBeDefined();
	});

	it("renders as h2 when asked", () => {
		render(<DisplayHeadline text="all tools" as="h2" />);
		expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
	});

	it("takes its size and metrics from tokens, not literals", () => {
		const { container } = render(<DisplayHeadline text="a" />);
		const heading = container.querySelector("h1") as HTMLElement | null;
		expect(heading?.style.fontSize).toBe("var(--display-size)");
		expect(heading?.style.letterSpacing).toBe("var(--display-tracking)");
		expect(heading?.style.lineHeight).toBe("var(--display-leading)");
	});

	it("renders display type at weight 400, not 700", () => {
		// v2 specifies 400 for both display sizes. The previous system used
		// 700, and this is the most visible typographic difference between
		// them — worth pinning rather than leaving to a token nobody reads.
		const { container } = render(<DisplayHeadline text="a" />);
		expect(
			(container.querySelector("h1") as HTMLElement).style.fontWeight,
		).toBe("400");
	});

	it("reveals per character", () => {
		const { container } = render(<DisplayHeadline text="abc" />);
		expect(container.querySelectorAll("[data-reveal-part]").length).toBe(3);
	});
});
