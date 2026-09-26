import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PipelineTimeline } from "@/design/families/PipelineTimeline";

const STAGES = [
	{ code: "DROP", title: "Lands", body: "Bytes staged.", detail: "FileReader" },
	{ code: "SNIFF", title: "Read", body: "Header sniffed.", detail: "detect" },
	{ code: "EMIT", title: "Twin", body: "Downloads.", detail: "store" },
];

describe("PipelineTimeline", () => {
	it("renders every stage code in order", () => {
		const { container } = render(<PipelineTimeline stages={STAGES} />);
		const items = container.querySelectorAll("li");
		expect(items.length).toBe(3);
		expect(items[0]?.textContent).toContain("DROP");
		expect(items[1]?.textContent).toContain("SNIFF");
		expect(items[2]?.textContent).toContain("EMIT");
	});

	it("marks the final node solid and earlier nodes hollow", () => {
		const { container } = render(<PipelineTimeline stages={STAGES} />);
		const text = container.textContent ?? "";
		expect(text).toContain("●");
		expect(text).toContain("○");
	});

	it("names the module responsible for each stage", () => {
		render(<PipelineTimeline stages={STAGES} />);
		expect(screen.getByText("FileReader")).toBeDefined();
		expect(screen.getByText("detect")).toBeDefined();
		expect(screen.getByText("store")).toBeDefined();
	});

	it("renders nothing for no stages", () => {
		const { container } = render(<PipelineTimeline stages={[]} />);
		expect(container.querySelectorAll("li").length).toBe(0);
	});
});
