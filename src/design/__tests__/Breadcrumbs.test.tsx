import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/design/primitives/Breadcrumbs";

describe("Breadcrumbs", () => {
	it("renders null if items list is empty", () => {
		const { container } = render(<Breadcrumbs items={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders accessible nav with Schema.org Microdata", () => {
		render(
			<Breadcrumbs
				items={[
					{ name: "Home", href: "/" },
					{ name: "Image Tools", href: "/image" },
					{ name: "PNG to WebP" },
				]}
			/>,
		);

		const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
		expect(nav).toBeDefined();

		const list = nav.querySelector("ol");
		expect(list).not.toBeNull();
		expect(list?.getAttribute("itemtype")).toBe(
			"https://schema.org/BreadcrumbList",
		);

		const items = nav.querySelectorAll("li");
		expect(items).toHaveLength(3);

		// First item
		const firstLink = screen.getByRole("link", { name: "HOME" });
		expect(firstLink.getAttribute("href")).toBe("/");

		// Second item
		const secondLink = screen.getByRole("link", { name: "IMAGE TOOLS" });
		expect(secondLink.getAttribute("href")).toBe("/image");

		// Last item is current page
		const lastItem = screen.getByText("PNG TO WEBP");
		expect(lastItem).toBeDefined();
		expect(items[2]?.getAttribute("aria-current")).toBe("page");
	});

	it("contains zero emojis and uses geometric arrow separator", () => {
		const { container } = render(
			<Breadcrumbs
				items={[
					{ name: "Home", href: "/" },
					{ name: "Groups", href: "/groups" },
					{ name: "PNG Tools" },
				]}
			/>,
		);

		const text = container.textContent || "";
		// Zero emoji regex
		const emojiRegex = /\p{Extended_Pictographic}/u;
		expect(emojiRegex.test(text)).toBe(false);

		// Contains geometric arrows
		expect(text).toContain("➔");
	});
});
