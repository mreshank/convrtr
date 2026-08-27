import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "../Callout";

describe("Callout", () => {
	it("labels a note callout and renders its body", () => {
		render(<Callout kind="note">Body text</Callout>);
		expect(screen.getByText("Note")).toBeDefined();
		expect(screen.getByText("Body text")).toBeDefined();
	});

	it("labels a warning callout distinctly from a note", () => {
		render(<Callout kind="warning">Careful</Callout>);
		expect(screen.getByText("Warning")).toBeDefined();
	});
});
