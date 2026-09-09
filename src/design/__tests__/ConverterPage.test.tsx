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

	it("imposes no width cap of its own on the shell", () => {
		// The instrument's measure has to reach --converter-width in full.
		// A competing cap on this shell would eat into it the same way a
		// stub wrapper's max-w-4xl once made every family's own
		// var(--max-width) permanently dead on EditorialPage.
		const { container } = render(
			<ConverterPage eyebrow="x" title="y" lede="z">
				<div />
			</ConverterPage>,
		);
		const shell = container.querySelector("[data-converter]") as HTMLElement;
		expect(shell.style.maxWidth).toBe("");
	});

	it("gives the eyebrow, heading, lede and instrument the same measure", () => {
		// Each block carries data-converter-measure and centres itself against
		// the shell's content width independently -- templates.css applies
		// --converter-width to all four, which is what keeps the title
		// directly above the instrument instead of aligned to the wider frame.
		const { container } = render(
			<ConverterPage eyebrow="x" title="y" lede="z">
				<div data-testid="instrument" />
			</ConverterPage>,
		);
		const measured = container.querySelectorAll("[data-converter-measure]");
		expect(measured.length).toBe(4);
		const instrumentWrapper = screen.getByTestId("instrument").parentElement;
		expect(instrumentWrapper?.hasAttribute("data-converter-measure")).toBe(
			true,
		);
	});
});
