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
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			// `next/font/google`'s real package entry is an empty file, meant
			// to be swapped for a compiled loader by Next's own build
			// pipeline. Vite never does that swap, so any test importing a
			// module that imports `next/font/google` (`layout.tsx`) would
			// otherwise crash on `Inter is not a function` before running.
			// See test/mocks/next-font-google.ts for the shape this replaces.
			"next/font/google": fileURLToPath(
				new URL("./test/mocks/next-font-google.ts", import.meta.url),
			),
		},
	},
});
