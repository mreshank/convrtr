# Special-Converter Content Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an on-site MDX blog subsystem for convrtr, and publish the first 5-post content cluster for the `video/mlw-to-mp4` special converter.

**Architecture:** Post metadata (`meta.ts`, plain data) is split from post bodies (`content.mdx`/`content.tsx`), mirroring `core/registry`'s split of `Tool.seo` (plain data) from the engine layer. A registry file collects all `meta.ts` files; the blog route dynamically imports only the one matching content file per page, so the index never pulls every post's body into one build graph — the same failure class `mime-parity.test.ts`'s "module boundary" test already guards against for tools.

**Tech Stack:** Next.js App Router (static export, `output: "export"`), `@next/mdx`, TypeScript, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-27-special-converter-content-design.md`

## Global Constraints

- Static export only — no server, no API routes, no runtime data fetching. Every page is built at `next build` time.
- MDX is the default authoring format; `.tsx` is available per-post. A post's `meta.ts` declares which (`bodyFormat: "mdx" | "tsx"`).
- `meta.ts` files must never import a `content.mdx`/`content.tsx` file, and `registry.ts` must never import a content file either — only `src/app/blog/[slug]/page.tsx` does, via a per-slug dynamic `import()`.
- Every `<ToolCTA toolId="..." />` reads the real tool via `getTool()` from `core/registry` — post prose never hand-copies a tool's title or description.
- Tool ↔ post linking is bidirectional: every post ends with a `<ToolCTA>`; the tool's own page renders a "Related reading" block via `getPostsByTool(tool.id)`.
- Follow existing conventions exactly: `Tool`-style plain-data registries, `page.tsx`/`generateStaticParams`/`generateMetadata` server-component pattern, JSON-LD via `src/lib/jsonld.ts`, Testing-Library component tests, Playwright e2e with the network guard.

---

### Task 1: Add MDX support to the build

**Files:**
- Modify: `package.json` (add dependencies)
- Modify: `next.config.ts`
- Create: `src/mdx-components.tsx`

**Interfaces:**
- Produces: `useMDXComponents(): MDXComponents` exported from `src/mdx-components.tsx`, required by `@next/mdx` for the App Router. Starts with an empty component map — Task 7 fills it in once the real components exist.

- [ ] **Step 1: Install the MDX packages**

Run:

```bash
pnpm add @next/mdx @mdx-js/loader @mdx-js/react @types/mdx
```

- [ ] **Step 2: Wire `@next/mdx` into the Next.js config**

Replace the full contents of `next.config.ts`:

```ts
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	images: { unoptimized: true },
	reactStrictMode: true,
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
```

This does not add `.mdx` to `pageExtensions` — nothing under `src/app` should become a route just by having an `.mdx` extension. All MDX content lives under `src/content/` and is loaded only via explicit dynamic `import()` in `src/app/blog/[slug]/page.tsx` (Task 8). What `withMDX` does provide, and what's actually needed here, is registering the MDX loader so any `.mdx` file compiles to an importable React component module at all.

- [ ] **Step 3: Create the MDX components stub**

Create `src/mdx-components.tsx`:

```tsx
import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
	return components;
}
```

This file must live at `src/mdx-components.tsx` (same level as `src/app`) — `@next/mdx` requires this exact filename and location for the App Router and will not compile MDX without it.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: passes with no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts src/mdx-components.tsx
git commit -m "feat: add MDX support to the Next.js build"
```

---

### Task 2: Blog post types and registry

**Files:**
- Create: `src/content/blog/types.ts`
- Create: `src/content/blog/registry.ts`
- Create: `src/content/blog/__tests__/registry.test.ts`

**Interfaces:**
- Produces: `BlogPostMeta` interface; `BLOG_POSTS: BlogPostMeta[]` (starts empty); `getPost(slug: string, posts?: BlogPostMeta[]): BlogPostMeta | undefined`; `getPostsByTool(toolId: string, posts?: BlogPostMeta[]): BlogPostMeta[]`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

Create `src/content/blog/__tests__/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPost, getPostsByTool } from "../registry";
import type { BlogPostMeta } from "../types";

const fixture: BlogPostMeta[] = [
	{
		slug: "post-a",
		title: "Post A",
		description: "d",
		publishedAt: "2026-01-01",
		relatedTools: ["video/mlw-to-mp4"],
		tags: [],
		bodyFormat: "mdx",
	},
	{
		slug: "post-b",
		title: "Post B",
		description: "d",
		publishedAt: "2026-01-02",
		relatedTools: ["image/png-to-webp"],
		tags: [],
		bodyFormat: "tsx",
	},
];

describe("getPost", () => {
	it("finds a post by slug", () => {
		expect(getPost("post-a", fixture)?.title).toBe("Post A");
	});

	it("returns undefined for an unknown slug", () => {
		expect(getPost("nope", fixture)).toBeUndefined();
	});
});

describe("getPostsByTool", () => {
	it("returns only posts whose relatedTools includes the given tool id", () => {
		expect(getPostsByTool("video/mlw-to-mp4", fixture).map((p) => p.slug)).toEqual([
			"post-a",
		]);
	});

	it("returns an empty array when no post references the tool", () => {
		expect(getPostsByTool("data/csv-to-json", fixture)).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/blog/__tests__/registry.test.ts`
Expected: FAIL — `src/content/blog/registry` and `src/content/blog/types` don't exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `src/content/blog/types.ts`:

```ts
export interface BlogPostMeta {
	slug: string;
	title: string;
	description: string;
	/** ISO date, e.g. "2026-08-27". */
	publishedAt: string;
	/** Tool ids this post supports, e.g. "video/mlw-to-mp4" — must resolve via core/registry's getTool(). */
	relatedTools: string[];
	tags: string[];
	bodyFormat: "mdx" | "tsx";
}
```

Create `src/content/blog/registry.ts`:

```ts
import type { BlogPostMeta } from "./types";

/**
 * Metadata only — every entry here is a plain object imported from a
 * `meta.ts` file. Content bodies (`content.mdx`/`content.tsx`) are never
 * imported here; only `src/app/blog/[slug]/page.tsx` loads one, per slug,
 * via a dynamic import. Importing every post's body into this file would
 * pull all of them into the build graph of any page that lists posts —
 * the same class of bug `core/registry`'s module-boundary test guards
 * against for tools.
 */
export const BLOG_POSTS: BlogPostMeta[] = [];

export function getPost(
	slug: string,
	posts: BlogPostMeta[] = BLOG_POSTS,
): BlogPostMeta | undefined {
	return posts.find((post) => post.slug === slug);
}

export function getPostsByTool(
	toolId: string,
	posts: BlogPostMeta[] = BLOG_POSTS,
): BlogPostMeta[] {
	return posts.filter((post) => post.relatedTools.includes(toolId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/blog/__tests__/registry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/types.ts src/content/blog/registry.ts src/content/blog/__tests__/registry.test.ts
git commit -m "feat: add blog post types and registry lookup functions"
```

---

### Task 3: BlogPosting JSON-LD

