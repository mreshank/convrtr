import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Controller amendment (routes-and-content plan, task 6): `const SITE =
 * "https://convrtr.mreshank.com"` used to be declared separately in every
 * route file that needed it -- sixteen copies, all agreeing only because
 * nothing forced them to. `src/lib/site.ts` is now the one declaration;
 * this walks the source tree the same way `route-purity.test.ts`'s
 * `findPageFiles` does and fails if a second literal reappears anywhere
 * else, so a future route can't quietly drift from the origin the sitemap
 * and every route's own metadata both read.
 *
 * Test fixtures are excluded (`__tests__` directories and `.test.` files):
 * `src/lib/__tests__/jsonld.test.ts` passes an arbitrary-looking URL string
 * straight into `buildToolJsonLd`/`buildBlogPostingJsonLd` as test data --
 * it is not declaring the site's canonical origin, and any other URL would
 * serve the test equally well. What this guards against is a second
 * *source of truth*, not the substring appearing in an assertion.
 */
const ROOTS = ["src", "scripts"];
const CANONICAL_FILE = join("src", "lib", "site.ts");
const ORIGIN_LITERAL = /https:\/\/convrtr\.mreshank\.com/;

function isTestPath(path: string): boolean {
	return path.includes("__tests__/") || path.includes(".test.");
}

function findSourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__") continue;
			out.push(...findSourceFiles(full));
			continue;
		}
		if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(full);
	}
	return out;
}

const SOURCE_FILES = ROOTS.flatMap(findSourceFiles)
	.map((file) => relative(process.cwd(), file))
	.filter((file) => file !== CANONICAL_FILE && !isTestPath(file));

describe("the site origin has exactly one declaration", () => {
	// Non-vacuity, same reasoning `route-purity.test.ts` gives for its own
	// count: if the walk above returned nothing, every `it.each` below would
	// register zero cases and report green -- silently disabling the guard
	// rather than failing it.
	it("finds source files to check", () => {
		expect(SOURCE_FILES.length).toBeGreaterThan(50);
	});

	it.each(SOURCE_FILES)(
		"%s does not declare the site origin literally",
		(file) => {
			const source = readFileSync(file, "utf8");
			expect(
				source,
				`${file} declares the site origin as a literal -- import SITE from @/lib/site instead`,
			).not.toMatch(ORIGIN_LITERAL);
		},
	);

	it("src/lib/site.ts is itself the one declaration", () => {
		const source = readFileSync(CANONICAL_FILE, "utf8");
		expect(source).toMatch(ORIGIN_LITERAL);
	});
});
