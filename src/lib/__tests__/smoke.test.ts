import { describe, expect, it } from "vitest";

describe("smoke", () => {
	it("runs in a happy-dom environment with DOM globals available", () => {
		expect(typeof document).toBe("object");
		document.body.innerHTML = '<div id="app">convrtr</div>';
		expect(document.getElementById("app")?.textContent).toBe("convrtr");
	});
});
