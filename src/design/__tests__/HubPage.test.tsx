import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HubPage } from "@/design/templates/HubPage";

describe("HubPage", () => {
	it("renders eyebrow, headline, lede and children in order", () => {
		render(
			<HubPage
				eyebrow="Everything"
				title="All tools"
				lede="Every conversion, in your browser."
			>
				<ul data-testid="listing" />
			</HubPage>,
		);
		expect(screen.getByText("Everything")).toBeDefined();
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"All tools",
		);
		expect(
			screen.getByText("Every conversion, in your browser."),
		).toBeDefined();
		expect(screen.getByTestId("listing")).toBeDefined();
	});

	it("renders the count in the mono voice when given one", () => {
		const { container } = render(
			<HubPage
				title="All tools"
				lede="x"
				count={{ value: 53, noun: "conversions" }}
			>
				<div />
			</HubPage>,
		);
		const count = container.querySelector("[data-count]") as HTMLElement;
		expect(count.textContent).toBe("53 conversions");
		expect(count.className).toContain("mono");
	});

	it("omits the count entirely when not given one", () => {
		const { container } = render(
			<HubPage title="Blog" lede="x">
				<div />
			</HubPage>,
		);
		expect(container.querySelector("[data-count]")).toBeNull();
	});

	it("uses the headline scale rather than a literal size", () => {
		const { container } = render(
			<HubPage title="All tools" lede="x">
				<div />
			</HubPage>,
		);
		const h1 = container.querySelector("h1") as HTMLElement;
		expect(h1.style.fontSize).toBe("var(--headline-size)");
		expect(h1.style.fontWeight).toBe("400");
	});

	it("renders a GroupGrid section when given `grid` instead of `sections`", () => {
		render(
			<HubPage
				title="Browse by format or task"
				lede="x"
				grid={[
					{
						heading: "BY FORMAT",
						items: [
							{
								href: "/groups/format/png",
								title: "PNG",
								meta: "3 tools",
								tools: [{ href: "/png-to-webp", title: "PNG to WebP" }],
							},
						],
					},
				]}
			/>,
		);
		expect(screen.getByText("BY FORMAT")).toBeDefined();
		expect(screen.getByRole("button", { name: /PNG/ })).toBeDefined();
	});
});
