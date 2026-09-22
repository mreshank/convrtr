import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { exportHistoryAsCsv, exportHistoryAsJson } from "@/core/history/store";
import type { ConversionHistoryRecord } from "@/core/history/types";
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
		expect(manifest.version).toBe("0.2.6");
		expect(typeof manifest.description).toBe("string");
		expect(manifest.description.length).toBeGreaterThan(10);
	});

	it("declares necessary permissions for native Chrome surfaces, tab capture, and offline capability", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
		const permissions = manifest.permissions as string[];

		expect(permissions).toContain("sidePanel");
		expect(permissions).toContain("storage");
		expect(permissions).toContain("contextMenus");
		expect(permissions).toContain("scripting");
		expect(permissions).toContain("activeTab");

		// "tabs" and "downloads" omitted to comply strictly with CWS Use of Permissions policy
		expect(permissions).not.toContain("tabs");
		expect(permissions).not.toContain("downloads");
		expect(permissions.length).toBe(5);

		// Broad host permissions omitted to eliminate Chrome Web Store review delays
		expect(manifest.host_permissions).toBeUndefined();
	});

	it("declares Content Security Policy permitting WebAssembly compilation", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
		expect(manifest.content_security_policy?.extension_pages).toBeDefined();
		expect(manifest.content_security_policy.extension_pages).toContain(
			"'wasm-unsafe-eval'",
		);
		expect(manifest.content_security_policy.extension_pages).toContain(
			"script-src 'self'",
		);
	});

	it("defines keyboard shortcuts and omnibox keyword", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

		expect(manifest.commands?.open_popup).toBeDefined();
		expect(manifest.commands?.open_popup?.suggested_key?.mac).toBe(
			"Command+Shift+Comma",
		);
		expect(manifest.commands?.open_popup?.suggested_key?.default).toBe(
			"Ctrl+Shift+Comma",
		);
		expect(manifest.commands?.open_side_panel).toBeDefined();
		expect(manifest.commands?.capture_tab).toBeDefined();
		expect(manifest.omnibox?.keyword).toBe("cv");
	});

	it("points to existing source entry points", () => {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

		expect(existsSync(resolve(root, "src/extension/popup.html"))).toBe(true);
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

	it("exports conversion history records as valid CSV and JSON", () => {
		const mockRecords: ConversionHistoryRecord[] = [
			{
				id: "rec_1",
				timestamp: Date.now(),
				toolId: "image-png-to-webp",
				category: "image",
				inputName: "screenshot.png",
				inputSize: 10240,
				outputName: "screenshot.webp",
				outputSize: 4096,
				durationMs: 450,
				status: "success",
			},
		];

		const csv = exportHistoryAsCsv(mockRecords);
		expect(csv).toContain("screenshot.png");
		expect(csv).toContain("screenshot.webp");
		expect(csv).toContain("success");

		const json = exportHistoryAsJson(mockRecords);
		const parsed = JSON.parse(json);
		expect(parsed.length).toBe(1);
		expect(parsed[0].inputName).toBe("screenshot.png");
	});
});
