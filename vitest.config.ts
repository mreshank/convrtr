import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "happy-dom",
		globals: true,
		// e2e/**/*.spec.ts are Playwright specs, not Vitest tests — Playwright's
		// test() throws when invoked outside its own runner, so they must be
		// excluded here rather than picked up by Vitest's default glob.
		exclude: [...configDefaults.exclude, "e2e/**"],
	},
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
});
