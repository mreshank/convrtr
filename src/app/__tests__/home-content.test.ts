import { describe, expect, it } from "vitest";
import {
	CATEGORY_CARDS,
	FAQ_ITEMS,
	STATS,
	STORY_CHAPTERS,
} from "@/app/home-content";
import { getTool } from "@/core/registry";

describe("homepage content model", () => {
	it("tells the story in six numbered chapters", () => {
		const chapters = Object.values(STORY_CHAPTERS);
		expect(chapters.length).toBe(6);
		expect(chapters.map((c) => c.index)).toEqual([
			"01",
			"02",
			"03",
			"04",
			"05",
			"06",
		]);
	});

	it("counts real tools and formats, and zeroes servers and uploads", () => {
		expect(STATS.length).toBe(4);
		expect(STATS[0]?.value).toBeGreaterThan(0);
		expect(STATS[1]?.value).toBeGreaterThan(0);
		expect(STATS[2]).toMatchObject({
			value: 0,
			label: "SERVERS IN PRODUCTION",
		});
		expect(STATS[3]).toMatchObject({ value: 0, label: "BYTES UPLOADED, EVER" });
	});

	it("gives every file family a card with resolvable sample routes", () => {
		expect(CATEGORY_CARDS.length).toBeGreaterThan(0);
		for (const card of CATEGORY_CARDS) {
			expect(card.count).toBeGreaterThan(0);
			expect(card.samples.length).toBeGreaterThan(0);
			for (const sample of card.samples) {
				expect(sample.from).not.toBe("");
				expect(sample.to).not.toBe("");
				const id = sample.href.replace(/^\//, "");
				expect(getTool(id)).toBeDefined();
			}
		}
	});

	it("answers real questions with non-empty answers", () => {
		expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(5);
		for (const item of FAQ_ITEMS) {
			expect(item.question.endsWith("?")).toBe(true);
			expect(item.answer.length).toBeGreaterThan(20);
		}
	});
});
