import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/design/chrome/SiteFooter";

const PROPS = {
	bio: "Every conversion runs in your browser.",
	socials: [{ href: "https://example.com", label: "GitHub" }],
	contact: [{ href: "mailto:a@b.c", label: "Email" }],
	credit: "2026",
};

describe("SiteFooter", () => {
	it("inverts by redefining tokens locally, not by overriding children", () => {
		// ErrorPanel's hand-inversion caused two defects: the global
		// focus-visible outline resolved to the page's --ink and drew black
		// on black, and --rule was unreachable so its divider rendered at
		// full opacity. Redefining the tokens on the root fixes both for
		// every descendant at once.
		const { container } = render(<SiteFooter {...PROPS} />);
		const footer = container.querySelector("footer") as HTMLElement;
		expect(footer.style.getPropertyValue("--ground")).toBe("var(--terminal)");
		expect(footer.style.getPropertyValue("--ink")).toBe("var(--terminal-ink)");
		expect(footer.style.getPropertyValue("--rule")).toBe(
			"var(--terminal-rule)",
		);
	});

	it("paints itself from the redefined tokens", () => {
		const { container } = render(<SiteFooter {...PROPS} />);
		const footer = container.querySelector("footer") as HTMLElement;
		expect(footer.style.background).toBe("var(--ground)");
		expect(footer.style.color).toBe("var(--ink)");
	});

	it("overrides no descendant colour", () => {
		// Any hardcoded child colour is the bug this pattern exists to stop.
		const { container } = render(<SiteFooter {...PROPS} />);
		for (const el of container.querySelectorAll<HTMLElement>("footer *")) {
			expect(el.style.color).toBe("");
		}
	});

	it("leaves keyboard focus visible by letting no descendant redeclare the ground, ink or rule tokens", () => {
		// Mirrors ErrorPanel.test.tsx's "leaves keyboard focus visible by not
		// restoring the page's ink underneath". A descendant re-declaring one
		// of the tokens this footer redefines on its root changes nothing
		// about that element's own rendered colour — `color` is inherited
		// from the root as an already-resolved value, not re-evaluated at
		// the leaf, so the "overrides no descendant colour" test above stays
		// green even when this one doesn't. But it silently redirects
		// `:focus-visible { outline: 1px solid var(--ink) }` for that
		// subtree, reintroducing the invisible-focus defect this whole
		// pattern exists to prevent.
		const { container } = render(<SiteFooter {...PROPS} />);
		for (const el of container.querySelectorAll<HTMLElement>("footer *")) {
			expect(el.style.getPropertyValue("--ground")).toBe("");
			expect(el.style.getPropertyValue("--ink")).toBe("");
			expect(el.style.getPropertyValue("--rule")).toBe("");
		}
	});

	it("renders the brand, bio, socials and contact", () => {
		render(<SiteFooter {...PROPS} />);
		expect(screen.getByText(PROPS.bio)).toBeDefined();
		expect(screen.getByRole("link", { name: "GitHub" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Email" })).toBeDefined();
	});

	it("names its two link groups so they are distinguishable", () => {
		render(<SiteFooter {...PROPS} />);
		expect(screen.getByRole("navigation", { name: /socials/i })).toBeDefined();
		expect(screen.getByRole("navigation", { name: /contact/i })).toBeDefined();
	});
});
