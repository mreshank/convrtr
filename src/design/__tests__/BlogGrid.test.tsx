import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlogGrid, type BlogGridItem } from "@/design/families/BlogGrid";

const SAMPLE_POSTS: BlogGridItem[] = [
	{
		slug: "post-one",
		title: "How MLW Encryption Works",
		description: "An in-depth reverse engineering breakdown of MLW cipher.",
		publishedAt: "2026-08-20",
		dateline: "20 August 2026",
		readingTime: "6 min read",
		tags: ["mlw", "encryption", "reverse-engineering"],
		relatedTools: [
			{ id: "video/mlw-to-mp4", name: "MLW to MP4", href: "/video/mlw-to-mp4" },
		],
	},
	{
		slug: "post-two",
		title: "Recovering Course Videos",
		description: "Step-by-step guide to recovering course videos locally.",
		publishedAt: "2026-08-25",
		dateline: "25 August 2026",
		readingTime: "7 min read",
		tags: ["mlw", "recovery"],
	},
	{
		slug: "post-three",
		title: "Audio Loudness Standards",
		description: "Why -16 LUFS is standard for podcasts and streaming.",
		publishedAt: "2026-09-01",
		dateline: "1 September 2026",
		readingTime: "4 min read",
		tags: ["audio", "lufs", "mastering"],
		relatedTools: [
			{
				id: "audio/normalise-wav",
				name: "Normalise WAV",
				href: "/audio/normalise-wav",
			},
		],
	},
];

describe("BlogGrid", () => {
	it("renders all articles with dateline, reading time, and tags", () => {
		render(<BlogGrid posts={SAMPLE_POSTS} />);
		expect(screen.getByText("3 ARTICLES IN ARCHIVE")).toBeDefined();
		expect(screen.getByText("How MLW Encryption Works")).toBeDefined();
		expect(screen.getByText("Recovering Course Videos")).toBeDefined();
		expect(screen.getByText("Audio Loudness Standards")).toBeDefined();
		expect(screen.getByText("6 MIN READ")).toBeDefined();
		expect(screen.getByText("TOOL: video/mlw-to-mp4")).toBeDefined();
	});

	it("filters articles by search input", () => {
		render(<BlogGrid posts={SAMPLE_POSTS} />);
		const searchInput = screen.getByPlaceholderText(/Fuzzy search titles/);
		fireEvent.change(searchInput, { target: { value: "loudness" } });

		expect(screen.getByText("SHOWING 1 OF 3 ARTICLES")).toBeDefined();
		expect(screen.getByText("Audio Loudness Standards")).toBeDefined();
		expect(screen.queryByText("How MLW Encryption Works")).toBeNull();
	});

	it("filters articles by tag pill click", () => {
		render(<BlogGrid posts={SAMPLE_POSTS} />);
		const tagBtn = screen.getByRole("button", { name: /#ENCRYPTION/ });
		fireEvent.click(tagBtn);

		expect(screen.getByText("SHOWING 1 OF 3 ARTICLES")).toBeDefined();
		expect(screen.getByText("How MLW Encryption Works")).toBeDefined();
		expect(screen.queryByText("Audio Loudness Standards")).toBeNull();

		// Click ALL to reset
		const allBtn = screen.getByRole("button", { name: /ALL/ });
		fireEvent.click(allBtn);
		expect(screen.getByText("3 ARTICLES IN ARCHIVE")).toBeDefined();
	});

	it("shows empty state when no article matches and allows filter reset", () => {
		render(<BlogGrid posts={SAMPLE_POSTS} />);
		const searchInput = screen.getByPlaceholderText(/Fuzzy search titles/);
		fireEvent.change(searchInput, { target: { value: "nonexistent query" } });

		expect(screen.getByText("[NO_MATCH]")).toBeDefined();
		expect(
			screen.getByText("No articles matched the filter criteria."),
		).toBeDefined();

		const resetBtn = screen.getByRole("button", { name: "Clear all filters" });
		fireEvent.click(resetBtn);
		expect(screen.getByText("3 ARTICLES IN ARCHIVE")).toBeDefined();
	});

	it("sorts articles by date and title", () => {
		const { container } = render(<BlogGrid posts={SAMPLE_POSTS} />);
		const sortSelect = screen.getByRole("combobox");

		// Default newest first
		const titles = () =>
			Array.from(container.querySelectorAll("h2")).map((h) =>
				h.textContent?.trim(),
			);

		// Post three is 2026-09-01, newest
		expect(titles()[0]).toContain("Audio Loudness Standards");

		// Switch to oldest
		fireEvent.change(sortSelect, { target: { value: "oldest" } });
		// Post one is 2026-08-20, oldest
		expect(titles()[0]).toContain("How MLW Encryption Works");

		// Switch to title A-Z
		fireEvent.change(sortSelect, { target: { value: "title-asc" } });
		expect(titles()[0]).toContain("Audio Loudness Standards");
	});

	it("fuzzy matches queries with small typos", () => {
		render(<BlogGrid posts={SAMPLE_POSTS} />);
		const searchInput = screen.getByPlaceholderText(/Fuzzy search titles/);
		// Type "encrytion" with a typo (missing 'p')
		fireEvent.change(searchInput, { target: { value: "encrytion" } });

		expect(screen.getByText("How MLW Encryption Works")).toBeDefined();
		expect(screen.queryByText("Audio Loudness Standards")).toBeNull();
	});
});
