import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardHeader } from "@/design/families/CardHeader";

describe("CardHeader", () => {
	it("renders eyebrow, title, and lede", () => {
		render(
			<CardHeader
				eyebrow="DISPATCH // STAY SYNCHRONIZED"
				title="The convrtr Ecosystem Radar"
				lede="Subscribe for alerts."
			/>,
		);
		expect(screen.getByText("DISPATCH // STAY SYNCHRONIZED")).toBeDefined();
		expect(screen.getByText("The convrtr Ecosystem Radar")).toBeDefined();
		expect(screen.getByText("Subscribe for alerts.")).toBeDefined();
	});

	it("defaults to h3 and honours an h2 override", () => {
		const { rerender } = render(<CardHeader eyebrow="E" title="T" />);
		expect(screen.getByRole("heading", { level: 3 })).toBeDefined();
		rerender(<CardHeader eyebrow="E" title="T" headingLevel="h2" />);
		expect(screen.getByRole("heading", { level: 2 })).toBeDefined();
	});

	it("renders the badge when given", () => {
		render(
			<CardHeader
				eyebrow="E"
				title="T"
				badge={<span data-testid="badge">LIVE</span>}
			/>,
		);
		expect(screen.getByTestId("badge")).toBeDefined();
	});

	it("omits the lede when none is given", () => {
		const { container } = render(<CardHeader eyebrow="E" title="T" />);
		expect(container.querySelectorAll("p").length).toBe(0);
	});
});
