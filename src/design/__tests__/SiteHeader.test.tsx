import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/design/chrome/SiteHeader";

const LINKS = [
	{ href: "/tools", label: "Tools" },
	{ href: "/blog", label: "Blog" },
];
const CTA = { href: "/tools", label: "Start converting" };

describe("SiteHeader", () => {
	it("is a sticky edge-to-edge bar at v2's height", () => {
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		const header = container.querySelector("header") as HTMLElement;
		expect(header.style.position).toBe("sticky");
		// `position: sticky` with no inset does not stick to anything — it
		// stays in flow and scrolls away like any other block. The offset is
		// the whole mechanism, so it is asserted alongside the position.
		expect(header.style.top).toBe("0px");
		expect(header.style.height).toBe("var(--navbar-height)");
		expect(header.style.background).toBe("var(--ground)");
	});

	it("has square corners, per v2's structural zero radius", () => {
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		const header = container.querySelector("header") as HTMLElement;
		expect(header.style.borderRadius).toBe("");
	});

	it("does not blend — v2's bar states its own colour", () => {
		// The previous system used mix-blend-mode: difference so one header
		// could sit over a white page and a dark footer. v2 has one black
		// canvas, so the bar simply is black.
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		expect(
			(container.querySelector("header") as HTMLElement).style.mixBlendMode,
		).toBe("");
	});

	it("carries a hairline rule along its bottom edge", () => {
		// The bar and the canvas below it are the same black. Without the
		// rule there is nothing on the page that says where the navbar ends.
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		const header = container.querySelector("header") as HTMLElement;
		expect(header.style.borderBottomWidth).toBe("var(--rule-width)");
		expect(header.style.borderBottomStyle).toBe("solid");
		expect(header.style.borderBottomColor).toBe("var(--rule)");
		// The rule sits inside the 64px, not on top of it: `--navbar-height`
		// is what anything offsetting itself below this bar will use, and a
		// content-box header would occupy 65.
		expect(header.style.boxSizing).toBe("border-box");
	});

	it("renders the CTA as a pill", () => {
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const cta = screen.getByRole("link", { name: CTA.label });
		expect(cta.style.borderRadius).toBe("var(--radius-pill)");
	});

	it("fills the CTA from the palette rather than a literal white", () => {
		// v2 specifies #FFFFFF on #000000 for the navbar CTA, which is
		// exactly `--ink` on `--ground`. Writing the literals instead would
		// need this file exempted from the palette guard again — the
		// exemption the difference blend used to justify.
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const cta = screen.getByRole("link", { name: CTA.label });
		expect(cta.style.background).toBe("var(--ink)");
		expect(cta.style.color).toBe("var(--ground)");
	});

	it("renders the wordmark as a link home", () => {
		render(<SiteHeader links={LINKS} cta={CTA} />);
		expect(
			screen.getByRole("link", { name: "convrtr" }).getAttribute("href"),
		).toBe("/");
	});

	it("renders every nav link", () => {
		render(<SiteHeader links={LINKS} cta={CTA} />);
		for (const link of LINKS) {
			expect(screen.getByRole("link", { name: link.label })).toBeDefined();
		}
	});

	it("draws the nav links as v2's nav-utility controls", () => {
		// DESIGN.v2.md:137 — transparent fill, white text, 4px radius, 23px
		// tall. That is the one place `--radius-control` is spent in this
		// system, and it is visible: the global focus ring is the only thing
		// that ever draws this control's shape, and an outline's corner
		// radius is the element's own grown by the offset — 4px + 2px, so a
		// keyboard user sees a 6px corner derived from this value.
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const link = screen.getByRole("link", { name: "Tools" });
		expect(link.style.borderRadius).toBe("var(--radius-control)");
		expect(link.style.background).toBe("transparent");
		expect(link.style.height).toBe("23px");
	});

	it("reserves room for the focus ring on every side of the scrolling nav", () => {
		// `overflow-x: auto` cannot be scoped to one axis — `overflow-y`
		// computes to `auto` alongside it, making the nav a clipping box on
		// all four sides. The links were exactly as tall as the row and the
		// outermost two sat flush against its ends, so the global
		// `:focus-visible` ring (1px at `outline-offset: 2px`, so 2-3px
		// outside the control) was clipped away and a keyboard user saw a
		// stray hairline instead of a ring. Measured on the real export
		// before the padding, ring pixels in the 1-4px annulus as
		// top/bottom/left/right: 0/0/0/29 around the first nav link and
		// 0/1/28/0 around the last.
		//
		// This is a structural assertion, not a visual one: happy-dom
		// composites nothing, so it cannot see an outline clipped or drawn.
		// What it can hold is that the scroll container still reserves room
		// on every side, which is the line that was crossed.
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		const nav = container.querySelector(
			'nav[aria-label="Main"]',
		) as HTMLElement;
		expect(nav.style.overflowX).toBe("auto");
		for (const side of [
			nav.style.paddingTop,
			nav.style.paddingBottom,
			nav.style.paddingLeft,
			nav.style.paddingRight,
		]) {
			expect(side).toBe("var(--space-base)");
		}
	});

	it("puts the nav links in the document without a disclosure", () => {
		// The shape decision, asserted. v2's bar holds its nav inline, so
		// nothing here covers page content — and so this component owns no
		// open/closed state, no focus trap and no scroll lock. If a future
		// change adds a control that opens a panel over the page, this fails
		// and whoever wrote it has to decide about containment deliberately
		// rather than inherit an overlay with no trap behind it.
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		expect(screen.queryByRole("button")).toBeNull();
		const nav = screen.getByRole("navigation", { name: "Main" });
		expect(within(nav).getAllByRole("link")).toHaveLength(LINKS.length);
		// Inline nav is a child of the bar, unlike the old overlay, which had
		// to be a sibling to escape the blend group.
		expect(
			(container.querySelector("header") as HTMLElement).contains(nav),
		).toBe(true);
	});

	it("leaves body scroll alone", () => {
		// The overlay locked it, because the page behind an opaque
		// full-viewport panel must not scroll. A 64px bar covers nothing, so
		// locking would be a bug rather than a courtesy.
		document.body.style.overflow = "scroll";
		render(<SiteHeader links={LINKS} cta={CTA} />);
		expect(document.body.style.overflow).toBe("scroll");
		document.body.style.overflow = "";
	});

	it("renders with no links at all", () => {
		// The old trap had a guard that silently stopped intercepting on an
		// empty array. There is no trap now, but an empty list still has to
		// render the bar rather than throw — a caller filtering a list down
		// to nothing is ordinary.
		render(<SiteHeader links={[]} cta={CTA} />);
		expect(screen.getByRole("link", { name: "convrtr" })).toBeDefined();
		expect(screen.getByRole("link", { name: CTA.label })).toBeDefined();
		const nav = screen.getByRole("navigation", { name: "Main" });
		expect(within(nav).queryAllByRole("link")).toHaveLength(0);
	});
});
