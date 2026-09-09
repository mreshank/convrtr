# Routes and Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every route the site still lacks — groups, collectives, samples and live demos, marketing, legal, sitemap — and close the composition rule the previous plan left open.

**Architecture:** Groups derive entirely from the tool registry, so they cost no hand-authoring and cannot drift. Collectives are curated content following the blog registry's module-boundary discipline: metadata in one file, bodies loaded per-slug. Live demos run real conversions through the same `runJob` pipeline the instrument uses, on sample files that are generated rather than obtained. Two templates the previous plan deferred are built here, against their first real consumers.

**Tech Stack:** Next.js 16.3 (App Router, `output: "export"`), React 19.2, Tailwind CSS v4, TypeScript 5 (`strict`, `noUncheckedIndexedAccess`), Vitest 4 + happy-dom + Testing Library, Biome 2.5, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-04-convrtr-editorial-overhaul-design.md`](../specs/2026-09-04-convrtr-editorial-overhaul-design.md) §5.1 (route map), §5.2 (why groups live under `/groups/*`), §7 (data layer), §8 (showcases and live demos) — all of which stand. Visual vocabulary governed by [`2026-09-07-void-terminal-glass-design.md`](../specs/2026-09-07-void-terminal-glass-design.md).

**Plan 4 of 4** — the last. After this the route map is complete.

**Working directly on `main`** at the user's standing instruction — no worktree.

## What the previous plan left open, and why it lands here

Its route-purity guard asserts a route imports **from** `@/design/templates` — not that it imports **only** from there. `src/app/page.tsx` imports nine families directly and composes them into JSX inside the route. Five of six routes are clean; the home route is the sole exception, and it is the one the rule most exists for. Spec §6.3's words are *"it resolves data from a registry and hands it to a template ... never inline JSX in a route."*

It lands here rather than being patched there because **every route in this plan faces the same question**, and answering it once, with six new routes as evidence, is better than answering it under a rate limit with one. Task 1 settles it before anything else is built.

## Global Constraints

- **A `page.tsx` may not contain layout.** It resolves data and hands it to a template. Enforced by `src/app/__tests__/route-purity.test.ts`: default-exported component body ≤ **50 lines**, whole file ≤ **150**, and — as of Task 1 — **no import from `@/design/families` or `@/design/primitives`**.
- **The palette is closed:** `#000000`, `#111315`, `#E4F1EB`, `#FFFFFF`, `#94979E`, `#131415`, `#303236`, `#18191B`, `#34D59A`, `#47D18C`. No literal hex elsewhere in `src` except `LITERAL_HEX_ALLOWED` paths.
- **Mint is rationed** — CTA fills, icon glyphs, code tokens, the lossless fidelity tint. Never a large fill, never a section background. **A CTA is a mint pill fill; the lossless ring is a mint stroke tint.**
- **Radius is a closed set:** `0` structural, `4px` nav-utility controls only, `9999px` pills and status dots, `40px`/`100px` marquee cards only.
- **Spacing comes from the scale.** Sweeps admit literal px only from `{0, 1, 14, 23, 36, 44}`, and police template literals and Tailwind arbitrary values.
- **Display and headline are weight 400.**
- **`data-testid` values are frozen.** The Playwright suite drives them.
- **Zero third-party requests.** `e2e/network-guard.ts` enforces it, and self-tests with a cross-origin beacon.
- **Every user-facing claim must name the file that makes it true.** This project has shipped false claims twice from re-angled copy. Rewording re-opens verification.
- **Nothing fabricated** — no invented logo, customer, certification, metric, testimonial or sample file presented as real.
- **The reduced-motion block in `src/app/globals.css` must not be touched.**
- **Formatting:** Biome — tabs, double quotes.

## The sample-media constraint, stated plainly

Spec §8.1 defines a live demo as *"a real conversion. Not a recording, not a pre-baked result, not an animation of one."* That needs real files in `public/samples/`, and there are none.

A real PNG, WAV and MP4 can be **generated** — deterministically, from code, committed as fixtures. A real HEIC, AVIF or FLAC cannot be produced without either inventing a binary or fetching one, and fetching would breach the zero-third-party-request guarantee this product rests on.

**So: demos exist for the formats we can honestly generate, and every other tool gets a static specimen** — which §8.2 already mandates for the one tool declaring `heavyDownloadMb`. A specimen is labelled as a specimen; it never implies a conversion ran. This was put to the user, who was told this is the route being taken.

---

## File Structure

**Created — content and data**

| File | Responsibility |
|---|---|
| `src/core/registry/groups.ts` | `deriveFormatGroups()`, `deriveTaskGroups()` — from `TOOLS`, no registry. |
| `src/content/collectives/registry.ts` | Metadata-only index, mirroring `src/content/blog/registry.ts`. |
| `src/content/collectives/types.ts` | `CollectiveMeta`. |
| `src/content/samples/registry.ts` | Manifest over `public/samples/`, per spec §7.1. |
| `scripts/generate-samples.mjs` | Generates the sample files deterministically. |

**Created — components and templates**

| File | Responsibility |
|---|---|
| `src/design/templates/HomePage.tsx` | The home page's band sequence, taking data not JSX. |
| `src/design/templates/ShowcasePage.tsx` | `HubPage` plus a showcase band and a demo slot. |
| `src/design/templates/LegalPage.tsx` | `ArticlePage` at a narrower measure with a mono revision line. |
| `src/components/instrument/LiveDemo.tsx` | Runs a real conversion on activation. Client component. |

**Created — routes**

`/groups` · `/groups/format/[format]` · `/groups/task/[kind]` · `/collectives` · `/collectives/[slug]` · `/about` · `/how-it-works` · `/privacy` · `/legal/terms` · `/legal/privacy-policy` · `/legal/licences` · `sitemap.ts` · `robots.ts`

**Modified**

`src/app/page.tsx` · `src/app/__tests__/route-purity.test.ts` · `src/design/templates/index.ts` · `src/design/chrome/SiteHeader.tsx` (nav gains the new destinations) · `src/design/chrome/SiteFooter.tsx` (link columns)

---

## Task 1: Settle the composition rule

**Files:**
- Create: `src/design/templates/HomePage.tsx`
- Modify: `src/design/templates/index.ts`, `src/app/page.tsx`, `src/app/__tests__/route-purity.test.ts`
- Test: `src/design/__tests__/HomePage.test.tsx`

**Interfaces:**
- Produces: `HomePage({ content })` where `content` is the shape `src/app/home-content.ts` already exports.

The guard permits what it was written to forbid. Close it, and move the home composition behind a template so the tightened rule is satisfiable.

**Why a `HomePage` template rather than an exemption.** `EditorialPage` is a shell — hero plus bands, knowing nothing about which. The home page's specific band sequence is its shape, and a shape belongs in a template. `/` is `EditorialPage`'s only consumer today, so `HomePage` composing families and delegating the shell to `EditorialPage` is the honest factoring: one template that knows the sequence, one that knows the rhythm.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HOME } from "@/app/home-content";
import { HomePage } from "@/design/templates/HomePage";

describe("HomePage", () => {
	it("renders every band the home page declares", () => {
		const { container } = render(<HomePage content={HOME} />);
		// The hero, plus one wrapper per band, inside EditorialPage's shell.
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell).not.toBeNull();
		expect(shell.children.length).toBeGreaterThanOrEqual(7);
	});

	it("delegates the shell to EditorialPage rather than reimplementing it", () => {
		// Two templates, two jobs: EditorialPage knows the rhythm, HomePage
		// knows the sequence. A HomePage that laid out its own bands would
		// duplicate the one thing EditorialPage exists for.
		const { container } = render(<HomePage content={HOME} />);
		const shell = container.querySelector("[data-editorial]") as HTMLElement;
		expect(shell.style.getPropertyValue("gap")).toBe("var(--section-pad)");
	});

	it("puts the page's one h1 in the hero", () => {
		const { container } = render(<HomePage content={HOME} />);
		expect(container.querySelectorAll("h1").length).toBe(1);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/HomePage.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the template**

Create `src/design/templates/HomePage.tsx`. Move the band composition out of `src/app/page.tsx` verbatim — the same families, the same order, the same keys — and take `content` as a prop rather than importing `HOME` directly, so the template stays testable with a fixture.

Write into its doc comment why two templates rather than one: `EditorialPage` owns the rhythm and knows nothing about which bands exist; `HomePage` owns the sequence and delegates the shell. Splitting them is what lets the route import neither families nor primitives.

- [ ] **Step 4: Reduce the route**

`src/app/page.tsx` becomes metadata, the `HOME` import, and one `HomePage` call. It must import **nothing** from `@/design/families` or `@/design/primitives`.

- [ ] **Step 5: Tighten the guard**

In `src/app/__tests__/route-purity.test.ts`, add an assertion that no `page.tsx` imports from `@/design/families` or `@/design/primitives`. Write the reasoning in: the rule is that routes resolve data and hand it to a template, and a route reaching for a family is composing — which is the thing §6.3 forbids, and which the previous guard permitted for the one route that most needed catching.

**Prove it bites**, reporting each and reverting:
1. Add `import { Hairline } from "@/design/primitives";` to any route → must **FAIL**, naming the file.
2. Add a families import to any route → must **FAIL**.
3. Confirm all six existing routes plus the new one pass as they stand.

- [ ] **Step 6: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm exec playwright test`
Expected: PASS, Playwright 42.

- [ ] **Step 7: Verify the page is unchanged**

Rebuild first — Playwright serves `out/`, not source. Then confirm the home page renders **identically** to before: same band count, same order, one `<h1>`, one `<main>`, band gaps 240/240/96/64 at 1920/1280/900/375, `scrollWidth` equal to the viewport at all four. This task is a refactor; any visible difference is a defect.

- [ ] **Step 8: Commit**

```bash
git add src/design/templates src/app/page.tsx src/app/__tests__/route-purity.test.ts src/design/__tests__/HomePage.test.tsx
git commit -m "feat(templates): move the home composition behind a template

The route-purity guard asserted a route imports from @/design/templates,
not that it imports only from there -- so the home route imported nine
families directly and composed them into JSX inside the route, which is
exactly what spec 6.3 forbids. The guard passed the one route it most
existed to catch.

Two templates rather than one: EditorialPage owns the band rhythm and
knows nothing about which bands exist; HomePage owns the sequence and
delegates the shell to it. That split is what lets the route import
neither families nor primitives, so the rule is now satisfiable rather
than merely stated.

The guard is tightened to match, and proved on both import paths."
```

---

## Task 2: Groups, derived

**Files:**
- Create: `src/core/registry/groups.ts`, `src/app/groups/page.tsx`, `src/app/groups/format/[format]/page.tsx`, `src/app/groups/task/[kind]/page.tsx`
- Test: `src/core/registry/__tests__/groups.test.ts`

**Interfaces:**
- Produces: `deriveFormatGroups(): { format: string; tools: Tool[] }[]` and `deriveTaskGroups(): { kind: Kind; tools: Tool[] }[]`.

Spec §7.3: groups are **derived, with no registry**. Every tool another agent adds appears automatically. §5.2 explains why they live under `/groups/*` rather than at the root: a verb hub at `/compress` would collide with `/[category]`, and while a static route does win Next's matcher, `generateStaticParams` and `dynamicParams = false` then interact with it in ways that fail at export time rather than edit time.

The registry has six `kind` values — `compress`, `convert`, `edit`, `extract`, `generate`, `resize` — and `inspect` is declared in the schema but unused. **A group with no tools must not produce a route**, or the build emits a page listing nothing.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { TOOLS } from "@/core/registry";
import { deriveFormatGroups, deriveTaskGroups } from "@/core/registry/groups";

describe("deriveFormatGroups", () => {
	it("groups every tool under each format it accepts or emits", () => {
		const groups = deriveFormatGroups();
		const png = groups.find((g) => g.format === "png");
		expect(png).toBeDefined();
		expect(png?.tools.length).toBeGreaterThan(1);
	});

	it("lists a tool under both its input and its output format", () => {
		// png-to-webp belongs in the png group and the webp group. A group
		// keyed on input alone would hide half the answer to "what can I do
		// with a webp file?".
		const groups = deriveFormatGroups();
		const ids = (f: string) =>
			groups.find((g) => g.format === f)?.tools.map((t) => t.id) ?? [];
		const both = ids("png").filter((id) => ids("webp").includes(id));
		expect(both.length).toBeGreaterThan(0);
	});

	it("emits no empty group", () => {
		for (const group of deriveFormatGroups()) {
			expect(group.tools.length).toBeGreaterThan(0);
		}
	});

	it("returns formats sorted, so routes are stable between builds", () => {
		const formats = deriveFormatGroups().map((g) => g.format);
		expect([...formats].sort()).toEqual(formats);
	});
});

describe("deriveTaskGroups", () => {
	it("groups tools by kind and omits kinds no tool declares", () => {
		const groups = deriveTaskGroups();
		const kinds = groups.map((g) => g.kind);
		expect(kinds).toContain("convert");
		// `inspect` is in the schema but no tool uses it — a route for it
		// would list nothing.
		expect(kinds).not.toContain("inspect");
		for (const group of groups) expect(group.tools.length).toBeGreaterThan(0);
	});

	it("accounts for every tool exactly once", () => {
		const total = deriveTaskGroups().reduce((n, g) => n + g.tools.length, 0);
		expect(total).toBe(TOOLS.length);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/core/registry/__tests__/groups.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the derivation**

Create `src/core/registry/groups.ts`. A format group unions `accept.ext` and `output.ext`, lowercased; a task group keys on `kind`. Both return sorted arrays and omit empties. Write into the doc comment why a tool appears under both its input and output format, and why an empty group must never reach the router.

- [ ] **Step 4: Build the three routes**

All three use `HubPage`. Each needs `generateStaticParams` over the derived groups and `dynamicParams = false`, matching how `/[category]` does it — read that route first and follow it.

`/groups` lists both dimensions. The two dynamic routes list their tools. Reuse `ToolSearch` or the tool row helper the tools index already uses rather than writing a third listing.

Each route: component body ≤ 50 lines, file ≤ 150, **no families or primitives imports**.

- [ ] **Step 5: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS. The build is the real check — it exports every group route, and a bad `generateStaticParams` fails there rather than in a test.

Report the number of static pages the build emits, before and after.

- [ ] **Step 6: Verify the routes**

Rebuild, serve `out/`, and report:
1. `out/groups/format/png.html` exists and lists the same tool count `deriveFormatGroups()` yields for `png`.
2. The same for one task group.
3. `/groups` links to every group route that exists, and to none that does not — enumerate the links and check each against the built files.
4. `scrollWidth` equals the viewport at 375 and 1280 on all three.

- [ ] **Step 7: Commit**

```bash
git add src/core/registry/groups.ts src/core/registry/__tests__/groups.test.ts src/app/groups
git commit -m "feat(groups): derive format and task hubs from the registry

No registry of its own and no hand-authoring: every tool another agent
adds appears in its format and task groups automatically, and cannot
drift from what the product actually does.

A tool is listed under both its input and its output format, because a
group keyed on input alone hides half the answer to 'what can I do with
this file?'. Kinds no tool declares emit no route -- `inspect` is in the
schema and unused, and a route for it would list nothing.

They live under /groups/* per spec 5.2: a verb hub at /compress would
collide with /[category], and while a static route does win Next's
matcher, generateStaticParams and dynamicParams interact with it in ways
that fail at export time rather than edit time."
```

---

## Task 3: Collectives

**Files:**
- Create: `src/content/collectives/types.ts`, `src/content/collectives/registry.ts`, two collective entries, `src/app/collectives/page.tsx`, `src/app/collectives/[slug]/page.tsx`
- Test: `src/content/collectives/__tests__/registry.test.ts`

**Interfaces:**
- Produces: `COLLECTIVES: CollectiveMeta[]`, `getCollective(slug)`.

Spec §7.2. A collective is a curated set of tools with an editorial reason — "Everything for a podcast", "Strip metadata before sharing" — as against groups, which are mechanical.

**Follow the blog registry's module-boundary discipline exactly.** `src/content/blog/registry.ts` imports metadata objects only and never a content body, with a comment explaining that importing bodies would pull every one into the build graph of any page that lists them — the same class of bug `core/registry`'s module-boundary test guards against for tools. Read that file before writing this one.

**Every tool a collective names must exist.** A collective referencing a removed tool is a broken page, and the registry is the only place to catch it.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { COLLECTIVES, getCollective } from "@/content/collectives/registry";
import { getTool } from "@/core/registry";

describe("collectives registry", () => {
	it("has at least two collectives", () => {
		expect(COLLECTIVES.length).toBeGreaterThanOrEqual(2);
	});

	it("names only tools that exist", () => {
		// A collective referencing a removed tool is a broken page, and this
		// is the only place it can be caught.
		for (const collective of COLLECTIVES) {
			for (const id of collective.toolIds) {
				expect(getTool(id), `${collective.slug} names missing tool ${id}`).toBeDefined();
			}
		}
	});

	it("has unique slugs", () => {
		const slugs = COLLECTIVES.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("resolves a known slug and rejects an unknown one", () => {
		const first = COLLECTIVES[0];
		expect(first).toBeDefined();
		if (first) expect(getCollective(first.slug)?.slug).toBe(first.slug);
		expect(getCollective("no-such-collective")).toBeUndefined();
	});

	it("gives every collective a reason, not just a list", () => {
		// The difference between a collective and a group is editorial
		// intent. One without a stated reason is a group with extra steps.
		for (const collective of COLLECTIVES) {
			expect(collective.why.length).toBeGreaterThan(20);
		}
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/content/collectives/__tests__/registry.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the types, registry and two collectives**

`CollectiveMeta`: `slug`, `title`, `why`, `toolIds: string[]`. Write two real ones whose tools all exist — check each id against `TOOLS` as you write it. Their `why` must be true of the tools they name; this is a user-facing claim and the global constraint applies.

- [ ] **Step 4: Build both routes**

`/collectives` uses `HubPage`; `/collectives/[slug]` uses `HubPage` too until Task 4 gives it `ShowcasePage`. `generateStaticParams` over `COLLECTIVES`, `dynamicParams = false`.

- [ ] **Step 5: Run everything and verify**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`

Then rebuild, serve, and confirm each collective page lists exactly the tools its entry names, and that every tool link resolves to a built page.

- [ ] **Step 6: Commit**

```bash
git add src/content/collectives src/app/collectives
git commit -m "feat(collectives): add the curated sets and their routes

A collective is a group with an editorial reason -- 'everything for a
podcast' rather than 'everything that accepts wav'. The registry
enforces that difference: an entry without a stated reason fails, since
one is a group with extra steps.

Metadata only, following the blog registry's module boundary: bodies are
never imported here, because importing them would pull every collective
into the build graph of any page that lists them.

A test asserts every tool a collective names actually exists. This is
the only place a reference to a removed tool can be caught before it
becomes a broken page."
```

---

## Task 4: Samples, `LiveDemo`, and `ShowcasePage`

**Files:**
- Create: `scripts/generate-samples.mjs`, `src/content/samples/registry.ts`, `src/components/instrument/LiveDemo.tsx`, `src/design/templates/ShowcasePage.tsx`
- Modify: `src/design/templates/index.ts`, `src/app/collectives/[slug]/page.tsx`
- Test: `src/content/samples/__tests__/registry.test.ts`, `src/components/instrument/__tests__/LiveDemo.test.tsx`

**Interfaces:**
- Produces: `SAMPLES`, `getSample(id)`; `LiveDemo({ toolId, sampleId })`; `ShowcasePage({ ...HubPage props, showcase, demo })`.

Spec §8. **Read §8.1 and §8.2 in full before writing anything.**

**The samples are generated, not obtained.** `scripts/generate-samples.mjs` writes real, valid files into `public/samples/` deterministically — a PNG from raw pixel data, a WAV from synthesised samples. Commit both the script and its output, so the build never depends on running it. **Do not fetch anything**, and do not commit a file you cannot generate: a binary of unknown provenance presented as a sample is the fabrication this project forbids.

**Two refusals from §8.2, both load-bearing:**
- **Demos never auto-run.** Activation is always a user action.
- **No demo for a heavy-download tool.** Any tool declaring `heavyDownloadMb` gets a static specimen. Without this, a click silently spends 31MB of someone's connection on a decoration.

**At rest a demo fetches nothing** — no engine module, no WASM, no sample bytes. A page with three demos costs nothing until one is clicked. That is the property most worth testing, and the only place it can be tested is a browser with a network trace.

- [ ] **Step 1: Write the sample generator and its registry test**

The generator must produce files that genuinely decode. Verify by running the real engines over them, not by trusting the byte layout.

```ts
import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getSample, SAMPLES } from "@/content/samples/registry";

describe("samples registry", () => {
	it("points at files that exist on disk", () => {
		for (const sample of SAMPLES) {
			expect(existsSync(`public${sample.source}`), `${sample.id} missing`).toBe(true);
		}
	});

	it("records the real byte size of each file", () => {
		// A manifest whose sizes drift from the files is worse than no
		// manifest — the demo would report a number it did not measure.
		for (const sample of SAMPLES) {
			expect(sample.bytes).toBe(statSync(`public${sample.source}`).size);
		}
	});

	it("resolves a known id and rejects an unknown one", () => {
		const first = SAMPLES[0];
		expect(first).toBeDefined();
		if (first) expect(getSample(first.id)?.id).toBe(first.id);
		expect(getSample("no-such-sample")).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run it to verify it fails, then make it pass**

Run: `pnpm exec vitest run src/content/samples/__tests__/registry.test.ts`
Expected: FAIL, then PASS once the generator has run and the registry exists.

- [ ] **Step 3: Write `LiveDemo`**

A client component. At rest: the sample's identity and a mono `RUN DEMO` affordance, no fetch. On activation: fetch the sample same-origin, run it through the same `runJob` pipeline `ToolClient` uses, and print the real readout — input → output bytes, delta, fidelity state, elapsed time. Read `ToolClient` for how it calls `runJob`; do not reimplement the pipeline.

A tool with `heavyDownloadMb` renders a labelled static specimen instead, and the label says why.

- [ ] **Step 4: Write `ShowcasePage` and use it**

`HubPage` plus a showcase band and a demo slot. Point `/collectives/[slug]` at it.

- [ ] **Step 5: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm exec playwright test`

- [ ] **Step 6: Verify the two refusals in a browser**

This is the task's real gate, and none of it is visible to happy-dom. Rebuild, serve `out/`, and on a collective page carrying a demo:

1. **At rest, nothing is fetched.** Record every network request from page load until settled. No engine chunk, no `.wasm`, no file under `/samples/`. Report the full list of requests.
2. **Activation runs a real conversion.** Click `RUN DEMO`, and report the readout it prints alongside the sample's real byte size from the registry. The output size must be a number the conversion produced, not one written down.
3. **A heavy-download tool shows a specimen, not a demo** — confirm no `RUN DEMO` affordance exists for it, and that its label says why.
4. **No demo auto-runs** — reload and confirm nothing converts without a click.
5. `e2e/network-guard.ts` still passes: the sample fetch is same-origin and must not trip it.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-samples.mjs public/samples src/content/samples src/components/instrument/LiveDemo.tsx src/design/templates "src/app/collectives/[slug]/page.tsx"
git commit -m "feat(demos): run real conversions on generated samples

A demo is a real conversion through the same runJob pipeline the
instrument uses -- not a recording and not a pre-baked result.

The samples are generated rather than obtained. A valid PNG and WAV can
be written deterministically from code; a HEIC or FLAC cannot, without
either inventing a binary or fetching one, and fetching would breach the
zero-third-party-request guarantee the product rests on. So demos exist
for what can be generated honestly and every other tool gets a labelled
specimen -- which spec 8.2 already required for the heavy-download tier.

Both of that section's refusals are enforced and verified in a browser:
nothing is fetched at rest, so three demos on a page cost nothing until
one is clicked, and no demo auto-runs."
```

---

## Task 5: `LegalPage`, marketing and legal routes

**Files:**
- Create: `src/design/templates/LegalPage.tsx`, `src/app/about/page.tsx`, `src/app/how-it-works/page.tsx`, `src/app/privacy/page.tsx`, `src/app/legal/terms/page.tsx`, `src/app/legal/privacy-policy/page.tsx`, `src/app/legal/licences/page.tsx`
- Modify: `src/design/templates/index.ts`, `src/design/chrome/SiteHeader.tsx`, `src/design/chrome/SiteFooter.tsx`
- Test: `src/design/__tests__/LegalPage.test.tsx`

**Interfaces:**
- Produces: `LegalPage({ title, revised, children })`.

Spec §5.3 and §5.4 matter here and should be read.

**`/legal/licences` is not ceremonial.** This product ships WASM builds of libheif, ffmpeg and others, whose licences require attribution. The page must list the real dependencies with their real licences — derive them from `package.json` and the vendored WASM builds rather than writing a list by hand, because a hand-written one goes stale silently and an attribution page that is wrong is worse than none.

**`/privacy` versus `/legal/privacy-policy`** are deliberately different: the first is the plain-language claim a visitor wants, the second the formal document. Neither may contradict the other, and both must be true of the code — `e2e/network-guard.ts` is the file that decides.

**No invented legal text.** Terms and a privacy policy that were made up are worse than absent. Write what is true of this product — it collects nothing, transmits nothing, has no accounts — and where a real document would need a jurisdiction, a company entity or a contact, say plainly that it is a placeholder pending the user's input rather than inventing one.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalPage } from "@/design/templates/LegalPage";

describe("LegalPage", () => {
	it("renders the title and a mono revision line", () => {
		const { container } = render(
			<LegalPage title="Terms" revised="9 September 2026">
				<p>body</p>
			</LegalPage>,
		);
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Terms");
		const revised = container.querySelector("[data-revised]") as HTMLElement;
		expect(revised.textContent).toContain("9 September 2026");
		expect(revised.className).toContain("mono");
	});

	it("sets a narrower measure than an article", () => {
		// Spec 6.2: ArticlePage at a narrower measure. Legal text is denser
		// and benefits from a shorter line than editorial prose.
		const { container } = render(
			<LegalPage title="x" revised="y">
				<p>body</p>
			</LegalPage>,
		);
		expect(container.querySelector("[data-legal-prose]")).not.toBeNull();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/design/__tests__/LegalPage.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write the template and the six routes**

Each route: component ≤ 50 lines, file ≤ 150, no families or primitives imports. `/about` and `/how-it-works` use `ArticlePage` or `HubPage` as their shape suits.

- [ ] **Step 4: Wire the navigation**

`SiteHeader`'s nav and `SiteFooter`'s link columns gain the new destinations. **Every link must point at a route that exists** — Task 1 of the chrome plan added a test asserting exactly this, and it will fail if you link something unbuilt. Read it before editing.

- [ ] **Step 5: Run everything**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build && pnpm exec playwright test`

- [ ] **Step 6: Verify**

Rebuild, serve, and report: every new route renders; the licences page names dependencies that are actually in `package.json`, with a spot-check of three against their real licence; `/privacy` and `/legal/privacy-policy` do not contradict each other; every header and footer link resolves to a built page; `scrollWidth` equals the viewport at 375 and 1280 on each.

**List every placeholder you left**, so the user can see exactly what needs their input.

- [ ] **Step 7: Commit**

```bash
git add src/design/templates src/app/about src/app/how-it-works src/app/privacy src/app/legal src/design/chrome
git commit -m "feat(routes): add the marketing and legal pages

/legal/licences is derived from package.json and the vendored WASM
builds rather than hand-written. This product ships libheif and ffmpeg
builds whose licences require attribution, and a hand-written list goes
stale silently -- an attribution page that is wrong is worse than none.

/privacy and /legal/privacy-policy are deliberately different documents:
the plain-language claim a visitor wants, and the formal one. Neither
contradicts the other and both are true of the code, with
e2e/network-guard.ts as the file that decides.

Where a real legal document needs a jurisdiction, an entity or a
contact, the text says plainly that it is a placeholder pending input
rather than inventing one. Invented legal text is worse than absent."
```

---

## Task 6: Sitemap, robots, and the exit gate

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`
- Test: `src/app/__tests__/sitemap.test.ts`

**Interfaces:**
- Consumes: every registry and every route built in this plan.

Spec §7.5. The sitemap must be **derived from the same registries the routes are**, so a route that exists is listed and a route that does not is not.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { TOOLS } from "@/core/registry";
import { BLOG_POSTS } from "@/content/blog/registry";
import { COLLECTIVES } from "@/content/collectives/registry";
import { deriveFormatGroups, deriveTaskGroups } from "@/core/registry/groups";

describe("sitemap", () => {
	it("lists every tool, post, collective and group exactly once", () => {
		const urls = sitemap().map((e) => e.url);
		expect(new Set(urls).size).toBe(urls.length);
		const expected =
			TOOLS.length +
			BLOG_POSTS.length +
			COLLECTIVES.length +
			deriveFormatGroups().length +
			deriveTaskGroups().length;
		expect(urls.length).toBeGreaterThanOrEqual(expected);
	});

	it("lists no URL for a route that does not exist", () => {
		// Derived from the same registries the routes are, so the two cannot
		// disagree. A sitemap advertising a 404 is worse than no sitemap.
		for (const entry of sitemap()) {
			expect(entry.url.startsWith("https://")).toBe(true);
		}
	});
});
```

- [ ] **Step 2: Run it to verify it fails, then write both files**

`robots.ts` allows everything and points at the sitemap. There is nothing to hide — the product has no accounts and no private routes.

- [ ] **Step 3: Run the exit gate**

Run: `pnpm run ci`
Expected: PASS. Known flakes, and only these two: `src/core/io/__tests__/zip.test.ts` and `src/core/engines/audio/__tests__/loudness.test.ts`. `scripts/__tests__/generate-sw.test.ts` has a pre-existing unrelated regex flake — leave it. Any other failure means a change is wrong.

- [ ] **Step 4: Walk every route in the site**

Rebuild, serve `out/`, and for **every** route type — home, tools, category, converter, blog, post, groups index, format group, task group, collectives index, collective, about, how-it-works, privacy, three legal pages, 404:

1. `documentElement.scrollWidth` equals the viewport at 375 and 1280.
2. Exactly one `<main>` and one `<h1>`.
3. The lowest text contrast, **naming its ground**.
4. Every tab stop has a visible focus ring, measured with real `Tab` keypresses against what is actually behind the ring.
5. No link points at an unbuilt route — enumerate every internal href across the whole built site and check each against `out/`.

Report a table. This is the last chance to catch anything, and it is the check no per-task review could make.

- [ ] **Step 5: Commit**

```bash
git add src/app/sitemap.ts src/app/robots.ts src/app/__tests__/sitemap.test.ts
git commit -m "feat(seo): derive the sitemap from the registries

Every tool, post, collective and group, from the same sources the routes
themselves are built from -- so a route that exists is listed and one
that does not cannot be. A sitemap advertising a 404 is worse than no
sitemap.

robots allows everything: the product has no accounts and no private
routes, so there is nothing to hide."
```

---

## Definition of done

- [ ] `pnpm run ci` passes end to end.
- [ ] No `page.tsx` imports from `@/design/families` or `@/design/primitives` — proved by mutation on both paths.
- [ ] Every route in spec §5.1's map exists and is reachable from the chrome.
- [ ] Groups derive from the registry; adding a tool adds it to its groups with no other edit.
- [ ] Every tool a collective names exists, enforced by a test.
- [ ] Samples are generated by a committed script and genuinely decode.
- [ ] A demo fetches nothing at rest, never auto-runs, and is replaced by a labelled specimen for any heavy-download tool — all four verified in a browser with a network trace.
- [ ] `/legal/licences` is derived from real dependencies.
- [ ] Every placeholder in the legal text is listed for the user, and nothing legal is invented.
- [ ] The sitemap lists no route that does not exist.
- [ ] Across every route: one `<main>`, one `<h1>`, no horizontal overflow at 375 or 1280, every tab stop's ring visible, no link to an unbuilt route.
