import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Spec §6.3: "A `page.tsx` may not contain layout. It resolves data from a
 * registry and hands it to a template." Stated in prose that is a
 * convention nobody checks — a route can grow a `<div>` and a hand-rolled
 * grid one review at a time and nothing notices. Turned into a test over
 * every `src/app/**\/page.tsx`, it is a rule: no layout, and an import from
 * `@/design/templates`, or the route fails.
 *
 * The walk is recursive rather than a hand-written list of route folders,
 * for the same reason `primitives-contract.test.ts`'s `componentFiles`
 * walks a directory instead of naming files: a list goes stale the moment
 * someone adds a route, which is exactly the moment this guard is for. It
 * has to recurse — unlike that helper's flat `readdirSync`, `src/app`
 * nests a route per URL segment (`[category]/[slug]/page.tsx`), so a
 * shallow walk would miss every dynamic segment two levels deep.
 */
const APP_DIR = "src/app";
const TEMPLATES_IMPORT = /from ["']@\/design\/templates["']/;

function findPageFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...findPageFiles(full));
			continue;
		}
		if (entry === "page.tsx") out.push(full);
	}
	return out;
}

const PAGE_FILES = findPageFiles(APP_DIR);

/**
 * The line range of the default-exported component's body — from the
 * `export default` keyword through the line holding the closing brace that
 * matches its opening one, inclusive.
 *
 * Controller amendment 2 is why this exists instead of a whole-file count.
 * `src/app/[category]/page.tsx` was 83 lines, but three of its four groups
 * — `SITE`/`isCategory`/`label`, `generateStaticParams`/`dynamicParams`,
 * and `generateMetadata`'s ~20 lines of OpenGraph fields — are not layout,
 * and Next *requires* `generateMetadata` to be exported from the route
 * file. A whole-file cap punishes a route for carrying metadata, which has
 * nothing to do with spec §6.3's rule. So this locates ONLY the
 * `export default function` / `export default async function` and counts
 * its own lines, leaving every named export — helpers, `generateMetadata`,
 * `generateStaticParams`, `dynamicParams` — outside the count entirely, by
 * construction: the pattern below never matches a named export at all.
 *
 * Brace-depth counting rather than a line-based heuristic, because a prop
 * type can legitimately span multiple lines with its own braces
 * (`{ params }: { params: Promise<{ category: string }> }`), and those
 * inner braces are not the function body's. The parameter list is walked
 * first by PAREN depth specifically — never brace depth — so a typed
 * destructured argument's braces cannot be mistaken for the body opening
 * early. Only once the parameter list's parens have closed does the scan
 * look for the body's own `{` and start counting braces.
 */
