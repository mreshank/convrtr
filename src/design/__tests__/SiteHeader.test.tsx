import { readFileSync } from "node:fs";
import {
	act,
	createEvent,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
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

	it("puts the nav links behind a disclosure, and contains it", () => {
		// The shape decision, asserted — and it has been made twice now. This
		// test used to require that NO control here opened a panel, so that
		// anyone adding one had to argue for the containment rather than
		// inherit an overlay with no trap behind it. The argument was made:
		// at 375px the inline row gave seven destinations 59 visible pixels
		// (`scrollWidth` 682, `clientWidth` 59, measured on the built
		// export), which is a hidden nav with no affordance rather than a
		// nav row. So the disclosure is back and this test flipped with it —
		// it now asserts the containment is actually PRESENT, so removing
		// any part of it fails here rather than shipping a panel with a hole
		// in it. The behaviour of each piece is checked in the tests below;
		// this one holds the wiring.
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);

		const toggle = screen.getByRole("button", { name: "Menu" });
		expect(toggle.getAttribute("type")).toBe("button");
		expect(toggle.getAttribute("aria-expanded")).toBe("false");

		// One nav, not two. A second copy rendered for narrow viewports would
		// duplicate the landmark and every link in the accessibility tree at
		// every width, which is the failure this asserts against directly
		// rather than by counting rendered links alone.
		expect(container.querySelectorAll('nav[aria-label="Main"]')).toHaveLength(
			1,
		);
		const nav = screen.getByRole("navigation", { name: "Main" });
		expect(within(nav).getAllByRole("link")).toHaveLength(LINKS.length);
		expect(container.querySelectorAll("a[href='/tools']")).toHaveLength(2);

		// `aria-controls` has to point at the panel it opens, and the panel
		// has to be that same single nav.
		expect(toggle.getAttribute("aria-controls")).toBe(nav.id);
		expect(nav.id).not.toBe("");

		// The glyph carries no name of its own — the button's is "Menu" and
		// `aria-expanded` says which state it is in, so an announced glyph
		// would only repeat them.
		const glyph = toggle.querySelector("svg") as SVGElement;
		expect(glyph.getAttribute("aria-hidden")).toBe("true");

		// Still a child of the bar, unlike the old overlay, which had to be a
		// sibling to escape the blend group.
		expect(
			(container.querySelector("header") as HTMLElement).contains(nav),
		).toBe(true);
	});

	it("marks the panel open on the nav the toggle controls", () => {
		// `data-open` is not decoration: it is the hook `chrome.css` restyles
		// the row into a panel through, and the selector that gives the nav
		// `display: none` when it is absent below 600px. happy-dom composites
		// nothing, so the attribute is the only part of that a unit test can
		// hold; the paint is measured in Chromium.
		const { container } = render(<SiteHeader links={LINKS} cta={CTA} />);
		const nav = container.querySelector(
			'nav[aria-label="Main"]',
		) as HTMLElement;
		const toggle = screen.getByRole("button", { name: "Menu" });

		expect(nav.hasAttribute("data-open")).toBe(false);
		fireEvent.click(toggle);
		expect(nav.hasAttribute("data-open")).toBe(true);
		expect(toggle.getAttribute("aria-expanded")).toBe("true");
		fireEvent.click(toggle);
		expect(nav.hasAttribute("data-open")).toBe(false);
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
	});

	it("closes on Escape and gives focus back to the toggle", () => {
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const toggle = screen.getByRole("button", { name: "Menu" });
		fireEvent.click(toggle);
		screen.getByRole("link", { name: "Tools" }).focus();

		fireEvent.keyDown(document, { key: "Escape" });

		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(toggle);
	});

	it("closes when a link is followed, and gives focus back to the toggle", () => {
		// Without this the menu stays open over the page it just navigated
		// to: a client-side route change never unmounts this component, so
		// nothing else would ever close it.
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const toggle = screen.getByRole("button", { name: "Menu" });
		fireEvent.click(toggle);

		fireEvent.click(screen.getByRole("link", { name: "Blog" }));

		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(toggle);
	});

	it("cycles Tab and Shift+Tab within the toggle and the panel", () => {
		// The trap. The cycle is [toggle, ...panel links] — the toggle
		// belongs in it because it is the control that closes the panel, so
		// a keyboard user who tabs past the last link arrives somewhere they
		// can get out from rather than on the page behind.
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const toggle = screen.getByRole("button", { name: "Menu" });
		fireEvent.click(toggle);
		const last = screen.getByRole("link", { name: "Blog" });
		const first = screen.getByRole("link", { name: "Tools" });

		last.focus();
		fireEvent.keyDown(document, { key: "Tab" });
		expect(document.activeElement).toBe(toggle);

		fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(last);

		// And focus that has somehow left the cycle entirely — the wordmark,
		// the CTA, the page behind — is pulled back into it rather than
		// allowed to walk on.
		screen.getByRole("link", { name: CTA.label }).focus();
		fireEvent.keyDown(document, { key: "Tab" });
		expect(document.activeElement).toBe(toggle);

		// Interior steps are left to the browser. The handler only intervenes
		// at the two ends of the cycle, so Shift+Tab off the first LINK —
		// which is the second element of the cycle, the toggle being the
		// first — is not intercepted at all, and sequential navigation does
		// the ordinary thing. Asserted on `defaultPrevented` rather than on
		// focus, because happy-dom moves focus for no Tab key at all: only
		// the event's own state can tell an untouched keystroke apart from a
		// handled one here.
		first.focus();
		const interior = createEvent.keyDown(document, {
			key: "Tab",
			shiftKey: true,
		});
		fireEvent(document, interior);
		expect(interior.defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(first);
	});

	it("still traps Tab when there are no links to trap", () => {
		// The old overlay's trap had a guard that silently stopped
		// intercepting on an empty array, which is a trap that is not a
		// trap. This one cannot: the toggle is always the first element of
		// the cycle, so an empty list traps Tab on the toggle itself.
		render(<SiteHeader links={[]} cta={CTA} />);
		const toggle = screen.getByRole("button", { name: "Menu" });
		fireEvent.click(toggle);

		screen.getByRole("link", { name: "convrtr" }).focus();
		fireEvent.keyDown(document, { key: "Tab" });
		expect(document.activeElement).toBe(toggle);
	});

	it("locks body scroll while open and restores exactly what was there", () => {
		// Restores the PREVIOUS value, not the empty string: a page that had
		// deliberately set an overflow on the body would otherwise have it
		// silently deleted by opening and closing the menu.
		document.body.style.overflow = "scroll";
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const toggle = screen.getByRole("button", { name: "Menu" });

		fireEvent.click(toggle);
		expect(document.body.style.overflow).toBe("hidden");
		fireEvent.click(toggle);
		expect(document.body.style.overflow).toBe("scroll");
		document.body.style.overflow = "";
	});

	it("restores body scroll when it unmounts while open", () => {
		// A header removed from the tree mid-open must not leave the document
		// unscrollable. React runs the effect cleanup on unmount as well as on
		// close, so one `return` covers both — asserted because "both" is the
		// part that is easy to lose.
		document.body.style.overflow = "";
		const { unmount } = render(<SiteHeader links={LINKS} cta={CTA} />);
		fireEvent.click(screen.getByRole("button", { name: "Menu" }));
		expect(document.body.style.overflow).toBe("hidden");

		unmount();

		expect(document.body.style.overflow).toBe("");
	});

	it("closes when the viewport crosses back above the collapsed width", () => {
		// The failure most likely to be missed, so it is tested directly:
		// open at 375px, rotate to landscape or drag the window wide, and
		// without this listener `open` stays true over a nav that CSS has
		// already put back inline — a focus trap running on a desktop row,
		// with the page behind it unscrollable and no visible panel to
		// explain why.
		//
		// `matchMedia` is stubbed rather than driven, because happy-dom
		// resolves media queries against a viewport this test cannot resize
		// meaningfully — and what is under test is the subscription, not the
		// browser's evaluation of `(max-width: 600px)`.
		const listeners = new Set<() => void>();
		const query = {
			matches: true,
			media: "(max-width: 600px)",
			addEventListener: (_: string, listener: () => void) =>
				void listeners.add(listener),
			removeEventListener: (_: string, listener: () => void) =>
				void listeners.delete(listener),
		};
		const original = window.matchMedia;
		window.matchMedia = (() => query) as unknown as typeof window.matchMedia;
		try {
			render(<SiteHeader links={LINKS} cta={CTA} />);
			const toggle = screen.getByRole("button", { name: "Menu" });
			fireEvent.click(toggle);
			expect(toggle.getAttribute("aria-expanded")).toBe("true");

			// The viewport crosses above 600px.
			query.matches = false;
			act(() => {
				for (const listener of listeners) listener();
			});

			expect(toggle.getAttribute("aria-expanded")).toBe("false");
			expect(document.body.style.overflow).toBe("");
		} finally {
			window.matchMedia = original;
		}
	});

	it("subscribes to the same width chrome.css collapses at", () => {
		// The two cannot be made to agree by a mechanism — a custom property
		// is not usable in a media feature, and `matchMedia` takes a string,
		// not a `var()`. So the agreement is asserted instead: the query the
		// component subscribes to has to be the one the stylesheet switches
		// on, or a resize past the boundary changes the layout without
		// telling the component.
		const queries: string[] = [];
		const original = window.matchMedia;
		window.matchMedia = ((media: string) => {
			queries.push(media);
			return {
				matches: true,
				media,
				addEventListener: () => {},
				removeEventListener: () => {},
			};
		}) as unknown as typeof window.matchMedia;
		try {
			render(<SiteHeader links={LINKS} cta={CTA} />);
		} finally {
			window.matchMedia = original;
		}
		expect(queries).toEqual(["(max-width: 600px)"]);
		expect(readFileSync("src/design/chrome/chrome.css", "utf8")).toContain(
			"@media (max-width: 600px)",
		);
	});

	it("keeps the toggle's visibility in the stylesheet, not inline", () => {
		// An inline `display` on the toggle would out-rank the media query
		// that hides it above 600px and force `!important` onto that rule.
		// It is also the failure-safe direction: with the stylesheet missing
		// the toggle stays hidden beside a nav that is still its inline row.
		render(<SiteHeader links={LINKS} cta={CTA} />);
		const toggle = screen.getByRole("button", { name: "Menu" });
		expect(toggle.style.display).toBe("");
		const chrome = readFileSync("src/design/chrome/chrome.css", "utf8");
		expect(chrome).toMatch(/\[data-site-nav-toggle\]\s*\{\s*display:\s*none;/);
		expect(readFileSync("src/app/globals.css", "utf8")).toContain(
			'@import "../design/chrome/chrome.css";',
		);
	});

	it("leaves body scroll alone while it is closed", () => {
		// The panel locks it, because the page behind an opaque full-viewport
		// panel must not scroll. A closed 64px bar covers nothing, so locking
		// there would be a bug rather than a courtesy — and that is the state
		// every viewport above 600px is permanently in.
		document.body.style.overflow = "scroll";
		render(<SiteHeader links={LINKS} cta={CTA} />);
		expect(document.body.style.overflow).toBe("scroll");
		document.body.style.overflow = "";
	});

	it("renders a mega-menu trigger instead of a plain link for a megaMenu item", () => {
		const links = [
			{ href: "/tools", label: "Tools", megaMenu: true },
			{ href: "/blog", label: "Blog" },
		];
		render(<SiteHeader links={links} cta={CTA} />);

		const trigger = screen.getByRole("link", { name: "Tools" });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(screen.getByRole("link", { name: "Blog" })).toBeDefined();
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
