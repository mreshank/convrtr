# Master Converter, Hover Mega-Menu, and Groups Grid

Date: 2026-09-10
Status: Approved for planning

## Context

Three related gaps in convrtr's navigation and conversion UX:

1. There is no single "convert anything" page — users must already know which
   per-tool route (`/[category]/[slug]`) they want. A prior ad-hoc session
   (unreviewed, uncommitted) had already started this as `/convert` +
   `MasterConverterClient.tsx` + `src/core/registry/converter-match.ts`. An
   exploration pass confirmed this code is real, working, and covered by
   passing tests (19/19) — not a stray experiment. It is kept and finished,
   not rebuilt.
2. The site nav (`SiteHeader`) is a flat list of links with no way to browse
   tools by category without a full page navigation. `SiteHeader` was
   previously and deliberately rewritten to remove an overlay/disclosure menu
   (client state, focus trap, Escape handling, scroll lock), and tests
   (`primitives-contract.test.ts`, `SiteHeader.test.tsx`) guard against that
   pattern reappearing. This spec reverses that guard narrowly and
   deliberately for a new, smaller disclosure pattern.
3. `/groups` renders format/task groups as a single linear ruled list
   (`ListingRows`), which reads as one flat list rather than as distinct
   groups. It needs a 2D grid of group cards with expand/collapse.

All three surfaces must read tool/group data from the existing registry
(`src/core/registry`) as the single source of truth — no new hardcoded lists.

## Goals

- Finish and commit the master converter at `/convert`.
- Add a hover/focus-triggered mega-menu to the site nav, grouped by category,
  with a nested sub-hover disclosure per group, sourced from the registry.
- Replace `/groups`' linear list with a 2D card grid where each group card
  expands in place (single-open accordion) to preview its tools.

## Non-goals

- No changes to the per-tool converter page (`/[category]/[slug]`) or its
  `ToolClient` UI.
- No changes to the registry's data shape (`Tool`, `Category`, etc.) — only
  new consumers of existing derivations (`TOOLS`, `deriveFormatGroups`,
  `deriveTaskGroups`, `converter-match.ts` helpers).
- No full-viewport overlay, scroll lock, or focus trap — the previous
  overlay pattern stays removed; the new disclosure is a small, local,
  anchored panel.

## 1. Master converter (`/convert`) — review and finish

Existing files (untracked/modified, to be reviewed then committed):

- `src/app/convert/page.tsx` — route, wraps `ConverterPage` template.
- `src/components/instrument/MasterConverterClient.tsx` — upload, per-file
  target dropdown, bulk target, select/deselect/invert/prune, quality preset,
  per-row progress/status, heavy-download gate, ZIP-all download, cancel.
- `src/core/registry/converter-match.ts` — `detectFileExtension`,
  `getAvailableTargetFormatsForFile`, `findToolForConversion`,
  `getCommonTargetFormats`, `getAllTargetFormats`.
- `src/app/layout.tsx` (modified) — adds `/convert` to `NAV`, repoints `CTA`.
- `src/app/sitemap.ts` (modified) — adds `/convert`.
- Matching test files for the above.

Work: run a code review pass (correctness, edge cases — files with no common
target format, unsupported types, mixed heavy/light tools, cancellation
mid-batch) and fix any real defects found. Do not restructure working logic
that review does not flag. Commit the reviewed diff as one unit once tests
are green.

## 2. Mega-menu

### Component

New client component `ToolsMegaMenu` (`src/design/chrome/ToolsMegaMenu.tsx`),
mounted by `SiteHeader` next to the nav item it attaches to (the item whose
`href` is `/tools`, renamed label if needed — final copy is an implementation
detail, not fixed here).

- Level 1: category rows (image/video/audio/document/data, from
  `Category`/`deriveTaskGroups()` or `deriveFormatGroups()` — task-based
  grouping is preferred since it matches "convert / compress / resize" intent
  better than raw format lists, but the implementer should sanity-check
  against real data during planning and pick whichever derivation reads
  better; both already exist in `groups.ts`).
- Level 2 (sub-hover/focus/click on a level-1 row): the tools belonging to
  that group, each linking to its `/[category]/[slug]` page.
