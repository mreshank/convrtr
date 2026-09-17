import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryNavStrip } from "../CategoryNavStrip";

describe("CategoryNavStrip", () => {
	it("renders navigation links for all categories", () => {
		render(<CategoryNavStrip currentCategory="image" />);

		const nav = screen.getByRole("navigation", { name: "File Categories" });
		expect(nav).toBeDefined();

		const imageLink = screen.getByRole("link", { name: /IMAGE/i });
		expect(imageLink.getAttribute("href")).toBe("/image");
		expect(imageLink.getAttribute("aria-current")).toBe("page");

		const audioLink = screen.getByRole("link", { name: /AUDIO/i });
		expect(audioLink.getAttribute("href")).toBe("/audio");

		const videoLink = screen.getByRole("link", { name: /VIDEO/i });
		expect(videoLink.getAttribute("href")).toBe("/video");

		const documentLink = screen.getByRole("link", { name: /DOCUMENT/i });
		expect(documentLink.getAttribute("href")).toBe("/document");
	});

	it("renders top format shortcuts for the current category", () => {
		render(<CategoryNavStrip currentCategory="image" />);

		expect(screen.getByText("TOP FORMATS:")).toBeDefined();
		expect(screen.getByRole("link", { name: /.PNG/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /.WEBP/i })).toBeDefined();
	});

	it("contains zero emojis in category navigation", () => {
		const { container } = render(<CategoryNavStrip currentCategory="image" />);
		const text = container.textContent || "";
		const emojiRegex = /\p{Extended_Pictographic}/u;
		expect(emojiRegex.test(text)).toBe(false);
	});
});
