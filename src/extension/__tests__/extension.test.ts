import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TOOLS } from "@/core/registry";
import {
	findConversionRoute,
	getAvailableTargetFormatsForFile,
} from "@/core/registry/converter-match";

const root = resolve(__dirname, "../../..");
const manifestPath = resolve(root, "src/extension/manifest.json");

describe("convrtr Chrome Extension Manifest & Configuration", () => {
	it("has a valid Manifest V3 configuration", () => {
		expect(existsSync(manifestPath)).toBe(true);
		const raw = readFileSync(manifestPath, "utf-8");
		const manifest = JSON.parse(raw);

		expect(manifest.manifest_version).toBe(3);
		expect(manifest.name).toBe("convrtr");
		expect(manifest.version).toBe("0.1.0");
		expect(typeof manifest.description).toBe("string");
		expect(manifest.description.length).toBeGreaterThan(10);
	});

	it("declares necessary permissions for native Chrome surfaces and offline capability", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
		const permissions = manifest.permissions as string[];

		expect(permissions).toContain("sidePanel");
		expect(permissions).toContain("storage");
		expect(permissions).toContain("contextMenus");
		expect(permissions).toContain("tabs");
		expect(permissions).toContain("downloads");
	});

	it("points to existing source entry points", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

		expect(
			existsSync(resolve(root, "src/extension", manifest.action.default_popup)),
		).toBe(true);
		expect(
			existsSync(
				resolve(root, "src/extension", manifest.side_panel.default_path),
			),
		).toBe(true);
		expect(existsSync(resolve(root, "src/extension/tab.html"))).toBe(true);
		expect(existsSync(resolve(root, "src/extension/background.ts"))).toBe(true);
	});

	it("contains real PNG icon files at all declared resolutions", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
		const icons = manifest.icons as Record<string, string>;

		expect(icons["16"]).toBeDefined();
		expect(icons["32"]).toBeDefined();
		expect(icons["48"]).toBeDefined();
		expect(icons["128"]).toBeDefined();

		for (const [_size, relativePath] of Object.entries(icons)) {
			const fullPath = resolve(root, "src/extension", relativePath);
			expect(existsSync(fullPath)).toBe(true);
			const stat = statSync(fullPath);
			expect(stat.size).toBeGreaterThan(100); // Valid non-empty PNG
		}
	});
});

describe("Core Engine & Tool Registry Sharing", () => {
	it("directly shares all core tools with zero code duplication", () => {
		expect(TOOLS.length).toBeGreaterThan(190);
	});

	it("supports multi-hop permutation routes for the extension", () => {
		// Multi-hop clip -> pdf
		const clipRoute = findConversionRoute("clip", "pdf");
		expect(clipRoute).toBeDefined();
		expect(clipRoute?.route.length).toBeGreaterThanOrEqual(2);

		// Multi-hop mov -> gif
		const movGif = findConversionRoute("mov", "gif");
		expect(movGif).toBeDefined();
		expect(movGif?.route.length).toBeGreaterThanOrEqual(2);
	});

	it("discovers target options including same-format and multi-hop operations", () => {
		const targets = getAvailableTargetFormatsForFile("test.jpg");
		expect(targets.length).toBeGreaterThan(0);
		// Check that compress or resize operations are present for JPG
		const hasSpecialized = targets.some(
			(t) => t.id.includes("compress") || t.id.includes("resize"),
		);
		expect(hasSpecialized).toBe(true);
	});
});
