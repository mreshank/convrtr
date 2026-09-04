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