**Files:**
- Modify: `src/lib/jsonld.ts`
- Modify: `src/lib/__tests__/jsonld.test.ts`

**Interfaces:**
- Consumes: `BlogPostMeta` from `src/content/blog/types.ts` (Task 2).
- Produces: `buildBlogPostingJsonLd(post: BlogPostMeta, url: string)`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/__tests__/jsonld.test.ts` (new import + new `describe` block; keep the existing `buildToolJsonLd` tests unchanged):

```ts
import type { BlogPostMeta } from "@/content/blog/types";
import { buildBlogPostingJsonLd, buildToolJsonLd } from "../jsonld";
```

```ts
describe("buildBlogPostingJsonLd", () => {
	const post: BlogPostMeta = {
		slug: "example-post",
		title: "Example post",
		description: "An example description.",
		publishedAt: "2026-08-27",
		relatedTools: ["video/mlw-to-mp4"],
		tags: [],
		bodyFormat: "mdx",
	};

	it("emits a BlogPosting node with the post's headline, description and date", () => {
		const jsonLd = buildBlogPostingJsonLd(
			post,
			"https://convrtr.mreshank.com/blog/example-post",
		) as {
			"@type": string;
			headline: string;
			description: string;
			datePublished: string;
			url: string;
		};
		expect(jsonLd["@type"]).toBe("BlogPosting");
		expect(jsonLd.headline).toBe(post.title);
		expect(jsonLd.description).toBe(post.description);
		expect(jsonLd.datePublished).toBe(post.publishedAt);
		expect(jsonLd.url).toBe("https://convrtr.mreshank.com/blog/example-post");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/jsonld.test.ts`
Expected: FAIL — `buildBlogPostingJsonLd` is not exported from `../jsonld`.

- [ ] **Step 3: Write the minimal implementation**

Add to `src/lib/jsonld.ts` (append; keep `buildToolJsonLd` unchanged):

```ts
import type { BlogPostMeta } from "@/content/blog/types";
```

```ts
export function buildBlogPostingJsonLd(post: BlogPostMeta, url: string) {
	return {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: post.title,
		description: post.description,
		datePublished: post.publishedAt,
		url,
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/jsonld.test.ts`
Expected: PASS (existing `buildToolJsonLd` tests plus the new `buildBlogPostingJsonLd` test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/jsonld.ts src/lib/__tests__/jsonld.test.ts
git commit -m "feat: add BlogPosting JSON-LD for blog posts"
```

---

### Task 4: Content primitives — Callout, FAQ, ComparisonTable

**Files:**
- Create: `src/components/content/Callout.tsx`
- Create: `src/components/content/__tests__/Callout.test.tsx`
- Create: `src/components/content/FAQ.tsx`
- Create: `src/components/content/__tests__/FAQ.test.tsx`
- Create: `src/components/content/ComparisonTable.tsx`
- Create: `src/components/content/__tests__/ComparisonTable.test.tsx`

**Interfaces:**
- Produces: `Callout({ kind: "note" | "warning", children })`; `FAQ({ items: FAQItem[] })` where `FAQItem = { q: string; a: string }`; `ComparisonTable({ columns: string[], rows: ComparisonRow[] })` where `ComparisonRow = { label: string; values: string[] }`.

- [ ] **Step 1: Write the failing test for Callout**

Create `src/components/content/__tests__/Callout.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "../Callout";

describe("Callout", () => {
	it("labels a note callout and renders its body", () => {
		render(<Callout kind="note">Body text</Callout>);
		expect(screen.getByText("Note")).toBeDefined();
		expect(screen.getByText("Body text")).toBeDefined();
	});

	it("labels a warning callout distinctly from a note", () => {
		render(<Callout kind="warning">Careful</Callout>);
		expect(screen.getByText("Warning")).toBeDefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/content/__tests__/Callout.test.tsx`
Expected: FAIL — `../Callout` doesn't exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/content/Callout.tsx`:

```tsx
type CalloutProps = { kind: "note" | "warning"; children: React.ReactNode };

const KIND_LABEL: Record<CalloutProps["kind"], string> = {
	note: "Note",
	warning: "Warning",
};

export function Callout({ kind, children }: CalloutProps) {
	return (
		<div
			role="note"
			className="flex flex-col gap-1 rounded-[var(--radius)] border p-4 text-[14px]"
			style={{ borderColor: kind === "warning" ? "var(--lossy)" : "var(--hairline)" }}
		>
			<p
				className="text-[12px] uppercase tracking-[0.08em]"
				style={{ color: "var(--text-muted)" }}
			>
				{KIND_LABEL[kind]}
			</p>
			<div>{children}</div>
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/content/__tests__/Callout.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for FAQ**

Create `src/components/content/__tests__/FAQ.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FAQ } from "../FAQ";

describe("FAQ", () => {
	it("renders one question and answer pair per item", () => {
		render(
			<FAQ
				items={[
					{ q: "Is this safe?", a: "Yes." },
					{ q: "Does it cost anything?", a: "No." },
				]}
			/>,
		);
		expect(screen.getByText("Is this safe?")).toBeDefined();
		expect(screen.getByText("Yes.")).toBeDefined();
		expect(screen.getByText("Does it cost anything?")).toBeDefined();
		expect(screen.getByText("No.")).toBeDefined();
	});
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/content/__tests__/FAQ.test.tsx`
Expected: FAIL — `../FAQ` doesn't exist.

- [ ] **Step 7: Write the minimal implementation**

Create `src/components/content/FAQ.tsx`:

```tsx
export interface FAQItem {
	q: string;
	a: string;
}

export function FAQ({ items }: { items: FAQItem[] }) {
	return (
		<dl className="flex flex-col gap-4">
			{items.map((item) => (
				<div key={item.q} className="flex flex-col gap-1">
					<dt className="text-[16px]">{item.q}</dt>
					<dd className="text-[14px]" style={{ color: "var(--text-muted)" }}>
						{item.a}
					</dd>
				</div>
			))}
		</dl>
	);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/content/__tests__/FAQ.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 9: Write the failing test for ComparisonTable**

Create `src/components/content/__tests__/ComparisonTable.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonTable } from "../ComparisonTable";

describe("ComparisonTable", () => {
	it("renders a header cell per column and a row per entry", () => {
		render(
			<ComparisonTable
				columns={["MLW", "Simple rename"]}
				rows={[{ label: "Encryption", values: ["AES-GCM, shared key", "None"] }]}
			/>,
		);
		expect(screen.getByText("MLW")).toBeDefined();
		expect(screen.getByText("Simple rename")).toBeDefined();
		expect(screen.getByText("Encryption")).toBeDefined();
		expect(screen.getByText("AES-GCM, shared key")).toBeDefined();
		expect(screen.getByText("None")).toBeDefined();
	});
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run src/components/content/__tests__/ComparisonTable.test.tsx`
Expected: FAIL — `../ComparisonTable` doesn't exist.

- [ ] **Step 11: Write the minimal implementation**

Create `src/components/content/ComparisonTable.tsx`:

```tsx
export interface ComparisonRow {
	label: string;
	values: string[];
}

export function ComparisonTable({
	columns,
	rows,
}: {
	columns: string[];
	rows: ComparisonRow[];
}) {
	return (
		<table className="w-full border-collapse text-[14px]">
			<thead>
				<tr>
					<th className="border-b p-2 text-left" style={{ borderColor: "var(--hairline)" }} />
					{columns.map((column) => (
						<th
							key={column}
							className="border-b p-2 text-left"
							style={{ borderColor: "var(--hairline)" }}
						>
							{column}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.label}>
						<th
							className="border-b p-2 text-left font-normal"
							style={{ borderColor: "var(--hairline)" }}
						>
							{row.label}
						</th>
						{row.values.map((value, i) => (
							<td
								// biome-ignore lint/suspicious/noArrayIndexKey: values are positionally paired with columns, not independently identifiable
								key={`${row.label}-${i}`}
								className="border-b p-2"
								style={{ borderColor: "var(--hairline)" }}
							>
								{value}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run src/components/content/__tests__/ComparisonTable.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 13: Commit**

```bash
git add src/components/content/Callout.tsx src/components/content/FAQ.tsx src/components/content/ComparisonTable.tsx src/components/content/__tests__/Callout.test.tsx src/components/content/__tests__/FAQ.test.tsx src/components/content/__tests__/ComparisonTable.test.tsx
git commit -m "feat: add Callout, FAQ and ComparisonTable content primitives"
```

---

### Task 5: ToolCTA component

**Files:**
- Create: `src/components/content/ToolCTA.tsx`
- Create: `src/components/content/__tests__/ToolCTA.test.tsx`

**Interfaces:**
- Consumes: `getTool(id: string)` from `@/core/registry`.
- Produces: `ToolCTA({ toolId: string })` — renders a link card using the real tool's `seo.h1`/`seo.intent`; throws if `toolId` doesn't resolve.

- [ ] **Step 1: Write the failing test**

Create `src/components/content/__tests__/ToolCTA.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCTA } from "../ToolCTA";

describe("ToolCTA", () => {
	it("renders the real tool's title and links to its page", () => {
		render(<ToolCTA toolId="video/mlw-to-mp4" />);
		expect(screen.getByText("Extract MP4 video from an MLW file")).toBeDefined();
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe("/video/mlw-to-mp4");
	});

	it("throws a clear error for an unregistered tool id", () => {
		expect(() => render(<ToolCTA toolId="not/a-real-tool" />)).toThrow(
			/not\/a-real-tool/,
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/content/__tests__/ToolCTA.test.tsx`
Expected: FAIL — `../ToolCTA` doesn't exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/content/ToolCTA.tsx`:

```tsx
import Link from "next/link";
import { getTool } from "@/core/registry";

export function ToolCTA({ toolId }: { toolId: string }) {
	const tool = getTool(toolId);
	if (!tool) {
		throw new Error(`ToolCTA: no tool registered with id "${toolId}"`);
	}
	return (
		<Link
			href={`/${tool.id}`}
			className="block rounded-[var(--radius)] border p-4 no-underline"
			style={{ borderColor: "var(--hairline)" }}
		>
			<p
				className="text-[12px] uppercase tracking-[0.08em]"
				style={{ color: "var(--text-muted)" }}
			>
				Try the tool
			</p>
			<p className="text-[16px]">{tool.seo.h1}</p>
			<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
				{tool.seo.intent}
			</p>
		</Link>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/content/__tests__/ToolCTA.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/content/ToolCTA.tsx src/components/content/__tests__/ToolCTA.test.tsx
git commit -m "feat: add ToolCTA content component"
```

---

### Task 6: RelatedReading component

**Files:**
- Create: `src/components/content/RelatedReading.tsx`
- Create: `src/components/content/__tests__/RelatedReading.test.tsx`

**Interfaces:**
- Consumes: `BlogPostMeta` from `@/content/blog/types`.
- Produces: `RelatedReading({ posts: BlogPostMeta[] })` — renders `null` for an empty list, otherwise a "Related reading" section with one link per post.

- [ ] **Step 1: Write the failing test**

Create `src/components/content/__tests__/RelatedReading.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogPostMeta } from "@/content/blog/types";
import { RelatedReading } from "../RelatedReading";

const posts: BlogPostMeta[] = [
	{
		slug: "example-post",
		title: "Example post",
		description: "d",
		publishedAt: "2026-01-01",
		relatedTools: ["video/mlw-to-mp4"],
		tags: [],
		bodyFormat: "mdx",
	},
];

describe("RelatedReading", () => {
	it("renders a link per post", () => {
		render(<RelatedReading posts={posts} />);
		const link = screen.getByRole("link", { name: "Example post" });
		expect(link.getAttribute("href")).toBe("/blog/example-post");
	});

	it("renders nothing for an empty post list", () => {
		const { container } = render(<RelatedReading posts={[]} />);
		expect(container.firstChild).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/content/__tests__/RelatedReading.test.tsx`
Expected: FAIL — `../RelatedReading` doesn't exist.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/content/RelatedReading.tsx`:

```tsx
import Link from "next/link";
import type { BlogPostMeta } from "@/content/blog/types";

export function RelatedReading({ posts }: { posts: BlogPostMeta[] }) {
	if (posts.length === 0) return null;
	return (
		<section className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-8 pb-8">
			<h2 className="text-[18px] tracking-[-0.01em]">Related reading</h2>
			<ul className="flex flex-col gap-2">
				{posts.map((post) => (
					<li key={post.slug}>
						<Link href={`/blog/${post.slug}`} className="underline">
							{post.title}
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/content/__tests__/RelatedReading.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/content/RelatedReading.tsx src/components/content/__tests__/RelatedReading.test.tsx
git commit -m "feat: add RelatedReading content component"
```

---

### Task 7: Wire the MDX component library

**Files:**
- Modify: `src/mdx-components.tsx`

**Interfaces:**
- Consumes: `Callout`, `FAQ`, `ComparisonTable`, `ToolCTA` (Tasks 4-5).
- Produces: every `.mdx` file in the app can use `<Callout>`, `<FAQ>`, `<ComparisonTable>`, `<ToolCTA>` with no per-file import, plus base heading/paragraph/list/link/code styling matching the site's design tokens.

There is no meaningful unit test for a component-registration map — this is verified in Task 9 when the first real MDX post exercises every one of these mappings for real.

- [ ] **Step 1: Replace the components map**

Replace the full contents of `src/mdx-components.tsx`:

```tsx
import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/content/Callout";
import { ComparisonTable } from "@/components/content/ComparisonTable";
import { FAQ } from "@/components/content/FAQ";
import { ToolCTA } from "@/components/content/ToolCTA";

const components: MDXComponents = {
	Callout,
	FAQ,
	ComparisonTable,
	ToolCTA,
	h2: (props) => <h2 className="text-[22px] tracking-[-0.01em]" {...props} />,
	h3: (props) => <h3 className="text-[18px] tracking-[-0.01em]" {...props} />,
	p: (props) => <p className="text-[15px] leading-relaxed" {...props} />,
	ul: (props) => (
		<ul
			className="flex flex-col gap-1 pl-5 text-[15px]"
			style={{ listStyleType: "disc" }}
			{...props}
		/>
	),
	ol: (props) => (
		<ol
			className="flex flex-col gap-1 pl-5 text-[15px]"
			style={{ listStyleType: "decimal" }}
			{...props}
		/>
	),
	a: (props) => <a className="underline" {...props} />,
	code: (props) => (
		<code
			className="rounded-[var(--radius)] px-1 py-0.5 font-[family-name:--font-mono] text-[13px]"
			style={{ background: "var(--surface-raised)" }}
			{...props}
		/>
	),
};

export function useMDXComponents(): MDXComponents {
	return components;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/mdx-components.tsx
git commit -m "feat: wire the content component library into MDX"
```

---

### Task 8: Blog routes, tool-page integration, and the blog conformance test

**Files:**
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`
- Create: `src/content/blog/__tests__/conformance.test.ts`
- Modify: `src/app/[category]/[slug]/page.tsx`

**Interfaces:**
- Consumes: `BLOG_POSTS`, `getPost`, `getPostsByTool` (Task 2); `buildBlogPostingJsonLd` (Task 3); `RelatedReading` (Task 6).
- Produces: `/blog` and `/blog/[slug]` routes; a "Related reading" block on every tool page.

There is no unit test for `page.tsx` files anywhere in this codebase — `src/app/[category]/[slug]/page.tsx` has none either. These are verified by the e2e suite (Task 14). This task's one real test is the blog conformance suite, which is deliberately written **before any post exists**, mirroring `core/registry/__tests__/conformance.test.ts`'s own "contains at least one tool" check.

- [ ] **Step 1: Write the blog conformance test**

Create `src/content/blog/__tests__/conformance.test.ts`:

```ts
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTool } from "@/core/registry";
import { BLOG_POSTS } from "../registry";

describe("blog registry conformance", () => {
	it("contains at least one post", () => {
		expect(BLOG_POSTS.length).toBeGreaterThan(0);
	});

	it("has no duplicate slugs", () => {
		const slugs = BLOG_POSTS.map((post) => post.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("resolves every related tool id via core/registry", () => {
		for (const post of BLOG_POSTS) {
			for (const toolId of post.relatedTools) {
				expect(getTool(toolId), `${post.slug} -> ${toolId}`).toBeDefined();
			}
		}
	});

	it("points every post at a content file that actually exists", () => {
		for (const post of BLOG_POSTS) {
			const path = `src/content/blog/${post.slug}/content.${post.bodyFormat}`;
			expect(existsSync(path), path).toBe(true);
		}
	});
});
```

- [ ] **Step 2: Run it and confirm the expected red state**

Run: `npx vitest run src/content/blog/__tests__/conformance.test.ts`
Expected: FAIL on "contains at least one post" (`BLOG_POSTS` is still `[]`). The other three checks pass vacuously on an empty array — that's fine. **This test is expected to stay red through Task 8. It turns green in Task 9**, when the first post is added to `BLOG_POSTS`. Do not treat this red state as a bug to fix in this task.

- [ ] **Step 3: Create the blog index route**

Create `src/app/blog/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/content/blog/registry";

const SITE = "https://convrtr.mreshank.com";

export function generateMetadata(): Metadata {
	const title = "Blog — convrtr";
	const description =
		"Deep dives on the file formats and special converters convrtr supports.";
	return {
		title,
		description,
		alternates: { canonical: `${SITE}/blog` },
		openGraph: { title, description, url: `${SITE}/blog` },
	};
}

export default function BlogIndexPage() {
	const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

	return (
		<main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-[28px] tracking-[-0.02em]">Blog</h1>
				<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
					Deep dives on the file formats and special converters convrtr supports.
				</p>
			</div>
			<ul className="flex flex-col gap-6">
				{posts.map((post) => (
					<li key={post.slug} className="flex flex-col gap-1">
						<Link href={`/blog/${post.slug}`} className="text-[18px] underline">
							{post.title}
						</Link>
						<p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
							{post.description}
						</p>
					</li>
				))}
			</ul>
		</main>
	);
}
```

- [ ] **Step 4: Create the blog post route**

Create `src/app/blog/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPost } from "@/content/blog/registry";
import { buildBlogPostingJsonLd } from "@/lib/jsonld";

const SITE = "https://convrtr.mreshank.com";

export function generateStaticParams() {
	return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const post = getPost(slug);
	if (!post) return {};
	return {
		title: post.title,
		description: post.description,
		alternates: { canonical: `${SITE}/blog/${post.slug}` },
		openGraph: {
			title: post.title,
			description: post.description,
			url: `${SITE}/blog/${post.slug}`,
		},
	};
}

export default async function BlogPostPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const post = getPost(slug);
	if (!post) notFound();

	const { default: Content } =
		post.bodyFormat === "mdx"
			? await import(`@/content/blog/${slug}/content.mdx`)
			: await import(`@/content/blog/${slug}/content.tsx`);

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(
						buildBlogPostingJsonLd(post, `${SITE}/blog/${post.slug}`),
					),
				}}
			/>
			<main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
				<div className="flex flex-col gap-2">
					<h1 className="text-[28px] tracking-[-0.02em]">{post.title}</h1>
					<p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
						{post.publishedAt}
					</p>
				</div>
				<div className="flex flex-col gap-4">
					<Content />
				</div>
			</main>
		</>
	);
}
```

- [ ] **Step 5: Add the "Related reading" block to the tool page**

In `src/app/[category]/[slug]/page.tsx`, add two imports:

```tsx
import { RelatedReading } from "@/components/content/RelatedReading";
import { getPostsByTool } from "@/content/blog/registry";
```

Then change the default export's body from:

```tsx
	const { category, slug } = await params;
	const tool = getTool(`${category}/${slug}`);
	if (!tool) notFound();

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(buildToolJsonLd(tool, `${SITE}/${tool.id}`)),
				}}
			/>
			<ToolClient toolId={tool.id} />
		</>
	);
```

to:

```tsx
	const { category, slug } = await params;
	const tool = getTool(`${category}/${slug}`);
	if (!tool) notFound();

	const relatedPosts = getPostsByTool(tool.id);

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw script injection
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(buildToolJsonLd(tool, `${SITE}/${tool.id}`)),
				}}
			/>
			<ToolClient toolId={tool.id} />
			<RelatedReading posts={relatedPosts} />
		</>
	);
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck`
Expected: passes with no errors — the blog routes compile even with `BLOG_POSTS` empty (an empty `generateStaticParams()` list is valid).

Run: `npx vitest run`
Expected: all tests pass **except** `blog registry conformance > contains at least one post`, which is the intentional red state from Step 2.

Run: `npx biome check --write src/app/blog/page.tsx "src/app/blog/[slug]/page.tsx" "src/app/[category]/[slug]/page.tsx"`
Expected: fixes import ordering if needed; no other changes.

- [ ] **Step 7: Commit**

```bash
git add src/app/blog/page.tsx src/app/blog/\[slug\]/page.tsx src/content/blog/__tests__/conformance.test.ts src/app/\[category\]/\[slug\]/page.tsx
git commit -m "feat: add blog routes and tool-page related-reading block"
```

---

### Task 9: Post 1 — How MLW Video Encryption Actually Works

**Files:**
- Create: `src/content/blog/how-mlw-encryption-works/meta.ts`
- Create: `src/content/blog/how-mlw-encryption-works/content.mdx`
- Modify: `src/content/blog/registry.ts`

**Interfaces:**
- Consumes: `BlogPostMeta` (Task 2); `Callout`, `ToolCTA` (Tasks 4-5, available in every `.mdx` file with no import).

- [ ] **Step 1: Create the post metadata**

Create `src/content/blog/how-mlw-encryption-works/meta.ts`:

```ts
import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "how-mlw-encryption-works",
	title: "How MLW Video Encryption Actually Works",
	description:
		"A byte-level walkthrough of the MLW container format: the Root marker, the filename block, the AES-GCM payload, and the one part of the layout nobody has documented.",
	publishedAt: "2026-08-27",
	relatedTools: ["video/mlw-to-mp4"],
	tags: ["mlw", "video", "reverse-engineering", "aes-gcm"],
	bodyFormat: "mdx",
};
```

- [ ] **Step 2: Create the post body**

Create `src/content/blog/how-mlw-encryption-works/content.mdx`:

```mdx
MLW is the file extension a family of screen-recording and course-authoring
apps use for downloaded lesson videos. Open one in a text editor and it
looks like noise — no `ftyp` box, no recognizable video signature — which is
exactly the impression it's designed to give. It is noise, but only after a
fixed, findable offset. Everything before that offset is a small, completely
readable index the app itself needs to locate your file.

This is a byte-level walkthrough of that layout, written from the actual
parser powering [the MLW to MP4 extractor](/video/mlw-to-mp4), not from a
spec — because there isn't one. Everything below was read directly off real
files.

## The container, byte by byte

An MLW file has four regions, in this order:

1. **The `"Root\0"` marker** — five bytes, literally the ASCII text `Root`
   followed by a NUL byte. It doesn't mark the start of the file; it can
   (and does) appear preceded by other header bytes the app uses for its own
   bookkeeping. The extractor doesn't assume it's at offset 0 — it searches
   for the marker anywhere in the file.
2. **A NUL-terminated filename block** — immediately after the marker,
   readable ASCII: the original filename the app recorded, e.g.
   `lesson-04.mp4`, ending in a single `0x00` byte.
3. **A 12-byte gap**, then the payload. Measuring from the filename's NUL
   terminator, the payload starts exactly 13 bytes later — meaning there are
   12 bytes of *something* between the terminator and the payload that the
   extractor doesn't interpret. This is worth being honest about: nobody
   involved in building this tool knows what those 12 bytes encode. They
   might be a checksum, a version tag, or padding. They're skipped, not
   decoded, because skipping them is sufficient to get to working video and
   claiming to know their meaning would be a guess dressed as a fact.
4. **The payload**: a 12-byte AES-GCM initialization vector (IV), followed by
   4 more bytes of similarly unidentified data, followed by the ciphertext
   with a 16-byte authentication tag appended to its end.

<Callout kind="note">
  The two unidentified gaps (12 bytes before the IV, 4 bytes after it) are
  the honest parts of this writeup. A tidier-looking explanation that
  assigned them a made-up meaning would be less useful, not more — it would
  tell you something false with total confidence.
</Callout>

## Why AES-GCM, and why it's not really "encryption" in the security sense

AES-GCM is a real, strong authenticated cipher — the same algorithm TLS uses
to protect your bank's website. Used correctly, with a secret key only the
legitimate parties know, it's unbreakable by brute force in any practical
sense.

MLW doesn't use it correctly, in the sense that matters for calling this
"protection." Every copy of the app that produces MLW files carries the same
16-byte AES-128 key, embedded in the client. It isn't derived per user, per
device, or per download — recover it once from any single copy of the app (a
static string sitting in memory or the binary), and it decrypts every MLW
file that app has ever produced or ever will, for every user. GCM's
authentication tag still does its job: if a byte is corrupted or you use the
wrong key, decryption fails loudly instead of producing silent garbage. But
"failing loudly on the wrong key" and "keeping a secret" are different
properties, and MLW only has the first one.

This distinction matters practically, not just semantically — it's the
entire basis for [why extracting your own MLW files doesn't cross into DRM
circumvention](/blog/is-extracting-mlw-video-legal). A technological
protection measure that gates access is different from a container format
that merely obscures it.

## Putting it together

Decryption, once you have the four regions, is three calls to the browser's
native Web Crypto API: import the shared 16-byte key as an AES-GCM key, then
call `crypto.subtle.decrypt` with the IV and the ciphertext-plus-tag. No
WASM, no native binary, no server. `crypto.subtle` ships in every modern
browser and includes hardware-accelerated AES-GCM out of the box, so this
runs in milliseconds even for a full lesson recording. The plaintext that
comes out is not a re-encoded copy — it's the exact MP4 bytes the app
recorded, because MLW never touches the video itself. It only wraps it.

<ToolCTA toolId="video/mlw-to-mp4" />
```

- [ ] **Step 3: Register the post**

In `src/content/blog/registry.ts`, add the import:

```ts
import { meta as howMlwEncryptionWorks } from "./how-mlw-encryption-works/meta";
```

and change:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [];
```

to:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [howMlwEncryptionWorks];
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/content/blog/__tests__/conformance.test.ts`
Expected: PASS — all 4 checks now green, including "contains at least one post."

Run: `pnpm typecheck`
Expected: passes with no errors.

Run: `pnpm dev`, then open `http://localhost:3000/blog/how-mlw-encryption-works` in a browser.
Expected: the page renders the title, the callout with its "Note" label, and the tool CTA card linking to `/video/mlw-to-mp4`. Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/how-mlw-encryption-works src/content/blog/registry.ts
git commit -m "content: publish 'How MLW Video Encryption Actually Works'"
```

---

### Task 10: Post 2 — Recovering Your Course Videos After a Platform Shuts Down or a Subscription Lapses

**Files:**
- Create: `src/content/blog/recovering-course-videos-after-a-platform-shuts-down/meta.ts`
- Create: `src/content/blog/recovering-course-videos-after-a-platform-shuts-down/content.mdx`
- Modify: `src/content/blog/registry.ts`

- [ ] **Step 1: Create the post metadata**

Create `src/content/blog/recovering-course-videos-after-a-platform-shuts-down/meta.ts`:

```ts
import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "recovering-course-videos-after-a-platform-shuts-down",
	title:
		"Recovering Your Course Videos After a Platform Shuts Down or a Subscription Lapses",
	description:
		"You downloaded lessons for offline viewing while you still had access. Here's how to get them playing again after the app, the subscription, or the company is gone.",
	publishedAt: "2026-08-27",
	relatedTools: ["video/mlw-to-mp4"],
	tags: ["mlw", "video", "course-platforms", "data-recovery"],
	bodyFormat: "mdx",
};
```

- [ ] **Step 2: Create the post body**

Create `src/content/blog/recovering-course-videos-after-a-platform-shuts-down/content.mdx`:

```mdx
Course and training apps that support offline viewing usually work the same
way: you tap "Download," the video streams once, and a wrapped copy lands in
the app's private storage. That's convenient right up until one of these
happens:

- The platform shuts down or gets acquired and the app disappears from the
  store.
- Your subscription lapses and the app now refuses to open anything,
  including lessons you already paid for and already downloaded.
- You switch phones, switch from iOS to Android, or move to a laptop, and
  the app either doesn't exist on the new platform or won't recognize your
  old download.

In every one of these cases the video file is still sitting on your device
— you're not missing data, you're missing the one app that knows how to open
it. If that file has a `.mlw` extension, this is recoverable.

## Step 1: find the files

Where they live depends on how you got them off the device in the first
place:

- **Already exported/synced somewhere** (a "Files" app export, a computer
  backup, a cloud drive folder): search that location for `.mlw`.
- **Still on the device, app still installed**: most of these apps store
  downloads in their own sandboxed app-data folder. On Android this is
  usually reachable via a file manager under `Android/data/<package-name>/`;
  on iOS it typically requires the Files app's "On My iPhone" view or a
  computer-side backup browser, since iOS sandboxes app storage more
  tightly. If you can't find them and the app still opens, check its
  settings for a "Downloads" or storage-management screen — it will often
  show you the on-disk location or offer an export option before you lose
  access entirely.
- **App already uninstalled or subscription already dead**: check whatever
  backup you have — a phone backup, an old device you haven't wiped, a
  cloud sync folder. This is the case where planning ahead (see the note
  below) would have saved you the search.

<Callout kind="note">
  If you still have working access right now, export or back up your `.mlw`
  files before you lose that access — a cancelled subscription or a dead app
  can turn "five minutes of searching" into "not recoverable" if the only
  copy was in storage you can no longer reach.
</Callout>

## Step 2: extract

Once you have a `.mlw` file on a computer, open [the MLW to MP4
tool](/video/mlw-to-mp4), drop the file in, and it decrypts to a normal
`.mp4` entirely in your browser — nothing is uploaded, so this works even
for content you'd rather not put on a third-party server. See [how the
container format actually works](/blog/how-mlw-encryption-works) if you want
the mechanism, not just the result.

