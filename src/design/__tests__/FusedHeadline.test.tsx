import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FusedHeadline } from "@/design/families/FusedHeadline";

describe("FusedHeadline", () => {
	it("keeps both clauses inside one heading element", () => {
		// v2 rejects splitting the continuation into a subhead below. If the
		// muted clause escapes the heading, the pattern is gone.
		render(<FusedHeadline lead="Convert anything." cont="Nothing uploads." />);
		const heading = screen.getByRole("heading");
		// Non-breaking space between clauses prevents break at clause boundary.
		expect(heading.textContent).toBe("Convert anything. Nothing uploads.");
		expect(heading.querySelectorAll("span").length).toBe(2);
	});

	it("carries the emphasis in colour, not in weight", () => {
		const { container } = render(
			<FusedHeadline lead="Convert anything." cont="Nothing uploads." />,
		);
		const heading = container.querySelector("h2") as HTMLElement;
		const [lead, cont] = [...heading.querySelectorAll("span")] as HTMLElement[];
		expect(heading.style.fontWeight).toBe("400");
		expect(lead?.style.color).toBe("var(--ink)");
		expect(cont?.style.color).toBe("var(--ink-muted)");
	});

	it("renders as h1 when asked, for the one per page that should be", () => {
		render(<FusedHeadline as="h1" lead="a" cont="b" />);
		expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
	});

	it("uses the headline scale, not a literal size", () => {
		const { container } = render(<FusedHeadline lead="a" cont="b" />);
		const heading = container.querySelector("h2") as HTMLElement;
		expect(heading.style.fontSize).toBe("var(--headline-size)");
		expect(heading.style.letterSpacing).toBe("var(--headline-tracking)");
	});
});
