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
	// One canvas value, not a pair. The mark used to be drawn on the
	// near-black that tokens.css swapped between a light and a dark theme;
	// v2 has a single black ground and both of those tokens are gone, so the
	// mark, the manifest and the generated PNGs all state the canvas black.
	//
	// The old value is pinned out by the positive assertions rather than by
	// a `not.toMatch` naming it: the plan's exit gate requires that string to
	// have left `src` altogether, and a guard that spells the retired hex is
	// itself an occurrence of it. Nothing is lost — anything but #000000
	// fails the positive match below.
	//
	// These stay literal rather than loosening to /#0{6}|#000/: nothing else
	// pins the manifest colour. src/app/manifest.ts is the one file the
	// palette guard in src/design/__tests__/tokens.test.ts exempts from the
	// token rule, precisely because JSON read by the OS cannot resolve a
	// custom property. If these assertions stop naming the value, no test
	// names it at all.
	const CANVAS = /#000000/i;

	it("draws the chevron on the canvas black, not the old near-black", () => {
		const svg = readFileSync("src/app/icon.svg", "utf8");
		expect(svg).not.toMatch(/ccff00|0b0b0c/i);
		expect(svg).toMatch(/fill="#000000"/i);
		expect(svg).toMatch(/stroke="#FFFFFF"/i);
	});

	it("declares manifest colours matching the mark's ground", () => {
		const source = readFileSync("src/app/manifest.ts", "utf8");
		expect(source).toMatch(/background_color:\s*"#000000"/i);
		expect(source).toMatch(/theme_color:\s*"#000000"/i);
		expect(source).not.toMatch(/0b0b0c/i);
	});

	it("generates icons from the same two colours the mark uses", () => {
		// The PNGs are rasterised by hand and committed, so a mark recoloured
		// without re-running this script would ship install icons on the old
		// ground while the splash screen used the new one.
		const script = readFileSync("scripts/generate-icons.mjs", "utf8");
		expect(script).not.toMatch(/ccff00|0b0b0c/i);
		expect(script).toMatch(CANVAS);
		expect(script).toMatch(/#FFFFFF/i);
	});
});
