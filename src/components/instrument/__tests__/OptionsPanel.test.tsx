import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { initialQuality } from "@/core/quality";
import { pngToWebp } from "@/core/registry/tools/png-to-webp";
import { OptionsPanel } from "../OptionsPanel";

describe("OptionsPanel", () => {
	it("renders every preset as a selectable segment", () => {
		render(
			<OptionsPanel
				tool={pngToWebp}
				state={initialQuality(pngToWebp)}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.getByRole("radio", { name: "Lossless" })).toBeDefined();
		expect(screen.getByRole("radio", { name: "Smallest" })).toBeDefined();
	});

	it("marks the active preset as checked", () => {
		render(
			<OptionsPanel
				tool={pngToWebp}
				state={initialQuality(pngToWebp)}
				onChange={vi.fn()}
			/>,
		);
		expect(
			screen
				.getByRole("radio", { name: "Lossless" })
				.getAttribute("aria-checked"),
		).toBe("true");
	});

	it("shows the explanation for the active preset", () => {
		render(
			<OptionsPanel
				tool={pngToWebp}
				state={initialQuality(pngToWebp)}
				onChange={vi.fn()}
			/>,
		);
		expect(
			screen.getByText("Bit-exact. The original pixels are recoverable."),
		).toBeDefined();
	});

	it("emits a new state when a preset is chosen", () => {
		const onChange = vi.fn();
		render(
			<OptionsPanel
				tool={pngToWebp}
				state={initialQuality(pngToWebp)}
				onChange={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("radio", { name: "Balanced" }));
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ preset: "balanced" }),
		);
	});

	it("hides advanced controls until disclosed", () => {
		render(
			<OptionsPanel
				tool={pngToWebp}
				state={initialQuality(pngToWebp)}
				onChange={vi.fn()}
			/>,
		);
		expect(screen.queryByLabelText("SNS strength")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: /ADVANCED/ }));
		expect(screen.getByLabelText("SNS strength")).toBeDefined();
	});

	it("emits a custom preset when an advanced control changes", () => {
		const onChange = vi.fn();
		render(
			<OptionsPanel
				tool={pngToWebp}
				state={initialQuality(pngToWebp)}
				onChange={onChange}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: /ADVANCED/ }));
		fireEvent.change(screen.getByLabelText("SNS strength"), {
			target: { value: "20" },
		});
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ preset: "custom" }),
		);
	});
});
