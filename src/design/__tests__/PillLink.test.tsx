import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PillLink } from "@/design/primitives/PillLink";

describe("PillLink", () => {
	it("fills the primary pill in ink on ground", () => {
		render(
			<PillLink href="/convert" variant="fill">
				Start converting
			</PillLink>,
		);
		const pill = screen.getByRole("link", { name: "Start converting" });
		expect(pill.style.background).toBe("var(--ink)");
		expect(pill.style.color).toBe("var(--ground)");
		expect(pill.style.borderRadius).toBe("var(--radius-pill)");
		expect(pill.style.height).toBe("44px");
	});

	it("outlines the secondary pill in the rule token", () => {
		render(
			<PillLink href="/blog" variant="outline">
				Read the blog
			</PillLink>,
		);
		const pill = screen.getByRole("link", { name: "Read the blog" });
		expect(pill.style.background).toBe("transparent");
		expect(pill.style.borderWidth).toBe("var(--rule-width)");
		expect(pill.style.borderStyle).toBe("solid");
		expect(pill.style.borderColor).toBe("var(--rule)");
	});

	it("opens externally with opener protection when asked", () => {
		render(
			<PillLink href="https://example.com" variant="fill" size="sm" external>
				Store
			</PillLink>,
		);
		const pill = screen.getByRole("link", { name: "Store" });
		expect(pill.getAttribute("target")).toBe("_blank");
		expect(pill.getAttribute("rel")).toBe("noopener noreferrer");
		expect(pill.style.height).toBe("36px");
	});
});