## Step 3: verify and archive

Play the resulting `.mp4` in any standard video player to confirm it's
intact. If it opens and plays cleanly, move it somewhere durable — a local
folder you back up, not just the device you found it on — since you've now
converted a single point of failure (one app, one account) into a plain file
you fully control.

If extraction fails, see [troubleshooting a failed MLW
extraction](/blog/troubleshooting-a-failed-mlw-extraction) for what each
error message actually means.

## What this doesn't do

This only recovers files you already downloaded while you had legitimate
access. It doesn't grant access to lessons you never opened, and it doesn't
restore an active subscription. If the app required an active subscription
just to *play* an already-downloaded file, extracting it once and keeping
the resulting MP4 is the difference between "permanently lost" and "yours."

<ToolCTA toolId="video/mlw-to-mp4" />
```

- [ ] **Step 3: Register the post**

In `src/content/blog/registry.ts`, add the import (below the existing one, keeping imports sorted):

```ts
import { meta as recoveringCourseVideosAfterAPlatformShutsDown } from "./recovering-course-videos-after-a-platform-shuts-down/meta";
```

and change:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [howMlwEncryptionWorks];
```

to:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
];
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/content/blog/__tests__/conformance.test.ts`
Expected: PASS (all checks, now covering 2 posts).

Run: `pnpm typecheck`
Expected: passes with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/recovering-course-videos-after-a-platform-shuts-down src/content/blog/registry.ts
git commit -m "content: publish 'Recovering Your Course Videos After a Platform Shuts Down or a Subscription Lapses'"
```

