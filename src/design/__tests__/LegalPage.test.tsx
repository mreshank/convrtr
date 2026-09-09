import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalPage } from "@/design/templates/LegalPage";

describe("LegalPage", () => {
	it("renders the title and a mono revision line", () => {
		const { container } = render(
			<LegalPage title="Terms" revised="9 September 2026">
				<p>body</p>
			</LegalPage>,
		);
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Terms");
		const revised = container.querySelector("[data-revised]") as HTMLElement;
		expect(revised.textContent).toContain("9 September 2026");
		expect(revised.className).toContain("mono");
	});

	it("sets a narrower measure than an article", () => {
		// Spec 6.2: ArticlePage at a narrower measure. Legal text is denser
		// and benefits from a shorter line than editorial prose.
		const { container } = render(
			<LegalPage title="x" revised="y">
				<p>body</p>
			</LegalPage>,
		);
		expect(container.querySelector("[data-legal-prose]")).not.toBeNull();
	});
});
