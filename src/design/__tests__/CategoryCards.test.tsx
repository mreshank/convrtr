import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryCards } from "@/design/families/CategoryCards";

const CARDS = [
	{
		category: "image",
		label: "Images",
		blurb: "Decoded in the tab.",
		count: 42,
		samples: [{ from: "heic", to: "jpg", href: "/image/heic-to-jpg" }],
	},
];

describe("CategoryCards", () => {
	it("renders the family, its count, and its sample routes", () => {
		const { container } = render(<CategoryCards cards={CARDS} />);
		expect(screen.getByText("IMAGES")).toBeDefined();
		expect(screen.getByText("42 TOOLS")).toBeDefined();
		expect(screen.getByText("Decoded in the tab.")).toBeDefined();
		const route = screen.getByRole("link", { name: "HEIC ➔ JPG" });
		expect(route.getAttribute("href")).toBe("/image/heic-to-jpg");
		expect(container.textContent).toContain("ALL IMAGES TOOLS ➔");
	});

	it("links each family to its filtered tool list", () => {
		render(<CategoryCards cards={CARDS} />);
		const all = screen.getByRole("link", { name: "ALL IMAGES TOOLS ➔" });
		expect(all.getAttribute("href")).toBe("/tools?category=image");
	});

	it("renders nothing for no cards", () => {
		const { container } = render(<CategoryCards cards={[]} />);
		expect(container.textContent).toBe("");
	});
});