---

### Task 11: Post 3 — Is Extracting MLW Video Legal?

**Files:**
- Create: `src/content/blog/is-extracting-mlw-video-legal/meta.ts`
- Create: `src/content/blog/is-extracting-mlw-video-legal/content.mdx`
- Modify: `src/content/blog/registry.ts`

- [ ] **Step 1: Create the post metadata**

Create `src/content/blog/is-extracting-mlw-video-legal/meta.ts`:

```ts
import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "is-extracting-mlw-video-legal",
	title: "Is Extracting MLW Video Legal? Your Own Content, Your Own Rights",
	description:
		"MLW uses a single fixed encryption key shared across every install of the app. What that means for whether unwrapping it counts as DRM circumvention — in plain English, not legal advice.",
	publishedAt: "2026-08-27",
	relatedTools: ["video/mlw-to-mp4"],
	tags: ["mlw", "legal", "drm", "faq"],
	bodyFormat: "mdx",
};
```

- [ ] **Step 2: Create the post body**

Create `src/content/blog/is-extracting-mlw-video-legal/content.mdx`:

```mdx
<Callout kind="warning">
  This is a plain-English explanation of a real distinction in how these
  laws are usually applied, written by the people who built this tool — not
  legal advice, and not a substitute for a lawyer if your situation is
  high-stakes or your jurisdiction is unusual.
</Callout>

The short version: laws like the US DMCA's anti-circumvention provisions
target breaking a **technological protection measure** — something that
actually controls or gates *access* to copyrighted content. MLW's container
doesn't do that, and the difference is concrete, not just semantic.

## What would count as circumvention

Real DRM — Widevine, FairPlay, PlayReady — ties decryption to something the
attacker doesn't have: a per-device or per-session key negotiated with a
license server, hardware-backed key storage, and (for the higher security
tiers) execution inside a hardware-isolated environment the OS itself can't
inspect. Breaking that requires defeating an actual access-control system.
It's illegal to circumvent in most jurisdictions specifically because it
*is* functioning as access control — someone without a valid license
genuinely cannot get the plaintext.

## What MLW actually does

[As covered in the technical writeup](/blog/how-mlw-encryption-works), every
copy of the app that produces MLW files ships with the exact same AES-128
key, hardcoded into the client. There's no license server, no per-device
negotiation, no hardware key store. The app itself has to hold the key
locally just to play the video you already downloaded — which means the
"protection" isn't controlling access at all. It's controlling
*convenience*: it stops you from casually renaming the file and opening it
in VLC, but it does nothing that a person with the file and a
general-purpose computer can't reverse, because the app proves every single
day that decryption requires nothing more than the file plus a key that
ships with every install.

<FAQ items={[
  {
    q: "Am I decrypting something I don't have access to?",
    a: "No — you already have full, paid access to the file. The app on your own device decrypts it every time you press play; this tool does the same math, just outside that app.",
  },
  {
    q: "Does the shared key make this 'hacking'?",
    a: "It makes it byte-level file-format work, the same category as any tool that reads a proprietary document format. There's no server involved, no account being accessed, and no protection being defeated that wasn't already defeated by the app's own player every time it opens a file.",
  },
  {
    q: "Would this tool work on real DRM, like a streaming service's video?",
    a: "No, and it isn't built to. Real DRM systems don't have a single static key sitting in the client — there's no equivalent shortcut, and this tool doesn't attempt one.",
  },
  {
    q: "What about the app's terms of service?",
    a: "A terms-of-service violation and a DMCA circumvention claim are different things — a ToS violation is a contract matter between you and the provider, not a question of whether extracting a file you already have is a protection-measure bypass. Read your provider's terms if that distinction matters for your situation.",
  },
]} />

## The practical test

If an app's own player can decrypt a file locally, on your device, offline,
using only what shipped in the app install — no network call to a license
server, no hardware key that never leaves a secure chip — then a tool doing
the same decryption isn't defeating access control. It's doing the same
local computation the app was always doing, just without the app.

<ToolCTA toolId="video/mlw-to-mp4" />
```