function defaultExportComponentLines(
	source: string,
): { startLine: number; endLine: number } | null {
	const match = /export default (?:async\s+)?function\s+\w*\s*\(/.exec(source);
	if (!match) return null;

	// Walk the parameter list by paren depth to its close. This never looks
	// at braces, so a typed destructured param's own `{ ... }` cannot be
	// mistaken for the function body opening early.
	let i = match.index + match[0].length - 1; // sits on the '(' of the parameter list
	let parenDepth = 0;
	for (; i < source.length; i++) {
		const char = source[i];
		if (char === "(") parenDepth++;
		else if (char === ")") {
			parenDepth--;
			if (parenDepth === 0) {
				i++;
				break;
			}
		}
	}

	// The next `{` after the parameter list closes is the body's own.
	while (i < source.length && source[i] !== "{") i++;
	if (i >= source.length) return null;

	let braceDepth = 0;
	let bodyCloseIndex = -1;
	for (; i < source.length; i++) {
		const char = source[i];
		if (char === "{") braceDepth++;
		else if (char === "}") {
			braceDepth--;
			if (braceDepth === 0) {
				bodyCloseIndex = i;
				break;
			}
		}
	}
	if (bodyCloseIndex === -1) return null;

	const startLine = source.slice(0, match.index).split("\n").length;
	const endLine = source.slice(0, bodyCloseIndex).split("\n").length;
	return { startLine, endLine };
}

/** `wc -l`-equivalent: counts newlines, not array-split fence-posts. */
function countLines(source: string): number {
	const withoutTrailingNewline = source.endsWith("\n")
		? source.slice(0, -1)
		: source;
	return withoutTrailingNewline.split("\n").length;
}

/**
 * 50 is a measured figure, not a round one. Controller amendment 1: with
 * ordinary named imports (no `import * as Families`, adopted once purely to
 * satisfy a line count and proved byte-identical either way) the rebuilt
 * home route's whole file lands at exactly 50 lines. A route this shape —
 * metadata, one or two lines resolving data from a registry, one template
 * call — cannot hide a composition inside 50 lines of component body
 * either; there simply is not room.
 */
const COMPONENT_BODY_CAP = 50;

/**
 * 150 is a backstop, not a target. Measuring only the default-exported
 * component (per amendment 2) means a route could in principle carry a
 * thousand lines of helpers above it and still pass the 50-line component
 * check. This ceiling catches that pathological case — a route that has
 * stopped being "data resolution and helpers" and become a second file's
 * worth of logic wearing a route's path — without punishing the ordinary
 * cost of a route file: imports, typed helpers, `generateStaticParams`,
 * `dynamicParams`, and a `generateMetadata` that Next requires to live
 * here.
 */
const WHOLE_FILE_BACKSTOP = 150;

describe("route purity", () => {
	// Non-vacuity: if `src/app` were renamed, or every route moved under a
	// route group this walk didn't expect, `findPageFiles` would return an
	// empty array and every `it.each` below would register zero cases and
	// report green — the exact failure mode `it.each` over `[]` produces,
	// and the exact one this whole guard exists to avoid for the routes
	// themselves. Six is the number of live routes at time of writing.
	it("finds page routes to check", () => {
		expect(PAGE_FILES.length).toBeGreaterThanOrEqual(6);
	});

	it.each(PAGE_FILES)("%s imports from @/design/templates", (file) => {
		const source = readFileSync(file, "utf8");
		expect(source, `${file} does not import from @/design/templates`).toMatch(
			TEMPLATES_IMPORT,
		);
	});

	it.each(PAGE_FILES)(
		"%s's default-exported component is at most 50 lines",
		(file) => {
			const source = readFileSync(file, "utf8");
			const range = defaultExportComponentLines(source);
			expect(
				range,
				`${file}: no \`export default function\` / \`export default async function\` found`,
			).not.toBeNull();
			if (!range) return;
			const length = range.endLine - range.startLine + 1;
			expect(
				length,
				`${file}: default-exported component is ${length} lines ` +
					`(lines ${range.startLine}-${range.endLine}), cap is ${COMPONENT_BODY_CAP}`,
			).toBeLessThanOrEqual(COMPONENT_BODY_CAP);
		},
	);

	it.each(PAGE_FILES)(
		"%s is at most 150 lines total (whole-file backstop)",
		(file) => {
			const source = readFileSync(file, "utf8");
			const total = countLines(source);
			expect(
				total,
				`${file}: ${total} lines, backstop is ${WHOLE_FILE_BACKSTOP}`,
			).toBeLessThanOrEqual(WHOLE_FILE_BACKSTOP);
		},
	);
});

/**
 * Pins `defaultExportComponentLines` against fixture strings directly,
 * rather than relying only on whatever `src/app` happens to contain today —
 * the same reasoning `design-system.test.ts` and `tokens.test.ts` give for
 * pinning their own sweeps against fixture tables. A corpus that is clean
 * (or short) today says nothing about whether the extraction itself is
 * counting the right lines; six routes that all currently pass would not
 * have caught a version of this function that also counted
 * `generateMetadata`.
 *
 * The third fixture is the one Controller amendment 2 exists for: it
 * proves, permanently and without touching a real route, that a named
 * export sitting above the default one contributes nothing to the count.
 */
describe("default-export component line counter", () => {
	it("counts a synchronous component from its declaration through its closing brace", () => {
		const fixture = [
			'import Foo from "bar";',
			"",
			"export default function Page() {",
			"\treturn null;",
			"}",
			"",
		].join("\n");
		expect(defaultExportComponentLines(fixture)).toEqual({
			startLine: 3,
			endLine: 5,
		});
	});

	it("counts an async component whose param is a destructured, typed Promise", () => {
		// The exact shape every dynamic route in this codebase uses:
		// `{ params }: { params: Promise<{ ... }> }`. The inner braces around
		// `id: string` belong to the type, not the body, and must not be
		// mistaken for it.
		const fixture = [
			"export default async function Page({",
			"\tparams,",
			"}: {",
			"\tparams: Promise<{ id: string }>;",
			"}) {",
			"\tconst { id } = await params;",
			"\treturn null;",
			"}",
		].join("\n");
		expect(defaultExportComponentLines(fixture)).toEqual({
			startLine: 1,
			endLine: 8,
		});
	});

	it("does not count a named export's lines as the default component's", () => {
		const fixture = [
			"export async function generateMetadata() {",
			"\treturn {",
			'\t\ttitle: "a",',
			'\t\tdescription: "b",',
			"\t};",
			"}",
			"",
			"export default function Page() {",
			"\treturn null;",
			"}",
		].join("\n");
		// generateMetadata is lines 1-6; if it leaked into the count, endLine
		// would report 10 lines from line 1, not 3 lines from line 8.
		expect(defaultExportComponentLines(fixture)).toEqual({
			startLine: 8,
			endLine: 10,
		});
	});

	it("returns null when there is no default-exported function", () => {
		expect(defaultExportComponentLines("export const x = 1;")).toBeNull();
	});
});
