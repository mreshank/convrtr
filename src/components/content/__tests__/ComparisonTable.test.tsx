import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonTable } from "../ComparisonTable";

describe("ComparisonTable", () => {
	it("renders a header cell per column and a row per entry", () => {
		render(
			<ComparisonTable
				columns={["MLW", "Simple rename"]}
				rows={[{ label: "Encryption", values: ["AES-GCM, shared key", "None"] }]}
			/>,
		);
		expect(screen.getByText("MLW")).toBeDefined();
		expect(screen.getByText("Simple rename")).toBeDefined();
		expect(screen.getByText("Encryption")).toBeDefined();
		expect(screen.getByText("AES-GCM, shared key")).toBeDefined();
		expect(screen.getByText("None")).toBeDefined();
	});
});
