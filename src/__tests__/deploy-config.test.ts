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
});
