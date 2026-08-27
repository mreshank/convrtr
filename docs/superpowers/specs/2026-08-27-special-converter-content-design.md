# Special-converter content pipeline — Design Spec (v1)

**Date:** 2026-08-27
**Domain:** `convrtr.mreshank.com`
**Status:** Approved for planning

---

## 1. Summary

convrtr is expanding beyond commodity image/video conversion into **special converters** —
single-purpose, format-specific extractors for proprietary containers that have no good free
browser tool today (the reference instance is `video/mlw-to-mp4`, an AES-GCM decryptor for a
course-app video wrapper; see `src/core/engines/mlw/` and
`docs/superpowers/specs/2026-08-07-convrtr-design.md` for the base architecture these tools
extend). Each special converter is paired with a small cluster of blog posts that give it
distribution: dense, genuinely useful writing that doesn't exist anywhere else, covering the
technical mechanism, the real-world use case, trust/legal questions, and troubleshooting.

This spec covers the **content subsystem** that publishes those posts on-site — not the
converters themselves, which follow the existing tool-registry pattern and are scoped
per-converter as they're built.

## 2. Goals

- Publish long-form posts under `convrtr.mreshank.com/blog/*`, statically generated like every
  tool page — no CMS, no server, versioned in git.
- Support MDX as the default authoring format, with `.tsx` available per-post for content that
  needs real layout/components, sharing one registry and one route.
- Link tool ↔ posts both ways: a tool page surfaces its related posts, every post ends with a
  CTA back to the tool it supports.
- Keep post metadata (title, related tools, tags) free of any dependency on a post's heavy body
  content, so building the blog index never pulls every post's MDX into one bundle.
- Ship the first instance — 5 posts for `video/mlw-to-mp4` — as the reference cluster that
  proves the pattern, the same way MLW→MP4 proved the special-converter tool pattern.

## 3. Non-goals

- A visual page builder or non-technical authoring flow — posts are written and reviewed as
  code, like everything else in this repo.
- Comments, newsletter capture, or any server-persisted state — no server exists to hold it.
- A generic "any markdown" CMS abstraction — this is sized for the number of posts a handful of
  special converters need, not a general blogging platform.
- Auto-generating post prose. Content is written with the same editorial care as tool SEO copy;
  this spec only covers where it lives and how it's wired up.

## 4. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Format | MDX by default, `.tsx` per-post where needed | Matches the explicit ask: mostly MDX, but real components/templating available, not bolted on later. |
| Metadata/content split | `meta.ts` (plain data) + `content.mdx`/`content.tsx` (body), one directory per post | Mirrors `core/registry` (`Tool.seo` is plain data; engines are imported separately). The existing `mime-parity.test.ts` "module boundary" test exists *because* mixing metadata with heavy modules once hung `next build` — the same failure class would hit a blog index that pulls in every post's compiled MDX just to list titles. |
| Route shape | `src/app/blog/page.tsx` (index) + `src/app/blog/[slug]/page.tsx` (post), `generateStaticParams()` from the registry | Same SSG pattern as `src/app/[category]/[slug]/page.tsx` — one static page per post, nothing new in routing philosophy. |
| Component injection | `src/mdx-components.tsx` (Next's standard global override) | Zero-magic, officially supported way to give every `.mdx` file the same component library without per-file prop threading. |
| Tool ↔ post linking | `getPostsByTool(tool.id)` rendered in the tool's `page.tsx`; `<ToolCTA toolId="..." />` component in every post | Both directions read live data (`getTool()`/registry), so copy can't drift out of sync with the tool it references. |
| SEO | `generateMetadata` + `BlogPosting` JSON-LD per post, extending `src/lib/jsonld.ts` | Same treatment tool pages already get; consistent JSON-LD approach across the site. |

---

## 5. Architecture

### 5.1 Content layout

```text
src/content/blog/
  <slug>/
    meta.ts        — plain BlogPostMeta object (title, description, publishedAt,
                      relatedTools: string[], tags: string[])
    content.mdx     — the post body (or content.tsx for component-heavy posts)
```

`meta.ts` has no imports beyond types — no MDX, no components, no engines. This is what makes
it safe to import from every `meta.ts` into one registry file without dragging in the bodies.

### 5.2 Registry

`src/content/blog/registry.ts` collects every post's `meta.ts` (imported by hand, one line per
post — same convention as `core/registry/index.ts`) into:

