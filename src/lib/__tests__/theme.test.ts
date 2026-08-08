import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_STORAGE_KEY } from "../theme";

describe("resolveTheme", () => {
	it("follows the system when preference is system", () => {
		expect(resolveTheme("system", true)).toBe("dark");
		expect(resolveTheme("system", false)).toBe("light");
	});

	it("ignores the system when the user has chosen explicitly", () => {
		expect(resolveTheme("light", true)).toBe("light");
		expect(resolveTheme("dark", false)).toBe("dark");
	});
});

describe("THEME_STORAGE_KEY", () => {
	it("is namespaced to the product", () => {
		expect(THEME_STORAGE_KEY).toBe("convrtr.theme");
	});
});
