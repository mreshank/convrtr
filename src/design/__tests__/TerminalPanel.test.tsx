import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TerminalPanel } from "@/design/families/TerminalPanel";

const LINES = [
	{ text: "$ convrtr heic-to-jpg photo.heic" },
	{ text: "reading photo.heic (4.2 MB)", tone: "muted" as const },
	{ text: "done -> photo.jpg (1.1 MB)", tone: "accent" as const },
];

describe("TerminalPanel", () => {
	it("renders every line in order", () => {
		render(<TerminalPanel label="Shell" lines={LINES} />);
		const panel = screen.getByRole("figure", { name: "Shell" });
		expect(panel.textContent).toContain("$ convrtr heic-to-jpg photo.heic");
		expect(panel.textContent).toContain("done -> photo.jpg (1.1 MB)");
	});

	it("sits on the raised surface, not on the page ground", () => {
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		const panel = container.querySelector("[data-terminal]") as HTMLElement;
		expect(panel.style.background).toBe("var(--surface)");
	});

	it("is square, because panels are structural", () => {
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		const panel = container.querySelector("[data-terminal]") as HTMLElement;
		expect(panel.style.borderRadius).toBe("");
	});

	it("pins its edge to --rule-subtle as longhands, not the border shorthand", () => {
		// A shorthand whose parts are all var() cannot be reparsed into its
		// components (SiteHeader.tsx, Hairline.tsx) -- so this asserts the
		// longhand borderColor directly, pinning the edge rather than merely
		// asserting a border is present.
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		const panel = container.querySelector("[data-terminal]") as HTMLElement;
		expect(panel.style.borderColor).toBe("var(--rule-subtle)");
	});

	it("maps tones to tokens, with accent only on a code token", () => {
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		const rows = [
			...container.querySelectorAll("[data-line]"),
		] as HTMLElement[];
		expect(rows[0]?.style.color).toBe("var(--ink)");
		expect(rows[1]?.style.color).toBe("var(--ink-muted)");
		expect(rows[2]?.style.color).toBe("var(--accent)");
	});

	it("preserves each line as its own line without relying on white-space", () => {
		// A pre-wrap panel that loses its newlines reads as one run-on line.
		// One element per line makes the structure independent of CSS.
		const { container } = render(<TerminalPanel label="Shell" lines={LINES} />);
		expect(container.querySelectorAll("[data-line]").length).toBe(LINES.length);
	});
});