```ts
export const BLOG_POSTS: BlogPostMeta[];
export function getPost(slug: string): BlogPostMeta | undefined;
export function getPostsByTool(toolId: string): BlogPostMeta[];
```

The registry never imports a `content.mdx`/`content.tsx` file. Those are resolved only inside
`src/app/blog/[slug]/page.tsx`, per-slug, via a dynamic `import()` keyed off the matched post —
so building the index costs nothing per post's body size, and adding a 50th post never risks
pulling 49 unrelated MDX bundles into one page's build graph.

### 5.3 Routes

- `src/app/blog/page.tsx` — lists `BLOG_POSTS`, sorted by `publishedAt` descending.
- `src/app/blog/[slug]/page.tsx` — `generateStaticParams()` maps `BLOG_POSTS` to slugs;
  `getPost(slug)` resolves metadata for `generateMetadata`/JSON-LD; the body is loaded via
  `const { default: Content } = await import(`@/content/blog/${slug}/content`)` and rendered.

### 5.4 Components

`src/components/content/`:
- `<Callout kind="note" | "warning">` — asides, used for the "this isn't DRM-breaking" kind of
  clarification inline in prose.
- `<FAQ items={[{q, a}]} />` — same visual language as `Tool.seo.faq`, reused for posts.
- `<ComparisonTable>` — for posts like the MLW-vs-other-wrappers piece.
- `<ToolCTA toolId="video/mlw-to-mp4" />` — reads `getTool(toolId)` and renders a card with the
  tool's real title/description and a link to it. Never hand-copy tool copy into a post.

`src/mdx-components.tsx` registers these globally for every `.mdx` file, per Next.js App Router
convention.

### 5.5 Tool-page integration

`src/app/[category]/[slug]/page.tsx` (already a server component doing SSG) gains a "Related
reading" block: `getPostsByTool(tool.id)`, rendered only when non-empty. This is additive — no
change to `ToolClient.tsx` or the conversion flow.

### 5.6 Testing

`src/content/blog/__tests__/conformance.test.ts`, mirroring
`core/registry/__tests__/conformance.test.ts`:
- No duplicate slugs.
- Every `relatedTools` entry resolves via `getTool()` from `core/registry`.
- Every registered post has a `content.mdx` or `content.tsx` file actually present on disk
  (`fs.existsSync`), so a registry entry can never point at a file that doesn't exist.

Post prose itself isn't unit-tested — same as `Tool.seo` copy today. A Playwright smoke test
(one spec, not one per post) navigates to `/blog` and to one representative post, confirming the
route renders and the tool CTA link resolves — following the existing `e2e/*.spec.ts` convention
of proving the real static-export build actually serves the page, not just that the component
compiles.

---

## 6. First content batch — `video/mlw-to-mp4`

Five posts, each covering distinct search intent so they don't cannibalize each other:

1. **How MLW video encryption actually works** — technical deep-dive on the byte layout and
   AES-GCM scheme. The flagship "doesn't exist anywhere else" post; this is the one likely to
   earn links/citations.
2. **Recovering your course videos after a platform shuts down or a subscription lapses** —
   use-case/rescue angle, written toward the person who's already anxious about losing access.
3. **Is extracting MLW video legal?** — trust/ethics FAQ-style post; states plainly that a
   single fixed key shared across every install is obfuscation, not access control, and that
   the user is decrypting a file they already have full access to.
4. **MLW vs. other course-platform video wrappers** — comparison/category piece, situates MLW
   within the broader "DRM-lite container" space and seeds future special-converter posts in
   the same category.
5. **Troubleshooting a failed MLW extraction** — support-driven, covers the concrete failure
   modes the engine can actually produce (`"Root\0" marker not found"`, `"filename block has no
   NUL terminator"`, `"file truncated..."`, AES-GCM authentication failure) in plain language,
   mapped to what a user should check.

Each links to `/video/mlw-to-mp4` via `<ToolCTA>`; the tool page's "Related reading" block
surfaces all five.

---

## 7. Open questions for future batches

Not blocking this spec, but worth flagging: as more special converters ship (reMarkable,
Notability, etc. — see prior research), each gets its own 4-5-post batch under this same
pipeline. Nothing in this design is MLW-specific; extending it is "add a directory under
`src/content/blog/`," not a new spec.
