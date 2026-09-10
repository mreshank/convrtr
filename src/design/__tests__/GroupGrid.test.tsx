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

	it("closes the panel when the close button is clicked", () => {
		render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));
		expect(screen.getByRole("region", { name: /PNG/ })).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: /close panel/i }));
		expect(screen.queryByRole("region", { name: /PNG/ })).toBeNull();
	});

	it("supports docking the expanded panel on either right or left side", () => {
		const { container } = render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));

		const grid = container.querySelector("[data-group-grid]") as HTMLElement;
		expect(grid.getAttribute("data-dock")).toBe("right");

		fireEvent.click(screen.getByRole("button", { name: /dock panel left/i }));
		expect(grid.getAttribute("data-dock")).toBe("left");

		fireEvent.click(screen.getByRole("button", { name: /dock panel right/i }));
		expect(grid.getAttribute("data-dock")).toBe("right");
	});

	it("filters tools inside the expanded panel when typing in search input", () => {
		const itemsWithManyTools = [
			{
				href: "/groups/type/image",
				title: "Images",
				meta: "5 tools",
				tools: [
					{ href: "/png-to-webp", title: "PNG to WebP" },
					{ href: "/png-to-jpg", title: "PNG to JPG" },
					{ href: "/jpg-to-png", title: "JPG to PNG" },
					{ href: "/heic-to-jpg", title: "HEIC to JPG" },
					{ href: "/avif-to-png", title: "AVIF to PNG" },
				],
			},
		];

		render(<GroupGrid items={itemsWithManyTools} />);
		fireEvent.click(screen.getByRole("button", { name: /Images/ }));

		const filterInput = screen.getByRole("textbox", {
			name: /filter images tools/i,
		});
		expect(filterInput).toBeDefined();

		fireEvent.change(filterInput, { target: { value: "HEIC" } });
		expect(screen.getByRole("link", { name: "HEIC to JPG" })).toBeDefined();
		expect(screen.queryByRole("link", { name: "PNG to WebP" })).toBeNull();
	});

	it("renders format preview pills on closed cards", () => {
		const items = [
			{
				href: "/groups/format/png",
				title: "PNG",
				meta: "raster",
				tools: [
					{
						href: "/png-to-webp",
						title: "PNG to WebP",
						acceptExt: ["png"],
						outputExt: "webp",
					},
					{
						href: "/png-to-jpg",
						title: "PNG to JPG",
						acceptExt: ["png"],
						outputExt: "jpg",
					},
				],
			},
		];

		render(<GroupGrid items={items} />);
		expect(screen.getByText("PNG → WEBP")).toBeDefined();
		expect(screen.getByText("PNG → JPG")).toBeDefined();
		expect(screen.getByText("2 CONVERSIONS")).toBeDefined();
	});

	it("renders ambient halftone shader inside the expanded panel", () => {
		const { container } = render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));

		const shaderCanvas = container.querySelector(
			'canvas[data-shader="group-workspace-halftone"]',
		);
		expect(shaderCanvas).toBeDefined();
	});
});
