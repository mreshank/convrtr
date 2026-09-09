import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProseSection } from "@/design/families/ProseSection";

// FusedHeadline joins its two clauses with a non-breaking space (see
// FusedHeadline.tsx), not a plain one -- a plain space there would let the
// muted clause wrap onto its own line, the subhead pattern v2 rejects.
const NBSP = " ";

describe("ProseSection", () => {
	it("renders the eyebrow in the mono voice", () => {
		const { container } = render(
			<ProseSection eyebrow="STATIC EXPORT" lead="a" cont="b">
				<p>body</p>
			</ProseSection>,
		);
		const eyebrow = container.querySelector("p.meta") as HTMLElement;
		expect(eyebrow).not.toBeNull();
		expect(eyebrow.textContent).toBe("STATIC EXPORT");
		expect(eyebrow.className).toContain("meta");
	});

	it("renders the headline as a FusedHeadline at h2, both clauses in one heading", () => {
		render(
			<ProseSection lead="Converts locally." cont="Nothing uploads.">
				<p>body</p>
			</ProseSection>,
		);
		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading.textContent).toBe(
			`Converts locally.${NBSP}Nothing uploads.`,
		);
		expect(heading.querySelectorAll("span").length).toBe(2);
	});

	it("carries the fused headline's colour split, lead in ink and continuation muted", () => {
		const { container } = render(
			<ProseSection lead="a" cont="b">
				<p>body</p>
			</ProseSection>,
		);
		const heading = container.querySelector("h2") as HTMLElement;
		const [lead, cont] = [...heading.querySelectorAll("span")] as HTMLElement[];
		expect(lead?.style.color).toBe("var(--ink)");
		expect(cont?.style.color).toBe("var(--ink-muted)");
	});

	it("sits body content in a slot with no width of its own, so it inherits the ambient prose measure", () => {
		const { container } = render(
			<ProseSection lead="a" cont="b">
				<p>body copy</p>
			</ProseSection>,
		);
		const body = container.querySelector("[data-section-body]") as HTMLElement;
		expect(body).not.toBeNull();
		expect(body.style.maxWidth).toBe("");
		expect(body.textContent).toContain("body copy");
	});

	it("renders correctly with no eyebrow, since not every section needs one", () => {
		const { container } = render(
			<ProseSection lead="a" cont="b">
				<p>body</p>
			</ProseSection>,
		);
		expect(container.querySelector("p.meta")).toBeNull();
		expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
			`a${NBSP}b`,
		);
	});
});
