import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteHeader } from "@/design/chrome/SiteHeader";

const LINKS = [
	{ href: "/tools", label: "Tools" },
	{ href: "/blog", label: "Blog" },
];

afterEach(() => {
	document.body.style.overflow = "";
});

describe("SiteHeader", () => {
	it("renders the wordmark as a link home", () => {
		render(<SiteHeader links={LINKS} />);
		expect(
			screen.getByRole("link", { name: "convrtr" }).getAttribute("href"),
		).toBe("/");
	});

	it("keeps the nav closed until asked", () => {
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("link", { name: "Tools" })).toBeNull();
	});

	it("opens and closes the overlay", () => {
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByRole("link", { name: "Tools" })).toBeDefined();
		fireEvent.click(toggle);
		expect(screen.queryByRole("link", { name: "Tools" })).toBeNull();
	});

	it("closes on Escape and returns focus to the toggle", () => {
		// Without this a keyboard user who opens the nav is stranded in it.
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(toggle);
	});

	it("blends with difference so it stays legible over any ground", () => {
		const { container } = render(<SiteHeader links={LINKS} />);
		const header = container.querySelector("header") as HTMLElement;
		expect(header.style.mixBlendMode).toBe("difference");
		expect(header.style.position).toBe("fixed");
	});

	it("renders the overlay outside the blended header, not inside it", () => {
		// mix-blend-mode blends an element and its whole subtree as one group
		// against the page backdrop, and a descendant cannot opt out. Nested
		// inside, the overlay's var(--ground) would paint as its inverse —
		// and no unit test would catch it, because happy-dom composites
		// nothing. This assertion is the only thing standing in the way.
		const { container } = render(<SiteHeader links={LINKS} />);
		fireEvent.click(screen.getByRole("button", { name: /menu/i }));
		const nav = screen.getByRole("navigation", { name: "Main" });
		expect(container.querySelector("header")?.contains(nav)).toBe(false);
	});

	// The tab loop is [wordmark, toggle, ...nav links], in that order,
	// because that is the order the document already puts them in: the
	// wordmark and the toggle both live in the header, which is rendered
	// before the nav. Everything the header draws above the opaque overlay
	// is visible and mouse-clickable while the menu is open, so all of it
	// has to be keyboard-reachable too — and nothing outside the loop may
	// be reachable at all, since the user cannot see it.
	//
	// The trap therefore wraps FIRST to LAST, not toggle to last link. An
	// earlier version hardcoded the toggle as the first element, which left
	// the wordmark visible and clickable but keyboard-unreachable, and let
	// Shift+Tab out of it escape into the content behind the overlay.
	it("wraps Tab forward from the last link back to the wordmark", () => {
		// The overlay is opaque and covers the viewport, so anything Tab
		// would reach outside this loop — page content behind it — is
		// content the user cannot see while the menu is open.
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		const wordmark = screen.getByRole("link", { name: "convrtr" });
		const nav = screen.getByRole("navigation", { name: "Main" });
		const navLinks = within(nav).getAllByRole("link");
		const lastLink = navLinks[navLinks.length - 1] as HTMLElement;
		lastLink.focus();
		fireEvent.keyDown(lastLink, { key: "Tab" });
		expect(document.activeElement).toBe(wordmark);
	});

	it("wraps Shift+Tab from the wordmark back to the last link", () => {
		// The wordmark is drawn above the overlay and is the first thing in
		// the loop, so Shift+Tab out of it must come back round rather than
		// escaping into the page behind.
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		const wordmark = screen.getByRole("link", { name: "convrtr" });
		const nav = screen.getByRole("navigation", { name: "Main" });
		const navLinks = within(nav).getAllByRole("link");
		const lastLink = navLinks[navLinks.length - 1] as HTMLElement;
		wordmark.focus();
		fireEvent.keyDown(wordmark, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(lastLink);
	});

	it("leaves Shift+Tab from the toggle to native order, which reaches the wordmark", () => {
		// The toggle is no longer the first element in the loop, so backward
		// movement out of it is an ordinary step to the wordmark that
		// precedes it in the document. Intercepting it is what made the
		// wordmark unreachable in the first place. happy-dom does not move
		// focus for a synthetic Tab, so what is asserted is that the handler
		// does not cancel the event.
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		toggle.focus();
		const event = new KeyboardEvent("keydown", {
			key: "Tab",
			shiftKey: true,
			bubbles: true,
			cancelable: true,
		});
		toggle.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(toggle);
	});

	it("keeps the loop closed when there are no links at all", () => {
		// With an empty array the loop is just [wordmark, toggle]. The
		// earlier version bailed out when it found no links, which silently
		// turned the trap off and made the opaque overlay escapable — a bug
		// waiting for the first caller to pass a filtered-empty list.
		render(<SiteHeader links={[]} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		const wordmark = screen.getByRole("link", { name: "convrtr" });

		toggle.focus();
		fireEvent.keyDown(toggle, { key: "Tab" });
		expect(document.activeElement).toBe(wordmark);

		wordmark.focus();
		fireEvent.keyDown(wordmark, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(toggle);
	});

	it("locks body scroll while open and restores the prior value on close", () => {
		// Restoring to whatever was there before — not assuming blank —
		// matters because something else may set this value later.
		document.body.style.overflow = "scroll";
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		expect(document.body.style.overflow).toBe("hidden");
		fireEvent.click(toggle);
		expect(document.body.style.overflow).toBe("scroll");
	});

	it("restores body scroll on unmount while still open", () => {
		document.body.style.overflow = "scroll";
		const { unmount } = render(<SiteHeader links={LINKS} />);
		fireEvent.click(screen.getByRole("button", { name: /menu/i }));
		expect(document.body.style.overflow).toBe("hidden");
		unmount();
		expect(document.body.style.overflow).toBe("scroll");
	});
});