- [ ] **Step 3: Register the post**

In `src/content/blog/registry.ts`, add the import:

```ts
import { meta as isExtractingMlwVideoLegal } from "./is-extracting-mlw-video-legal/meta";
```

and change:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
];
```

to:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
	isExtractingMlwVideoLegal,
];
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/content/blog/__tests__/conformance.test.ts`
Expected: PASS (all checks, now covering 3 posts).

Run: `pnpm typecheck`
Expected: passes with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/is-extracting-mlw-video-legal src/content/blog/registry.ts
git commit -m "content: publish 'Is Extracting MLW Video Legal?'"
```

---

### Task 12: Post 4 — MLW vs. Other Course-Platform Video Wrappers

**Files:**
- Create: `src/content/blog/mlw-vs-other-course-platform-video-wrappers/meta.ts`
- Create: `src/content/blog/mlw-vs-other-course-platform-video-wrappers/content.mdx`
- Modify: `src/content/blog/registry.ts`

- [ ] **Step 1: Create the post metadata**

Create `src/content/blog/mlw-vs-other-course-platform-video-wrappers/meta.ts`:

```ts
import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "mlw-vs-other-course-platform-video-wrappers",
	title: "MLW vs. Other Course-Platform Video Wrappers: A Field Guide",
	description:
		"Course and training apps wrap downloaded video in a handful of recognizable ways, from a plain extension swap to real DRM. Here's how to tell which tier you're dealing with.",
	publishedAt: "2026-08-27",
	relatedTools: ["video/mlw-to-mp4"],
	tags: ["mlw", "video", "drm", "comparison"],
	bodyFormat: "mdx",
};
```

- [ ] **Step 2: Create the post body**

Create `src/content/blog/mlw-vs-other-course-platform-video-wrappers/content.mdx`:

```mdx
MLW isn't a one-off — it's one instance of a pattern that shows up across a
lot of course, training, and screen-recording apps that offer offline
downloads. Once you've seen one, the others are recognizable. Here's the
spectrum, roughly ordered from weakest to strongest.

