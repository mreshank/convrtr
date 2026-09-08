import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart } from "@/design/families/BarChart";

const DATA = [
	{ label: "image", value: 26 },
	{ label: "audio", value: 14 },
	{ label: "video", value: 10 },
	{ label: "document", value: 3 },
	{ label: "data", value: 0 },
];

describe("BarChart", () => {
	it("draws one bar per row", () => {
		const { container } = render(<BarChart data={DATA} />);
		expect(container.querySelectorAll("[data-bar]").length).toBe(DATA.length);
	});

	it("scales bar heights against the largest value", () => {
		const { container } = render(<BarChart data={DATA} />);
		const bars = [...container.querySelectorAll("[data-bar]")] as HTMLElement[];
		expect(bars[0]?.style.height).toBe("100%");
		// 10/26 = 38.46%, rounded to two places.
		expect(bars[2]?.style.height).toBe("38.46%");
	});

	it("gives a zero-value category a visible floor, not nothing", () => {
		// A bar of height 0 reads as a missing column rather than an empty
		// one, which misrepresents the axis.
		const { container } = render(<BarChart data={DATA} />);
		const bars = [...container.querySelectorAll("[data-bar]")] as HTMLElement[];
		expect(bars[4]?.style.height).toBe("1px");
	});

	it("uses mint for the bars, which is a permitted rationed use", () => {
		const { container } = render(<BarChart data={DATA} />);
		const bar = container.querySelector("[data-bar]") as HTMLElement;
		expect(bar.style.background).toBe("var(--accent)");
	});

	it("is readable as a table by assistive technology", () => {
		// The bars are decorative geometry; the numbers are the content. A
		// screen reader gets the figures, not a row of unlabelled divs.
		const { container, getByText } = render(<BarChart data={DATA} />);
		expect(container.querySelector("table")).not.toBeNull();
		expect(getByText("26")).toBeDefined();
	});
});
