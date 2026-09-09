import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Task 3's second guard, alongside the palette closure `tokens.test.ts`
 * already enforces on the GLSL itself.
 *
 * The instrument -- the WASM codec running on a converter route -- is the
 * product. A `ShaderSurface` there is a decorative canvas competing with it
 * for GPU and main-thread time on the one page a visitor actually came to
 * use, and nothing about that trade is worth making: this walks every file
 * the converter route can render and fails if any of them import the
 * texture layer at all, not just `ShaderSurface` by name -- `@/design/texture`
 * re-exports nothing else a route would have a legitimate reason to reach
 * for, so the whole barrel is the ban.
 */
const TEXTURE_IMPORT = /from ["']@\/design\/texture["']/;

const CONVERTER_PAGE = join("src", "design", "templates", "ConverterPage.tsx");
const CONVERTER_ROUTE_DIR = join("src", "app", "[category]", "[slug]");

function findFiles(dir: string, matches: (entry: string) => boolean): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...findFiles(full, matches));
			continue;
		}
		if (matches(entry)) out.push(full);
	}
	return out;
}

const CONVERTER_ROUTE_FILES = findFiles(CONVERTER_ROUTE_DIR, (entry) =>
	entry.endsWith(".tsx"),
);

describe("no converter route renders a shader", () => {
	// Non-vacuity: if the dynamic route folder were ever renamed or moved,
	// `findFiles` would return an empty array and the `it.each` below would
	// register zero cases and report green -- exactly the failure mode this
	// whole file exists to avoid for the route it is named for.
	it("finds converter route files to check", () => {
		expect(CONVERTER_ROUTE_FILES.length).toBeGreaterThan(0);
	});

	it("ConverterPage.tsx does not import from @/design/texture", () => {
		const source = readFileSync(CONVERTER_PAGE, "utf8");
		expect(
			source,
			`${CONVERTER_PAGE} imports @/design/texture -- a decorative canvas ` +
				"must not compete with a WASM codec for GPU/main-thread time on " +
				"the instrument's own page.",
		).not.toMatch(TEXTURE_IMPORT);
	});

	it.each(CONVERTER_ROUTE_FILES)(
		"%s does not import from @/design/texture",
		(file) => {
			const source = readFileSync(file, "utf8");
			expect(
				source,
				`${file} imports @/design/texture -- the converter route is the ` +
					"product's working surface, not a place for texture.",
			).not.toMatch(TEXTURE_IMPORT);
		},
	);
});

/**
 * Pins `TEXTURE_IMPORT` against fixture strings, the same reasoning every
 * other pattern table in this suite gives (`tokens.test.ts`,
 * `design-system.test.ts`): a corpus that is clean today proves nothing
 * about whether the regex itself would catch a real violation. This is
 * also the mutation this file's own report demonstrates live -- adding
 * `import { ShaderSurface } from "@/design/texture";` to `ConverterPage.tsx`
 * or to the tool route's `page.tsx` fails the two describe blocks above.
 */
describe("texture-import pattern", () => {
	it("matches the barrel import", () => {
		expect(
			TEXTURE_IMPORT.test('import { ShaderSurface } from "@/design/texture";'),
		).toBe(true);
	});

	it("matches a single-quoted import too", () => {
		expect(
			TEXTURE_IMPORT.test("import { ShaderSurface } from '@/design/texture';"),
		).toBe(true);
	});

	it("does not match an unrelated design import", () => {
		expect(
			TEXTURE_IMPORT.test(
				'import { ConverterPage } from "@/design/templates";',
			),
		).toBe(false);
	});
});

/**
 * The mirror guard: every real `ShaderSurface` usage in the codebase sits
 * inside a parent that establishes a positioning context (`position:
 * relative | absolute | fixed`), so the canvas's own `position: absolute;
 * inset: 0` resolves against that parent's box and can never escape its
 * band to cover the viewport -- v2's guardrail that colour stays confined
 * to the region it was drawn for depends on this holding.
 *
 * Scoped to `src/design/{families,chrome,templates}` -- `ShaderSurface.tsx`
 * itself and its own test file are exempt: the component's job is to BE
 * the thing a parent contains, not to contain itself, and the test file
 * renders it directly with no positioning parent by design, to test the
 * component in isolation.
 *
 * The check is a text-proximity heuristic, not a JSX parser (this suite's
 * other structural guards -- `band-gutter.test.ts`'s `extractStyleObjects`
 * chief among them -- take the same approach): for every `<ShaderSurface`
 * occurrence, the nearest `position:` declaration appearing earlier in the
 * same file's source must be one of the three values that create a
 * containing block for an absolutely positioned descendant. Source order
 * in JSX is document order, so an ancestor's opening tag -- and the style
 * object on it -- always appears before a descendant's in the file text.
 */