<ComparisonTable
  columns={["What it does", "How to spot it", "What it takes to open"]}
  rows={[
    {
      label: "1. Renamed file",
      values: [
        "A normal video file with its extension swapped to something proprietary",
        "The bytes at the start of the file match a known container signature (e.g. ftyp for MP4) once you look past the extension",
        "Rename the extension back — no decryption of any kind",
      ],
    },
    {
      label: "2. Shared static key",
      values: [
        "The whole file (or the video stream inside a small wrapper) is encrypted with one key baked into every install of the app — MLW's tier",
        "The file is unreadable as any known format, but every copy of the app carries an identical key you can recover once and reuse for every file",
        "Find the container's marker/offset layout, then one decrypt call with the shared key",
      ],
    },
    {
      label: "3. Per-device derived key",
      values: [
        "The key is derived from something device-specific — a hardware ID, an account token, a locally-generated secret stored in the app's private storage",
        "Files from two different devices/accounts don't decrypt with the same key, even from the same app version",
        "Requires extracting the device- or account-specific secret from the device that downloaded the file, not just the app binary",
      ],
    },
    {
      label: "4. Real DRM",
      values: [
        "Widevine, FairPlay, or PlayReady — a hardware-backed license system with per-session keys negotiated against a license server",
        "The app requires an active network check or a hardware-secured decryption path (often visible as a 'protected content' warning if you try to screen-record it)",
        "Not addressed by tools like this one — see the legal writeup for why that's a meaningful line, not just a difficulty cliff",
      ],
    },
  ]}
