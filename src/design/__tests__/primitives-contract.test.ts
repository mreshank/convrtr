import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BARREL = "src/design/primitives/index.ts";

/**
 * `src/design/families/` has its own barrel rather than re-exporting through
 * the primitives one: the families are compositions, the primitives are the
 * parts, and templates import from whichever layer they mean. So it needs its
 * own check — the primitives barrel could not export a family even if someone
 * wanted it to.
 */
const FAMILIES_BARREL = "src/design/families/index.ts";

/**
 * `src/design/templates/` is the fourth composition layer, and the same
 * argument that gave `families/` its own barrel check applies to it
 * unchanged: `route-purity.test.ts` requires every route to import from
 * this barrel specifically, so a template that exists but is not exported
 * here is invisible to every route in the app.
 *
 * It also exists to close a gap this suite shipped with. Every sweep below
 * named `primitives/`, `chrome/` and `families/` explicitly, and
 * `templates/` is a whole directory that came later and sat outside all of
 * them — proved by mutation: a throwaway `templates/Unexported.tsx` that
 * the barrel did not export passed this entire file green before this
 * constant and the checks below existed, for exactly the reason
 * `families/Unexported.tsx` once did.
 */
const TEMPLATES_BARREL = "src/design/templates/index.ts";

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
	const familiesBarrel = readFileSync(FAMILIES_BARREL, "utf8");
	const templatesBarrel = readFileSync(TEMPLATES_BARREL, "utf8");

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

	it.each(componentFiles("src/design/families"))(
		"exports %s from families",
		(component) => {
			// The families barrel is the only import path templates use. A
			// family that exists but is not exported is invisible to them, and
			// nothing else in the suite would notice.
			//
			// This check did not exist until the families directory had ten
			// components in it, and its absence was not theoretical: a
			// throwaway `families/Unexported.tsx` that the barrel did not
			// export passed this whole file green, because every sweep here
			// named `primitives/` and `chrome/` explicitly and a new directory
			// simply fell outside them. Proved by mutation before the check
			// was written, and proved to fail after.
			expect(familiesBarrel).toContain(`from "./${component}"`);
		},
	);

	it.each(componentFiles("src/design/templates"))(
		"exports %s from templates",
		(component) => {
			// Same reasoning as the families check above, for the layer
			// `route-purity.test.ts` actually requires routes to import from.
			expect(templatesBarrel).toContain(`from "./${component}"`);
		},
	);

	it("exports at least the nine primitives the spec names", () => {
		// A guard against the barrel being emptied or the directory being
		// moved without this test noticing it now covers nothing.
		expect(
			componentFiles("src/design/primitives").length,
		).toBeGreaterThanOrEqual(9);
	});

	it("exports at least the ten families the plan names", () => {
		// Same non-vacuity guard, for the same reason: `it.each` over an
		// empty directory registers no cases and reports green. If the
		// families move or the directory is renamed, this fails instead of
		// the coverage disappearing silently.
		expect(componentFiles("src/design/families").length).toBeGreaterThanOrEqual(
			10,
		);
	});

	it("exports at least the four templates this plan names", () => {
		// Same non-vacuity guard, for the same reason, for the fourth layer:
		// `EditorialPage`, `HubPage`, `ArticlePage`, `ConverterPage`.
		expect(
			componentFiles("src/design/templates").length,
		).toBeGreaterThanOrEqual(4);
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
 * directory. `DifferenceCursor` (a pointer-tracking rAF loop) is the only
 * component that legitimately owns client state, so it is the only one
 * allowed a `"use client"` directive. This is written as an allowlist
 * rather than a count, so adding a second client component is a deliberate
 * act — editing this list — rather than something that passes by accident.
 *
 * `SiteHeader` was the other entry. It held overlay open/close state, a Tab
 * trap and a scroll lock, all of which existed because its nav covered the
 * viewport. v2's navbar holds its links inline in a 64px bar that covers
 * nothing, so the state went and the directive with it — and the entry had
 * to leave this list too, since the second test below requires every name
 * here to still declare the directive.
 *
 * The sweep runs over `primitives/`, `chrome/`, `families/` AND
 * `templates/`. Each directory had to be named explicitly: these helpers
 * take a directory argument, so a directory nobody passes is a directory
 * nobody checks. `families/` sat outside all of it for ten components, and
 * `templates/` sat outside all of it for four more, for the same reason.
 *
 * Every template in this plan is a server component: `EditorialPage`
 * imposes a flex shell, `HubPage` frames a listing, `ArticlePage` sets a
 * prose measure, `ConverterPage` frames the instrument — none holds state.
 * So the allowlist gains no entries for `templates/` either, and a template
 * that acquires the directive without being added to it fails.
 */
const CLIENT_COMPONENT_ALLOWLIST = new Set([
	"DifferenceCursor.tsx",
	// `ShaderSurface` (`src/design/texture/`) owns a WebGL context, an
	// animation loop, an `IntersectionObserver` and pointer listeners --
	// state a server component cannot hold. It is the one client component
	// the texture plan adds; everything built on top of it in that
	// directory is composition and stays a server component.
	"ShaderSurface.tsx",
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

	it('allows "use client" only on the allowlisted families', () => {
		// Every family in this plan is a server component -- none holds
		// state, and the two that could have wanted it (`FormatStrip`'s
		// marquee, `BranchDiagram`'s geometry) are pure CSS and pure
		// arithmetic respectively. So the allowlist gains no entries here,
		// and a family that acquires the directive without being added to it
		// fails. Verified by mutation: a `"use client"` prepended to
		// `FeatureGrid.tsx` passed this file green before this test existed.
		const offenders = filesDeclaringUseClient("src/design/families").filter(
			(name) => !CLIENT_COMPONENT_ALLOWLIST.has(name),
		);
		expect(offenders).toEqual([]);
	});

	it('allows "use client" only on the allowlisted templates', () => {
		// All four templates are server components -- see the comment above
		// CLIENT_COMPONENT_ALLOWLIST for why each one specifically holds no
		// state. Verified by mutation: a `"use client"` prepended to
		// `HubPage.tsx` passed this file green before this test existed.
		const offenders = filesDeclaringUseClient("src/design/templates").filter(
			(name) => !CLIENT_COMPONENT_ALLOWLIST.has(name),
		);
		expect(offenders).toEqual([]);
	});

	it('allows "use client" only on the allowlisted texture components', () => {
		// `src/design/texture/` is the fifth composition layer this sweep
		// covers, added when `ShaderSurface` shipped as this plan's one
		// client component. Same reasoning as `families/` and `templates/`
		// above sitting outside every check until named explicitly: a
		// directory nobody passes to `filesDeclaringUseClient` is a
		// directory nobody checks, so this had to be added rather than
		// assumed to fall under an existing sweep.
		const offenders = filesDeclaringUseClient("src/design/texture").filter(
			(name) => !CLIENT_COMPONENT_ALLOWLIST.has(name),
		);
		expect(offenders).toEqual([]);
	});

	it('still requires "use client" on every allowlisted component', () => {
		// Guards the allowlist itself against going stale in the other
		// direction — an entry that no longer needs the directive should be
		// removed from the list, not left as dead cover for nothing.
		const declaring = new Set([
			...filesDeclaringUseClient("src/design/primitives"),
			...filesDeclaringUseClient("src/design/chrome"),
			...filesDeclaringUseClient("src/design/families"),
			...filesDeclaringUseClient("src/design/templates"),
			...filesDeclaringUseClient("src/design/texture"),
		]);
		for (const name of CLIENT_COMPONENT_ALLOWLIST) {
			expect(declaring.has(name)).toBe(true);
		}
	});
});
