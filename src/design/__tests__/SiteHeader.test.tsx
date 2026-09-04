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

	it("wraps Tab forward from the last link back to the toggle", () => {
		// The overlay is opaque and covers the viewport, so anything Tab
		// would reach outside this loop — page content behind it — is
		// content the user cannot see while the menu is open.
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		const nav = screen.getByRole("navigation", { name: "Main" });
		const navLinks = within(nav).getAllByRole("link");
		const lastLink = navLinks[navLinks.length - 1] as HTMLElement;
		lastLink.focus();
		fireEvent.keyDown(lastLink, { key: "Tab" });
		expect(document.activeElement).toBe(toggle);
	});

	it("wraps Shift+Tab from the toggle back to the last link", () => {
		// The toggle is the close affordance and stays visible above the
		// overlay, so it belongs inside the loop rather than outside it.
		render(<SiteHeader links={LINKS} />);
		const toggle = screen.getByRole("button", { name: /menu/i });
		fireEvent.click(toggle);
		const nav = screen.getByRole("navigation", { name: "Main" });
		const navLinks = within(nav).getAllByRole("link");
		const lastLink = navLinks[navLinks.length - 1] as HTMLElement;
		toggle.focus();
		fireEvent.keyDown(toggle, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(lastLink);
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
