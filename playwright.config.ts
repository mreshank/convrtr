import { defineConfig } from "@playwright/test";

const PORT = 4173;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	use: { baseURL },
	webServer: {
		// Builds the real `output: "export"` artifact and serves it with the
		// same Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy
		// headers vercel.json applies in production. The previous `pnpm dev`
		// command exercised neither the static build nor those headers, so
		// e2e was never testing what actually ships.
		command: "pnpm build && node scripts/serve-static.mjs",
		url: baseURL,
		env: { PORT: String(PORT) },
		// A stale server left over from another branch must not silently
		// satisfy this gate in CI; locally, reusing one already running is
		// still convenient.
		reuseExistingServer: !process.env.CI,
	},
});
