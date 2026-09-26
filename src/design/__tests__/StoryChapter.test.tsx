import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoryChapter } from "@/design/families/StoryChapter";

describe("StoryChapter", () => {
	it("numbers the chapter and names it in the eyebrow", () => {
		render(
			<StoryChapter
				index="02"
				eyebrow="THE JOURNEY"
				title={{ lead: "One file,", cont: "five stages." }}
				lede="Follow the file."
			>
				<p>child</p>
			</StoryChapter>,
		);
		expect(screen.getByText("CH.02 // THE JOURNEY")).toBeDefined();
	});

	it("fuses the headline and keeps the lede beside it, not beneath a subhead", () => {
		render(
			<StoryChapter
				index="02"
				eyebrow="THE JOURNEY"
				title={{ lead: "One file,", cont: "five stages." }}
				lede="Follow the file."
			>
				<p>child</p>
			</StoryChapter>,
		);
		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading.textContent).toContain("One file,");
		expect(heading.textContent).toContain("five stages.");
		expect(screen.getByText("Follow the file.")).toBeDefined();
	});

	it("renders its children", () => {
		render(
			<StoryChapter
				index="02"
				eyebrow="THE JOURNEY"
				title={{ lead: "One file,", cont: "five stages." }}
				lede="Follow the file."
			>
				<p data-testid="nested">nested band</p>
			</StoryChapter>,
		);
		expect(screen.getByTestId("nested")).toBeDefined();
	});
});
