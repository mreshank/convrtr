import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SubscribeForm } from "@/components/content/SubscribeForm";

const CHIPS = [
	{ value: "ecosystem" as const, label: "Product Releases" },
	{ value: "releases" as const, label: "Decoder Changelogs" },
];

beforeEach(() => {
	window.localStorage.clear();
});

describe("SubscribeForm", () => {
	it("renders the header, chips, and submit", () => {
		render(
			<SubscribeForm
				eyebrow="DISPATCH // TEST"
				title="Radar"
				lede="Alerts."
				defaultChannels={["ecosystem"]}
				source="radar"
				chips={CHIPS}
				emailPlaceholder="you@lab.org"
				submitLabel="Subscribe ➔"
			/>,
		);
		expect(screen.getByText("DISPATCH // TEST")).toBeDefined();
		expect(
			screen.getByRole("button", { name: "[x] Product Releases" }),
		).toBeDefined();
		expect(screen.getByPlaceholderText("you@lab.org")).toBeDefined();
		expect(screen.getByRole("button", { name: "Subscribe ➔" })).toBeDefined();
	});

	it("subscribes and confirms on valid email", () => {
		render(
			<SubscribeForm
				defaultChannels={["ecosystem"]}
				source="radar"
				chips={CHIPS}
				emailPlaceholder="you@lab.org"
				submitLabel="Subscribe ➔"
			/>,
		);
		fireEvent.change(screen.getByPlaceholderText("you@lab.org"), {
			target: { value: "researcher@lab.org" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Subscribe ➔" }));
		expect(screen.getByRole("status").textContent).toContain(
			"release updates, events, and ecosystem news",
		);
	});

	it("rejects an invalid email with an error status", () => {
		render(
			<SubscribeForm
				defaultChannels={["ecosystem"]}
				source="radar"
				chips={CHIPS}
				emailPlaceholder="you@lab.org"
				submitLabel="Subscribe ➔"
			/>,
		);
		// Bypass native email validation: the component validates too.
		const input = screen.getByPlaceholderText("you@lab.org");
		fireEvent.change(input, { target: { value: "not-an-email" } });
		input.setAttribute("type", "text");
		fireEvent.click(screen.getByRole("button", { name: "Subscribe ➔" }));
		expect(screen.getByRole("status").textContent).toContain(
			"valid email address",
		);
	});

	it("never deselects the last channel", () => {
		render(
			<SubscribeForm
				defaultChannels={["ecosystem"]}
				source="radar"
				chips={CHIPS}
				emailPlaceholder="you@lab.org"
				submitLabel="Subscribe ➔"
			/>,
		);
		const chip = screen.getByRole("button", { name: "[x] Product Releases" });
		expect(chip.getAttribute("aria-pressed")).toBe("true");
		fireEvent.click(chip);
		expect(chip.getAttribute("aria-pressed")).toBe("true");
	});

	it("dismisses the status notice", () => {
		render(
			<SubscribeForm
				defaultChannels={["ecosystem"]}
				source="radar"
				chips={CHIPS}
				emailPlaceholder="you@lab.org"
				submitLabel="Subscribe ➔"
			/>,
		);
		fireEvent.change(screen.getByPlaceholderText("you@lab.org"), {
			target: { value: "researcher@lab.org" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Subscribe ➔" }));
		fireEvent.click(screen.getByRole("button", { name: "[close]" }));
		expect(screen.queryByRole("status")).toBeNull();
	});
});
