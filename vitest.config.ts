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
		// `.worktrees/**` keeps a git worktree checked out inside the repo from
		// being scanned. Without it Vitest runs a second copy of the entire
		// suite from the worktree — the count doubles and its Playwright specs
		// fail, which looks alarming and is entirely an artefact. `.gitignore`
		// does not help here; Vitest globs the filesystem directly.
		exclude: [...configDefaults.exclude, "e2e/**", ".worktrees/**"],
	},
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
});
