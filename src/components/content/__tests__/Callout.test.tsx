import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "../Callout";

describe("Callout", () => {
	it("labels a note callout and renders its body", () => {
		render(<Callout kind="note">Body text</Callout>);
		expect(screen.getByText("Note")).toBeDefined();
		expect(screen.getByText("Body text")).toBeDefined();
	});

	it("labels a warning callout and renders its body", () => {
		render(<Callout kind="warning">Careful</Callout>);
		expect(screen.getByText("Warning")).toBeDefined();
		expect(screen.getByText("Careful")).toBeDefined();
	});
});

/**
 * The branch's central claim is that fidelity and severity survive the loss
 * of colour as stroke and fill. Until now nothing asserted it: this file's
 * warning test was titled "distinctly from a note" and proved only that the
 * word differed — which is exactly the "distinguishable by label alone"
 * standard spec §4.5 treats as a defect.
 */
describe("monochrome state encoding", () => {
	function border(kind: "note" | "warning") {
		const { unmount } = render(<Callout kind={kind}>Body</Callout>);
		const el = screen.getByRole("note");
		const style = { color: el.style.borderColor, stroke: el.style.borderStyle };
		unmount();
		return style;
	}

	it("draws a warning with a dashed stroke and a note with a solid one", () => {
		expect(border("warning").stroke).toBe("dashed");
		expect(border("note").stroke).toBe("solid");
	});

	it("gives the warning the heavier of the two weights", () => {
		// Both halves matter. A note is a neutral aside and belongs on the
		// system's 10% hairline like every other rule; at full-strength --ink
		// it outweighed ToolCTA — the page's actual call to action — in
		// adjacent MDX. Warning keeps --ink, so the two now differ by weight
		// *and* by dash rather than by dash alone.
		expect(border("warning").color).toBe("var(--ink)");
		expect(border("note").color).toBe("var(--rule)");
	});
});