/>

## Where this matters in practice

Tier 1 and Tier 2 are both, functionally, obscurity rather than access
control — the difference between them is just how many steps it takes to
reverse, not whether reversing it means defeating something that was
actually gating access. [The legal
distinction](/blog/is-extracting-mlw-video-legal) tracks this: a wrapper
whose own app can decrypt entirely offline, using only what shipped in the
install, was never really controlling access in the first place.

Tier 3 is a real step up — it means the app is doing something with
per-installation state, which is a meaningfully different (and harder)
reverse-engineering problem than "find the marker, decrypt with the shared
key." Tier 4 is a different category of problem entirely, and out of scope
for a tool built around finding a byte offset and calling `crypto.subtle`.

## Where MLW sits, concretely

MLW is squarely Tier 2: [one shared AES-128 key, no per-device
component](/blog/how-mlw-encryption-works), extractable with nothing but the
file and a browser. If you've got a wrapper from a different app that
behaves the same way — opens instantly offline, no login check, and every
copy of the app can decrypt every file — it's very likely the same tier,
even if the byte layout is different.

<ToolCTA toolId="video/mlw-to-mp4" />
```

- [ ] **Step 3: Register the post**

In `src/content/blog/registry.ts`, add the import:

```ts
import { meta as mlwVsOtherCoursePlatformVideoWrappers } from "./mlw-vs-other-course-platform-video-wrappers/meta";
```

and change:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
	isExtractingMlwVideoLegal,
];
```

to:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
	isExtractingMlwVideoLegal,
	mlwVsOtherCoursePlatformVideoWrappers,
];
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/content/blog/__tests__/conformance.test.ts`
Expected: PASS (all checks, now covering 4 posts).

Run: `pnpm typecheck`
Expected: passes with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/mlw-vs-other-course-platform-video-wrappers src/content/blog/registry.ts
git commit -m "content: publish 'MLW vs. Other Course-Platform Video Wrappers: A Field Guide'"
```

---

### Task 13: Post 5 — Troubleshooting a Failed MLW Extraction

**Files:**
- Create: `src/content/blog/troubleshooting-a-failed-mlw-extraction/meta.ts`
- Create: `src/content/blog/troubleshooting-a-failed-mlw-extraction/content.mdx`
- Modify: `src/content/blog/registry.ts`

- [ ] **Step 1: Create the post metadata**

Create `src/content/blog/troubleshooting-a-failed-mlw-extraction/meta.ts`:

```ts
import type { BlogPostMeta } from "../types";

export const meta: BlogPostMeta = {
	slug: "troubleshooting-a-failed-mlw-extraction",
	title: "Troubleshooting a Failed MLW Extraction",
	description:
		"What each MLW extraction error message actually means, and what to check for each one — mapped directly from the tool's own error output.",
	publishedAt: "2026-08-27",
	relatedTools: ["video/mlw-to-mp4"],
	tags: ["mlw", "troubleshooting", "video"],
	bodyFormat: "mdx",
};
```

