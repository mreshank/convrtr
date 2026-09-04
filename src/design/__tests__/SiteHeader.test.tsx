import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "@/design/chrome/SiteHeader";

const LINKS = [
	{ href: "/tools", label: "Tools" },
	{ href: "/blog", label: "Blog" },
];

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
});
