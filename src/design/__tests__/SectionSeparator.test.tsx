import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionSeparator } from "@/design/primitives/SectionSeparator";

describe("SectionSeparator", () => {
	it("renders as an accessible separator with default label", () => {
		render(<SectionSeparator />);
		const separator = screen.getByRole("separator");
		expect(separator).toBeDefined();
		expect(separator.getAttribute("aria-label")).toBe("DIMENSION // SPLIT");
		expect(screen.getByText("DIMENSION // SPLIT")).toBeDefined();
	});

	it("renders a custom label when supplied", () => {
		render(<SectionSeparator label="DIMENSION // BY TASK" />);
		const separator = screen.getByRole("separator");
		expect(separator.getAttribute("aria-label")).toBe("DIMENSION // BY TASK");
		expect(screen.getByText("DIMENSION // BY TASK")).toBeDefined();
	});

	it("renders track runners and beacon element", () => {
		const { container } = render(<SectionSeparator />);
		expect(container.querySelectorAll("[data-separator-track]").length).toBe(2);
		expect(container.querySelectorAll("[data-separator-runner]").length).toBe(
			2,
		);
		expect(container.querySelector("[data-separator-beacon]")).not.toBeNull();
	});
});
