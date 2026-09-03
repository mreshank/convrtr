import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FAQ } from "../FAQ";

describe("FAQ", () => {
	it("renders one question and answer pair per item", () => {
		render(
			<FAQ
				items={[
					{ q: "Is this safe?", a: "Yes." },
					{ q: "Does it cost anything?", a: "No." },
				]}
			/>,
		);
		expect(screen.getByText("Is this safe?")).toBeDefined();
		expect(screen.getByText("Yes.")).toBeDefined();
		expect(screen.getByText("Does it cost anything?")).toBeDefined();
		expect(screen.getByText("No.")).toBeDefined();
	});
});
