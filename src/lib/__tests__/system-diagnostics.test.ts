import { describe, expect, it } from "vitest";
import {
	checkWasmSimd,
	detectBrowser,
	detectOS,
	formatDiagnosticMarkdown,
	runSystemDiagnostics,
} from "../system-diagnostics";

describe("system-diagnostics", () => {
	it("detects browser family from user agent", () => {
		expect(
			detectBrowser(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
			),
		).toContain("Chromium");

		expect(
			detectBrowser(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0",
			),
		).toBe("Firefox");

		expect(
			detectBrowser(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
			),
		).toBe("Safari");
	});

	it("detects operating system from user agent", () => {
		expect(detectOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(
			"macOS",
		);
		expect(detectOS("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
			"Windows",
		);
		expect(detectOS("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Linux");
	});

	it("runs system diagnostics and outputs report structure", () => {
		const report = runSystemDiagnostics();
		expect(report).toBeDefined();
		expect(["OPTIMAL", "LIMITED", "DEGRADED"]).toContain(
			report.overallReadiness,
		);
		expect(report.items.length).toBeGreaterThanOrEqual(8);

		const wasmCheck = report.items.find((i) => i.id === "wasm_core");
		expect(wasmCheck).toBeDefined();
		expect(["PASS", "FAIL"]).toContain(wasmCheck?.status);
	});

	it("formats diagnostic markdown cleanly", () => {
		const report = runSystemDiagnostics();
		const md = formatDiagnosticMarkdown(report);
		expect(md).toContain("### SYSTEM DIAGNOSTIC AUDIT");
		expect(md).toContain("#### ENVIRONMENT");
		expect(md).toContain("#### CORE CAPABILITIES");
		expect(md).toContain("WASM CORE EXECUTION");
	});

	it("checks wasm simd without throwing", () => {
		const simd = checkWasmSimd();
		expect(typeof simd).toBe("boolean");
	});
});
