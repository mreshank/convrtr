import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BARREL = "src/design/primitives/index.ts";

/**
 * A primitive that exists but is not exported is invisible to the templates
 * that need it, and nothing else in the suite would notice. This walks the
 * directory rather than checking a hand-written list, so adding a file is
 * enough to be covered.
 */
function componentFiles(dir: string): string[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith(".tsx"))
		.map((name) => name.replace(/\.tsx$/, ""));
}

describe("primitives barrel", () => {
	const barrel = readFileSync(BARREL, "utf8");

	it.each(componentFiles("src/design/primitives"))(
		"exports %s",
		(component) => {
			expect(barrel).toContain(`from "./${component}"`);
		},
	);

	it.each(componentFiles("src/design/chrome"))(
		"exports %s from chrome",
		(component) => {
			expect(barrel).toContain(`from "../chrome/${component}"`);
		},
	);

	it("exports at least the nine primitives the spec names", () => {
		// A guard against the barrel being emptied or the directory being
		// moved without this test noticing it now covers nothing.
		expect(
			componentFiles("src/design/primitives").length,
		).toBeGreaterThanOrEqual(9);
	});
});

/**
 * `Reveal` has a load-bearing property with no test behind it: it must work
 * without JavaScript. On a static export a JS-driven reveal flashes
 * unstyled content before hydration, which is worse than no animation at
 * all. But `Reveal`'s own tests check DOM shape — span counts, aria-hidden,
 * custom-property values — all of which a client-side rewrite would satisfy
 * equally. Nothing in the existing suite would fail if someone converted it.
 *
 * The right guard is not per-component: it is a sweep of the whole
 * directory. `DifferenceCursor` (a pointer-tracking rAF loop) and
 * `SiteHeader` (overlay open/close state, focus trapping) are the only two
 * components that legitimately own client state, so they are the only two
 * allowed a `"use client"` directive. This is written as an allowlist
 * rather than a count, so adding a third client component is a deliberate
 * act — editing this list — rather than something that passes by accident.
 */
const CLIENT_COMPONENT_ALLOWLIST = new Set([
	"DifferenceCursor.tsx",
	"SiteHeader.tsx",
]);

function filesDeclaringUseClient(dir: string): string[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith(".tsx"))
		.filter((name) =>
			/^\s*["']use client["']/.test(readFileSync(`${dir}/${name}`, "utf8")),
		);
}

describe("server-component guard", () => {
	it('allows "use client" only on the allowlisted primitives', () => {
		const offenders = filesDeclaringUseClient("src/design/primitives").filter(
			(name) => !CLIENT_COMPONENT_ALLOWLIST.has(name),
		);
		expect(offenders).toEqual([]);
	});

	it('allows "use client" only on the allowlisted chrome components', () => {
		const offenders = filesDeclaringUseClient("src/design/chrome").filter(
			(name) => !CLIENT_COMPONENT_ALLOWLIST.has(name),
		);
		expect(offenders).toEqual([]);
	});

	it('still requires "use client" on both allowlisted components', () => {
		// Guards the allowlist itself against going stale in the other
		// direction — an entry that no longer needs the directive should be
		// removed from the list, not left as dead cover for nothing.
		const declaring = new Set([
			...filesDeclaringUseClient("src/design/primitives"),
			...filesDeclaringUseClient("src/design/chrome"),
		]);
		for (const name of CLIENT_COMPONENT_ALLOWLIST) {
			expect(declaring.has(name)).toBe(true);
		}
	});
});
