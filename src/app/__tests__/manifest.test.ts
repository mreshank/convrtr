import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { CHROME_EXTENSION_ID, CHROME_EXTENSION_URL } from "@/lib/site";

describe("web app manifest", () => {
	it("returns valid metadata route manifest with Chrome Extension related_applications", () => {
		const m = manifest();

		expect(m.name).toBe("convrtr");
		expect(m.short_name).toBe("convrtr");
		expect(m.display).toBe("standalone");
		expect(m.background_color).toBe("#000000");
		expect(m.theme_color).toBe("#000000");

		expect(m.related_applications).toBeDefined();
		expect(m.related_applications).toEqual([
			{
				platform: "chrome_web_store",
				url: CHROME_EXTENSION_URL,
				id: CHROME_EXTENSION_ID,
			},
		]);
		expect(m.id).toBe("/");
		expect(m.scope).toBe("/");
		expect(m.shortcuts).toBeDefined();
		expect(m.shortcuts?.length).toBeGreaterThanOrEqual(3);
		expect(m.file_handlers).toBeDefined();
		expect(m.file_handlers?.length).toBeGreaterThan(0);
		expect(m.categories).toContain("utilities");
	});
});
