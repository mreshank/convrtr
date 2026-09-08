import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConverterPage } from "@/design/templates/ConverterPage";

describe("ConverterPage", () => {
	it("frames the instrument without wrapping it in extra landmarks", () => {
		render(
			<ConverterPage
				eyebrow="Image"
				title="HEIC to JPG"
				lede="Convert locally."
			>
				<div data-testid="instrument" />
			</ConverterPage>,
		);
		expect(screen.getByTestId("instrument")).toBeDefined();
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"HEIC to JPG",
		);
	});

	it("renders the eyebrow in the mono voice", () => {
		const { container } = render(
			<ConverterPage eyebrow="Image" title="x" lede="y">
				<div />
			</ConverterPage>,
		);
		const eyebrow = container.querySelector("[data-eyebrow]") as HTMLElement;
		expect(eyebrow.textContent).toBe("Image");
		expect(eyebrow.className).toContain("meta");
	});

	it("omits the related slot when not given one", () => {
		const { container } = render(
			<ConverterPage eyebrow="x" title="y" lede="z">
				<div />
			</ConverterPage>,
		);
		expect(container.querySelector("[data-related]")).toBeNull();
	});
});