const COMPOSITION_DIRS = [
	join("src", "design", "families"),
	join("src", "design", "chrome"),
	join("src", "design", "templates"),
];

const POSITIONING_CONTEXT = /position:\s*["'](relative|absolute|fixed)["']/g;
const SHADER_SURFACE_USAGE = /<ShaderSurface\b/g;

function shaderSurfaceUsages(
	source: string,
): Array<{ index: number; nearestPosition: string | null }> {
	const positions = [...source.matchAll(POSITIONING_CONTEXT)].map((m) => ({
		index: m.index,
		value: m[1] ?? null,
	}));
	return [...source.matchAll(SHADER_SURFACE_USAGE)].map((usage) => {
		const preceding = positions.filter((p) => p.index < usage.index);
		const nearest = preceding[preceding.length - 1];
		return { index: usage.index, nearestPosition: nearest?.value ?? null };
	});
}

const compositionFiles = COMPOSITION_DIRS.flatMap((dir) =>
	findFiles(dir, (entry) => entry.endsWith(".tsx")),
);

const filesUsingShaderSurface = compositionFiles.filter((file) =>
	readFileSync(file, "utf8").includes("<ShaderSurface"),
);

describe("every ShaderSurface usage sits inside a positioning context", () => {
	// Non-vacuity: before HeroBand.tsx, TerminalPanel.tsx and SiteFooter.tsx
	// place the three named shaders, this finds nothing and the assertion
	// below is checking zero usages -- which is exactly what running this
	// file straight after Step 1 (before Step 3 wires the placements in) is
	// supposed to show: a real failure, not a guard that only looks
	// finished.
	it("finds real ShaderSurface usages to check", () => {
		const total = compositionFiles.reduce(
			(sum, file) =>
				sum +
				[...readFileSync(file, "utf8").matchAll(SHADER_SURFACE_USAGE)].length,
			0,
		);
		expect(total).toBeGreaterThanOrEqual(3);
	});

	for (const file of filesUsingShaderSurface) {
		const source = readFileSync(file, "utf8");
		const usages = shaderSurfaceUsages(source);

		it.each(usages.map((u, i) => [i, u.nearestPosition] as const))(
			`${file}: usage #%s resolves against a positioned parent (found %s)`,
			(_i, nearestPosition) => {
				expect(
					nearestPosition,
					`${file} renders <ShaderSurface> with no preceding ` +
						`position: relative|absolute|fixed in the same file -- ` +
						"its inset:0 has nothing to size against and can escape its band.",
				).not.toBeNull();
			},
		);
	}
});

describe("ShaderSurface usage + positioning-context patterns", () => {
	it("finds the nearest preceding position declaration, not the first or last unconditionally", () => {
		const fixture = [
			'<div style={{ position: "relative" }}>',
			'  <ShaderSurface fragment={FRAG} label="a" />',
			'  <section style={{ position: "relative" }}>',
			'    <ShaderSurface fragment={FRAG} label="b" />',
			"  </section>",
			"</div>",
		].join("\n");
		const usages = shaderSurfaceUsages(fixture);
		expect(usages.map((u) => u.nearestPosition)).toEqual([
			"relative",
			"relative",
		]);
	});

	it("reports null when no positioning declaration precedes the usage", () => {
		const fixture = [
			"<div>",
			'  <ShaderSurface fragment={FRAG} label="a" />',
			"</div>",
		].join("\n");
		const usages = shaderSurfaceUsages(fixture);
		expect(usages.map((u) => u.nearestPosition)).toEqual([null]);
	});

	it("ignores position: static, which creates no containing block", () => {
		const fixture = [
			'<div style={{ position: "static" }}>',
			'  <ShaderSurface fragment={FRAG} label="a" />',
			"</div>",
		].join("\n");
		const usages = shaderSurfaceUsages(fixture);
		expect(usages.map((u) => u.nearestPosition)).toEqual([null]);
	});
});
