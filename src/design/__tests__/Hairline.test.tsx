import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hairline } from "@/design/primitives/Hairline";

describe("Hairline", () => {
	it("renders a presentational rule at the system's border width", () => {
		const { container } = render(<Hairline />);
		const el = container.firstElementChild as HTMLElement | null;
		expect(el?.tagName).toBe("HR");
		expect(el?.style.borderTopWidth).toBe("var(--rule-width)");
		expect(el?.style.borderTopColor).toBe("var(--rule)");
	});

	it("draws the rule on the top edge only", () => {
		// `border: 0` clears the browser's default hr border, so every edge
		// is present at zero width — the thing worth asserting is that only
		// the top edge is given the rule's colour back. Both width and colour
		// must be checked on all three non-top edges: width alone is escapable
		// (someone could add style properties without colour), colour alone is
		// escapable (currentColor would render a line in --ink). Together they
		// prove the primitive cannot become a box.
		const { container } = render(<Hairline />);
		const el = container.firstElementChild as HTMLElement | null;
		expect(el?.style.borderTopColor).toBe("var(--rule)");
		// Bottom edge: must have zero width and not the rule colour
		expect(el?.style.borderBottomWidth).toBe("0px");
		expect(el?.style.borderBottomColor).not.toBe("var(--rule)");
		// Left edge: must have zero width and not the rule colour
		expect(el?.style.borderLeftWidth).toBe("0px");
		expect(el?.style.borderLeftColor).not.toBe("var(--rule)");
		// Right edge: must have zero width and not the rule colour
		expect(el?.style.borderRightWidth).toBe("0px");
		expect(el?.style.borderRightColor).not.toBe("var(--rule)");
	});
});
