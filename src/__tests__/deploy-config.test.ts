import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import vercelConfig from "../../vercel.json";

describe("deployment configuration", () => {
	it("exports a fully static site with no server runtime", () => {
		expect(nextConfig.output).toBe("export");
	});

	it("serves cross-origin isolation headers so SharedArrayBuffer is available", () => {
		// tsconfig's noUncheckedIndexedAccess types array indexing as possibly
		// undefined, so this falls back to an empty list instead of asserting.
		const headers = vercelConfig.headers[0]?.headers ?? [];
		const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));
		expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
		expect(byKey["Cross-Origin-Embedder-Policy"]).toBe("credentialless");
	});

	it("applies those headers to every route, not just the root", () => {
		// A narrowed source pattern would leave tool pages un-isolated while the
		// header values above still looked correct.
		expect(vercelConfig.headers[0]?.source).toBe("/(.*)");
	});

	it("points the host at the static export rather than relying on framework detection", () => {
		// The first deploy failed with "No Output Directory named 'public'":
		// Next's `output: "export"` writes to `out/`, and `public/` is empty so
		// git does not track it, leaving the host's clone without one. Naming the
		// build command and output directory explicitly removes the guesswork.
		expect(vercelConfig.outputDirectory).toBe("out");
		expect(vercelConfig.buildCommand).toBe("pnpm build");
	});
});

describe("brand mark", () => {
	it("draws the chevron in the terminal pair, not the old signal colour", () => {
		const svg = readFileSync("src/app/icon.svg", "utf8");
		expect(svg).not.toMatch(/ccff00|0b0b0c/i);
		expect(svg).toMatch(/fill="#0A0A0A"/i);
		expect(svg).toMatch(/stroke="#FFFFFF"/i);
	});

	it("declares manifest colours matching the mark's ground", () => {
		const source = readFileSync("src/app/manifest.ts", "utf8");
		expect(source).toMatch(/background_color:\s*"#0A0A0A"/i);
		expect(source).toMatch(/theme_color:\s*"#0A0A0A"/i);
		expect(source).not.toMatch(/0b0b0c/i);
	});

	it("generates icons from the same two colours the mark uses", () => {
		const script = readFileSync("scripts/generate-icons.mjs", "utf8");
		expect(script).not.toMatch(/ccff00|0b0b0c/i);
		expect(script).toMatch(/#0A0A0A/i);
		expect(script).toMatch(/#FFFFFF/i);
	});
});
