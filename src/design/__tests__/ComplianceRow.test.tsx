import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComplianceRow } from "@/design/families/ComplianceRow";

const CLAIMS = [
	"No file leaves the device",
	"No account required",
	"No analytics beacon",
];

describe("ComplianceRow", () => {
	it("renders every claim with a check chip", () => {
		const { container } = render(
			<ComplianceRow
				claims={CLAIMS}
				status={{ label: "Verified", ok: true }}
			/>,
		);
		for (const claim of CLAIMS) expect(screen.getByText(claim)).toBeDefined();
		expect(container.querySelectorAll("[data-chip]").length).toBe(
			CLAIMS.length,
		);
	});

	it("makes the status dot a mint pill", () => {
		const { container } = render(
			<ComplianceRow
				claims={CLAIMS}
				status={{ label: "Verified", ok: true }}
			/>,
		);
		const dot = container.querySelector("[data-status-dot]") as HTMLElement;
		expect(dot.style.background).toBe("var(--accent)");
		expect(dot.style.borderRadius).toBe("var(--radius-pill)");
	});

	it("states the status in words, not only in the dot's colour", () => {
		// A dot that carries its meaning in hue alone says nothing to a
		// colour-blind reader, and nothing at all in greyscale or in print.
		render(
			<ComplianceRow
				claims={CLAIMS}
				status={{ label: "Verified", ok: true }}
			/>,
		);
		expect(screen.getByText("Verified")).toBeDefined();
	});

	it("drops the mint when the status is not ok", () => {
		// Mint means intact. A failing status must not wear it.
		const { container } = render(
			<ComplianceRow
				claims={CLAIMS}
				status={{ label: "Degraded", ok: false }}
			/>,
		);
		const dot = container.querySelector("[data-status-dot]") as HTMLElement;
		expect(dot.style.background).toBe("var(--ink-muted)");
	});

	it("hides the chips from assistive technology", () => {
		// The claim text is the content; the chip is decoration beside it.
		const { container } = render(
			<ComplianceRow
				claims={CLAIMS}
				status={{ label: "Verified", ok: true }}
			/>,
		);
		for (const chip of container.querySelectorAll("[data-chip]")) {
			expect(chip.getAttribute("aria-hidden")).toBe("true");
		}
	});
});
