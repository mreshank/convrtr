import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaqBand } from "@/design/families/FaqBand";
import { FinalCta } from "@/design/families/FinalCta";
import { FreeForeverBand } from "@/design/families/FreeForeverBand";

describe("FreeForeverBand", () => {
	it("prices the only plan at $0 and names the cloud toll", () => {
		const { container } = render(<FreeForeverBand />);
		expect(container.textContent).toContain("$0");
		expect(container.textContent).toContain("/ forever");
		expect(screen.getByText("THE ONLY PLAN")).toBeDefined();
		expect(screen.getByText("THE CLOUD TOLL")).toBeDefined();
		expect(
			screen.getByRole("link", { name: "Start converting" }),
		).toBeDefined();
		expect(
			screen.getByRole("link", { name: "Get the extension" }),
		).toBeDefined();
	});
});

describe("FaqBand", () => {
	const ITEMS = [
		{ question: "Uploaded?", answer: "Never." },
		{ question: "Account?", answer: "None." },
	];

	it("asks every question and opens the first answer", () => {
		render(<FaqBand items={ITEMS} />);
		expect(screen.getByText("Uploaded?")).toBeDefined();
		expect(screen.getByText("Account?")).toBeDefined();
		expect(screen.getByText("Never.")).toBeDefined();
	});

	it("renders nothing for no items", () => {
		const { container } = render(<FaqBand items={[]} />);
		expect(container.textContent).toBe("");
	});
});

describe("FinalCta", () => {
	it("closes with both doors open", () => {
		render(
			<FinalCta
				eyebrow="BEGIN // NO SIGN-UP"
				title={{ lead: "Done reading.", cont: "Start converting." }}
				lede="The tab is open."
			/>,
		);
		expect(screen.getByText("BEGIN // NO SIGN-UP")).toBeDefined();
		const cta = screen.getByRole("link", { name: "Start converting" });
		expect(cta.getAttribute("href")).toBe("/convert");
		const ext = screen.getByRole("link", { name: "Install the extension ↗" });
		expect(ext.getAttribute("target")).toBe("_blank");
	});
});
