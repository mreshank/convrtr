import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "../JsonLd";

describe("JsonLd", () => {
	it("renders a script tag with application/ld+json and stringified json", () => {
		const data = {
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: "convrtr",
		};
		const { container } = render(<JsonLd schema={data} />);
		const script = container.querySelector('script[type="application/ld+json"]');
		expect(script).not.toBeNull();
		expect(script?.textContent).toBe(JSON.stringify(data));
	});
});
