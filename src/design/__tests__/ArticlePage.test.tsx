import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticlePage } from "@/design/templates/ArticlePage";

describe("ArticlePage", () => {
	it("renders the title as the page's h1", () => {
		render(
			<ArticlePage title="Why HEIC" dateline="4 September 2026">
				<p>body</p>
			</ArticlePage>,
		);
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Why HEIC",
		);
	});

	it("renders the dateline in the mono voice", () => {
		const { container } = render(
			<ArticlePage title="x" dateline="4 September 2026">
				<p>body</p>
			</ArticlePage>,
		);
		const dateline = container.querySelector("[data-dateline]") as HTMLElement;
		expect(dateline.textContent).toBe("4 September 2026");
		expect(dateline.className).toContain("mono");
	});

	it("constrains the body to a prose measure, not the page max-width", () => {
		// Body copy at 1600px is unreadable. This is the one width in the
		// system that is not var(--max-width).
		const { container } = render(
			<ArticlePage title="x" dateline="y">
				<p>body</p>
			</ArticlePage>,
		);
		const prose = container.querySelector("[data-prose]") as HTMLElement;
		expect(prose).not.toBeNull();
		expect(prose.style.maxWidth).toBe("");
	});

	it("omits the related slot entirely when not given one", () => {
		const { container } = render(
			<ArticlePage title="x" dateline="y">
				<p>body</p>
			</ArticlePage>,
		);
		expect(container.querySelector("[data-related]")).toBeNull();
	});

	it("renders the related slot when given one", () => {
		render(
			<ArticlePage title="x" dateline="y" related={<nav data-testid="rel" />}>
				<p>body</p>
			</ArticlePage>,
		);
		expect(screen.getByTestId("rel")).toBeDefined();
	});

	it("renders a space-efficient section grid when given sections", () => {
		const sections = [
			{
				eyebrow: "STATIC EXPORT",
				lead: "Converts locally.",
				cont: "No server in the loop.",
				paragraphs: ['next.config.ts builds with output: "export".'],
			},
			{
				eyebrow: "WEB WORKER",
				lead: "WASM engines.",
				cont: "Native speed.",
				paragraphs: ["Runs off main thread. See /privacy."],
			},
		];

		const { container } = render(
			<ArticlePage
				title="About convrtr"
				dateline="9 September 2026"
				sections={sections}
			/>,
		);

		expect(container.querySelector("[data-section-grid]")).not.toBeNull();
		const cards = container.querySelectorAll("[data-section-card]");
		expect(cards.length).toBe(2);

		const navLinks = container.querySelectorAll(
			"nav[aria-label='Section shortcuts'] a",
		);
		expect(navLinks.length).toBe(2);

		// Verified that token code pills and links are rendered
		expect(container.querySelector("code.mono")).not.toBeNull();
		expect(container.querySelector("a[href='/privacy']")).not.toBeNull();
	});
});