- Opens on hover or focus of the trigger; closes on blur/mouseleave (with a
  short close-delay to allow diagonal mouse movement into the panel) or
  Escape; fully keyboard-operable (Tab into trigger, Enter/Space or arrow-down
  opens, Tab through items, Escape closes and returns focus to trigger).
- No portal, no `position: fixed` full-viewport scrim, no scroll lock, no
  focus trap — the panel is anchored (`position: absolute` under the
  trigger), scoped to normal document flow, and does not intercept scroll or
  block the rest of the page. This is the specific, narrow difference from
  the previously-removed overlay that the updated guard comments/tests must
  state.
- Touch fallback: tap-to-toggle (no hover on touch), since hover-intent
  cannot be relied on.

### SiteHeader changes

- `SiteHeader` keeps its existing flat `links: LinkItem[]` contract for all
  other items; only the one nav item that should carry a mega-menu renders
  `ToolsMegaMenu` instead of a plain `<Link>`. This can be done by adding an
  optional `megaMenu?: boolean` (or similar) flag to the matching `LinkItem`,
  or by having `SiteHeader` special-case a known href — pick whichever is
  less invasive during planning; either way `SiteHeader`'s existing test
  suite for the plain-link items must keep passing unmodified in spirit.
- Update the doc comment above `SiteHeader` and the relevant assertions in
  `primitives-contract.test.ts` / `SiteHeader.test.tsx` to describe this
  narrower disclosure explicitly, and why it does not reintroduce what was
  removed (no client-wide scroll lock, no focus trap, no full-viewport
  scrim — see above). Do not simply delete the guarding assertions; replace
  them with assertions that pin down the new, narrower contract.

### Data

`ToolsMegaMenu` imports only from `src/core/registry` (`groups.ts`
derivations). No hardcoded category/tool lists in the component.

## 3. Groups grid

### `GroupGrid` family component

New file `src/design/families/GroupGrid.tsx`, replacing `ListingRows` as used
by the groups index page (`src/app/groups/page.tsx` via `HubPage`). Other
`ListingRows` call sites, if any, are unaffected.

- Renders a responsive CSS grid (not flex-column rows) of `AsymCard` cells,
  one per format or task group, using the existing `deriveFormatGroups()` /
  `deriveTaskGroups()` output — same data `/groups` already uses today, just
  a different layout component.
- Each card shows the group label and tool count (mirroring what
  `ListingRows` shows today).
- Clicking a card expands it in place — height-animates open using existing
  hairline/rule tokens — to list its tools inline (each linking to its tool
  page). Opening a card collapses any other currently-open card (single-open
  accordion, one card expanded at a time).
- An expanded card includes a "view all →" link to the existing
  `/groups/format/[format]` or `/groups/task/[kind]` sub-route for the full
  table view — those routes are unchanged.
- Client state (which card is open) lives in a small wrapper component;
  `GroupGrid` itself can stay presentational if that split is cleaner.

### Constraints carried over from existing conventions

- Styled via CSS custom properties already in use (`var(--rule)`,
  `var(--radius-card)`, etc.), not literals.
- Respects `route-purity.test.ts` (routes/templates import through
  `@/design/templates`, not directly reaching into `@/design/families` from
  a route) and `band-gutter.test.ts` (the family self-caps width, no own
  horizontal padding).

## Testing

- `MasterConverterClient`/`converter-match`: existing suites stay green;
  add cases only for defects found during review.
- `ToolsMegaMenu`: renders categories/tools from the registry (not
  hardcoded); opens on hover and focus; closes on Escape and blur; every
  item reachable and activatable by keyboard; touch tap-to-toggle.
- `SiteHeader`: updated tests assert the new narrower disclosure contract
  (present only on the one nav item, no scroll-lock/focus-trap/portal side
  effects) instead of asserting no disclosure exists at all.
- `GroupGrid`: renders one card per group with correct counts; expanding one
  card collapses any other open card; expanded card lists correct tools and
  links resolve to real tool routes.
- Full suite (`pnpm test` or repo equivalent) plus `route-purity`,
  `primitives-contract`, and `band-gutter` guard tests must stay green.
