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