- [ ] **Step 2: Create the post body**

Create `src/content/blog/troubleshooting-a-failed-mlw-extraction/content.mdx`:

```mdx
The [MLW to MP4 extractor](/video/mlw-to-mp4) fails loudly rather than
producing a corrupted or silently wrong video — every failure mode maps to a
specific, readable error message. Here's what each one actually means.

## "Root marker not found — not a valid MLW file"

The tool searched the entire file for the `"Root\0"` byte sequence that
marks the start of the filename block and never found it. This almost
always means one of:

- The file isn't actually an MLW file — check that the extension wasn't
  changed by hand or by an export tool that renamed it without converting
  it.
- The download is corrupted or incomplete — re-download it from the source
  app if you still have access, or restore from a different backup.
- The file got mangled by an intermediate step — some cloud-sync or email
  transfer tools alter binary files (e.g. line-ending conversion meant for
  text). Re-transfer it as a raw binary if you moved it that way.

## "filename block has no NUL terminator"

The `"Root\0"` marker was found, but the tool never found the `0x00` byte
that's supposed to end the filename immediately after it. This means the
file is truncated or corrupted starting very early — right after the
marker. Treat it the same as a corrupted download: get a fresh copy if you
can.

## "file truncated before the IV" / "file truncated — no ciphertext after the IV"

Both of these mean the file is shorter than it should be — it has a valid
`"Root\0"` marker and filename block, but ends before the encrypted payload
is complete. This is almost always an incomplete download or a copy that
got cut off partway through a transfer. Compare the file size to the
original if you have any way to check, and re-download or re-copy it.

## Decryption fails with no readable video (AES-GCM authentication failure)

If the file parses correctly (marker found, filename found, IV and
ciphertext both present) but decryption itself fails, AES-GCM's built-in
integrity check has caught one of:

- **A corrupted byte somewhere in the ciphertext** — even a single flipped
  bit anywhere in the encrypted payload makes the whole thing fail
  authentication. Re-transfer the file exactly as originally downloaded,
  not through anything that might alter bytes.
- **A different app version with a different key** — [the key is fixed per
  app build, not universal across every version that has ever
  shipped](/blog/how-mlw-encryption-works). If the file came from a very old
  or very new version of the source app, it's possible the key has changed.
- **The file was never actually MLW** despite the extension — a coincidental
  `"Root\0"` sequence appearing in an unrelated file is unlikely but not
  impossible for a large enough file.

## None of this fixed it

This is a static, browser-only tool — there's no support queue behind it,
and it works only for the specific container layout and key it was built
against. If your file consistently fails the same check with a fresh,
unmodified copy, it most likely came from an app version this tool hasn't
been verified against.

<ToolCTA toolId="video/mlw-to-mp4" />
```

- [ ] **Step 3: Register the post**

In `src/content/blog/registry.ts`, add the import:

```ts
import { meta as troubleshootingAFailedMlwExtraction } from "./troubleshooting-a-failed-mlw-extraction/meta";
```

and change:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
	isExtractingMlwVideoLegal,
	mlwVsOtherCoursePlatformVideoWrappers,
];
```

to:

```ts
export const BLOG_POSTS: BlogPostMeta[] = [
	howMlwEncryptionWorks,
	recoveringCourseVideosAfterAPlatformShutsDown,
	isExtractingMlwVideoLegal,
	mlwVsOtherCoursePlatformVideoWrappers,
	troubleshootingAFailedMlwExtraction,
];
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/content/blog/__tests__/conformance.test.ts`
Expected: PASS (all checks, now covering all 5 posts).

Run: `pnpm typecheck`
Expected: passes with no errors.

Run: `npx biome check --write .`
Expected: import ordering in `src/content/blog/registry.ts` may be auto-fixed to alphabetical order — this is expected and fine (matches the project's existing convention of letting biome own import order, as seen throughout `core/registry/index.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/troubleshooting-a-failed-mlw-extraction src/content/blog/registry.ts
git commit -m "content: publish 'Troubleshooting a Failed MLW Extraction'"
```

---

### Task 14: E2E coverage for the blog and tool↔blog linking

**Files:**
- Create: `e2e/blog.spec.ts`

**Interfaces:**
- Consumes: `watchForSuspiciousRequests` from `e2e/network-guard.ts` (existing).

- [ ] **Step 1: Write the e2e spec**

Create `e2e/blog.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { watchForSuspiciousRequests } from "./network-guard";

test("blog index lists posts and each post links back to its tool", async ({
	page,
	baseURL,
}) => {
	const appOrigin = baseURL ? new URL(baseURL).origin : "";
	const suspicious = watchForSuspiciousRequests(page, () => appOrigin);

	await page.goto("/blog");
	await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "How MLW Video Encryption Actually Works" }),
	).toBeVisible();

	await page
		.getByRole("link", { name: "How MLW Video Encryption Actually Works" })
		.click();
	await expect(page).toHaveURL(/\/blog\/how-mlw-encryption-works$/);
	await expect(
		page.getByRole("heading", { name: "How MLW Video Encryption Actually Works" }),
	).toBeVisible();

	await page.getByRole("link", { name: "Extract MP4 video from an MLW file" }).click();
	await expect(page).toHaveURL(/\/video\/mlw-to-mp4$/);

	expect(suspicious, "no request may carry user file bytes").toEqual([]);
});

test("the MLW tool page surfaces its related reading", async ({ page }) => {
	await page.goto("/video/mlw-to-mp4");
	await expect(page.getByRole("heading", { name: "Related reading" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "How MLW Video Encryption Actually Works" }),
	).toBeVisible();
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/blog.spec.ts`
Expected: both tests pass. This triggers a full `pnpm build` via `playwright.config.ts`'s `webServer` — allow a few minutes.

- [ ] **Step 3: Commit**

```bash
git add e2e/blog.spec.ts
git commit -m "test: add e2e coverage for the blog and tool-blog linking"
```

---

### Task 15: Final verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Run the full CI sequence**

Run: `pnpm ci`

This runs, in order: `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm playwright test` — the exact sequence this repo's own `ci` script defines.

Expected: every stage passes — typecheck clean, biome clean, all vitest suites green (including the blog conformance suite with all 5 posts), production build succeeds (20+ pages now including `/blog` and the 5 post pages), and the full Playwright suite passes (existing tool specs plus the new `e2e/blog.spec.ts`).

- [ ] **Step 2: Confirm no regressions in existing tool pages**

Run: `npx playwright test e2e/png-to-webp.spec.ts e2e/mlw-to-mp4.spec.ts`
Expected: both still pass unchanged — the "Related reading" addition to `[category]/[slug]/page.tsx` must not break any existing tool page (a tool with zero related posts renders nothing extra, per `RelatedReading`'s empty-array behavior from Task 6).

If any stage fails, fix the root cause before considering this plan complete — do not skip stages or weaken assertions to make the sweep pass.
