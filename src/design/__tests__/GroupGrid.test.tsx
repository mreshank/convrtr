import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupGrid } from "@/design/families/GroupGrid";

const ITEMS = [
	{
		href: "/groups/format/png",
		title: "PNG",
		meta: "3 tools",
		description: "image",
		tools: [
			{ href: "/png-to-webp", title: "PNG to WebP" },
			{ href: "/png-to-jpg", title: "PNG to JPG" },
		],
	},
	{
		href: "/groups/format/mp4",
		title: "MP4",
		meta: "2 tools",
		description: "video",
		tools: [{ href: "/mp4-to-webm", title: "MP4 to WebM" }],
	},
];

describe("GroupGrid", () => {
	it("renders one cell per group with its title and meta", () => {
		render(<GroupGrid items={ITEMS} />);
		expect(screen.getByRole("button", { name: /PNG/ })).toBeDefined();
		expect(screen.getByRole("button", { name: /MP4/ })).toBeDefined();
	});

	it("is a real 2D grid, not a stack", () => {
		const { container } = render(<GroupGrid items={ITEMS} />);
		const grid = container.querySelector("[data-group-grid]") as HTMLElement;
		expect(grid.style.display).toBe("grid");
	});

	it("expands a cell's tools on click and lists them", () => {
		render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));

		const panel = screen.getByRole("region", { name: /PNG/ });
		expect(
			within(panel).getByRole("link", { name: "PNG to WebP" }),
		).toBeDefined();
		expect(
			within(panel).getByRole("link", { name: "PNG to JPG" }),
		).toBeDefined();
		expect(
			within(panel)
				.getByRole("link", { name: /View all/i })
				.getAttribute("href"),
		).toBe("/groups/format/png");
	});

	it("collapses any other open cell when a new one is opened", () => {
		render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));
		expect(screen.getByRole("region", { name: /PNG/ })).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: /MP4/ }));

		expect(screen.queryByRole("region", { name: /PNG/ })).toBeNull();
		expect(screen.getByRole("region", { name: /MP4/ })).toBeDefined();
	});

	it("collapses the open cell when it is clicked again", () => {
		render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));
		expect(screen.queryByRole("region", { name: /PNG/ })).toBeNull();
	});
});
