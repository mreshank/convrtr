# Master Converter Fix, Hover Mega-Menu, and Groups Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and commit the existing master converter at `/convert` (fixing one real stale-output defect found in review), add a registry-driven hover/focus mega-menu to the site nav, and replace `/groups`' linear list with an expandable 2D card grid.

**Architecture:** All three features are additive consumers of the existing `src/core/registry` (no new data model). The master converter fix is a targeted bug fix inside the existing, already-working `MasterConverterClient`. The mega-menu is a new client component (`ToolsMegaMenu`) mounted by `SiteHeader` next to one nav item, coexisting with `SiteHeader`'s existing mobile-collapse disclosure (a separate, already-shipped feature — not touched). The groups grid is a new family component (`GroupGrid`) plumbed through `HubPage` via a new `grid` prop, used only by `/groups`.

**Tech Stack:** Next.js (App Router, static export), React (function components, hooks), Vitest + Testing Library (`happy-dom`), CSS custom properties (no Tailwind arbitrary values for design-system code, though `MasterConverterClient` itself already mixes Tailwind utility classes with `style` objects — follow its existing convention there, not the families/primitives convention).

**Spec:** `docs/superpowers/specs/2026-09-10-master-converter-and-mega-menu-design.md`

## Global Constraints

- No new hardcoded tool/category lists anywhere — `ToolsMegaMenu` and `GroupGrid` read only from `src/core/registry` (`TOOLS`, `deriveFormatGroups`, `deriveTaskGroups`, `Category`).
- No full-viewport overlay, scroll lock, or focus trap in the mega-menu — it is a small anchored panel, not a repeat of `SiteHeader`'s existing mobile disclosure.
- Every new client component (`"use client"`) must be added to `CLIENT_COMPONENT_ALLOWLIST` in `src/design/__tests__/primitives-contract.test.ts`, with a comment explaining why it needs client state.
- Design-system components (`src/design/**`) style via CSS custom properties (`var(--rule)`, `var(--radius-card)`, etc.), never literals — per existing convention in every file in `src/design/families` and `src/design/chrome`.
- `route-purity.test.ts` forbids `src/app/**/*.tsx` (except `layout.tsx`) from importing `@/design/families` or `@/design/primitives` directly — routes go through `@/design/templates`.
- `band-gutter.test.ts` requires every band-level family to declare its own `maxWidth: "var(--max-width)"` and no horizontal padding of its own.
- Full `pnpm test` (actually `npm test` / `vitest run` per `package.json`) must stay green after every task.

---

## File Structure

- `src/components/instrument/MasterConverterClient.tsx` — modify: reset a row's `status`/`output`/`outputSize`/`outputName`/`error` when its target format changes via `changeItemTarget` or `applyGlobalTarget`.
- `src/components/instrument/__tests__/MasterConverterClient.test.tsx` — modify: add the regression test for the above.
- `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/__tests__/layout.test.tsx`, `src/app/convert/page.tsx`, `src/core/registry/converter-match.ts`, `src/core/registry/__tests__/converter-match.test.ts` — no code changes, committed as-is once Task 1 passes.
- `src/design/chrome/ToolsMegaMenu.tsx` — new client component: the hover/focus mega-menu, sourced from the registry.
- `src/design/__tests__/ToolsMegaMenu.test.tsx` — new test file.
- `src/design/chrome/chrome.css` — modify: add anchoring/visibility rules for the mega-menu panel (media-query-free — desktop and touch both use the same DOM, just different trigger events).
- `src/design/chrome/SiteHeader.tsx` — modify: render `ToolsMegaMenu` in place of the plain `<Link>` for the `/tools` nav item.
- `src/design/__tests__/SiteHeader.test.tsx` — modify: add coverage for the new mega-menu mount point.
- `src/design/__tests__/primitives-contract.test.ts` — modify: add `"ToolsMegaMenu.tsx"` to `CLIENT_COMPONENT_ALLOWLIST`.
- `src/design/families/GroupGrid.tsx` — new family component: 2D grid of group cards, single-open expand/collapse.
- `src/design/families/index.ts` — modify: export `GroupGrid`.
- `src/design/families/families.css` — modify: add the expand/collapse height-animation rule for `GroupGrid`.
- `src/design/__tests__/GroupGrid.test.tsx` — new test file.
- `src/design/templates/HubPage.tsx` — modify: add an optional `grid` prop that renders `GroupGrid` instead of `sections`.
- `src/design/__tests__/HubPage.test.tsx` — modify: add coverage for the new `grid` prop.
- `src/app/groups/page.tsx` — modify: pass `grid` instead of `sections`.

---

### Task 1: Fix stale conversion output when a row's target format changes

**Files:**
- Modify: `src/components/instrument/MasterConverterClient.tsx:180-198` (`applyGlobalTarget`), `:238-251` (`changeItemTarget`)
- Test: `src/components/instrument/__tests__/MasterConverterClient.test.tsx`

**Interfaces:**
- Consumes: existing `MasterItem` type (`src/components/instrument/MasterConverterClient.tsx:35-50`) — no shape change.
- Produces: nothing new consumed by later tasks — this task is self-contained.

**Bug:** after a file finishes converting (`status: "done"`, `output` set), changing its per-row target dropdown (`changeItemTarget`) or the bulk "CONVERT SELECTED TO" dropdown (`applyGlobalTarget`) updates `targetExt`/`toolId`/`tool` but leaves `status`, `output`, `outputSize`, `outputName`, and `error` untouched. The row still shows "DONE" with a working "Save" button, which downloads the *previous* target format's bytes under the *new* target's filename/extension — a silently wrong file.

- [ ] **Step 1: Write the failing regression test**

Add to `src/components/instrument/__tests__/MasterConverterClient.test.tsx`, inside the existing `describe("MasterConverterClient", ...)` block:

```tsx
it("clears a row's stale output when its target format changes after conversion", async () => {
	render(<MasterConverterClient />);
	const dropField = screen.getByTestId("drop-field");

	fireEvent.drop(dropField, {
		dataTransfer: {
			files: [new File(["1"], "img1.png", { type: "image/png" })],
		},
	});

	fireEvent.click(screen.getByRole("button", { name: /CONVERT 1 FILE/i }));

	await screen.findByRole("button", { name: /Save img1/i });
	const row = screen.getByTestId("converter-item-row");
	expect(row.getAttribute("data-status")).toBe("done");

	const targetSelect = screen.getByRole("combobox", {
		name: "Target format for img1.png",
	}) as HTMLSelectElement;
	const otherOption = Array.from(targetSelect.options).find(
		(option) => option.value !== targetSelect.value && option.value !== "",
	);
	if (!otherOption) throw new Error("test needs a second target option");

	fireEvent.change(targetSelect, { target: { value: otherOption.value } });

	expect(row.getAttribute("data-status")).toBe("idle");
	expect(
		screen.queryByRole("button", { name: /Save img1/i }),
	).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/instrument/__tests__/MasterConverterClient.test.tsx -t "clears a row's stale output"`
Expected: FAIL — the row's `data-status` stays `"done"` and the Save button is still present after the target changes.

- [ ] **Step 3: Fix `changeItemTarget`**

In `src/components/instrument/MasterConverterClient.tsx`, replace the body of `changeItemTarget` (currently lines 238-251):

```tsx
	// Change target for a single item. Resets any prior conversion result --
	// otherwise a row that already converted keeps showing "done" with a
	// Save button that would download the OLD target's bytes under the
	// NEW target's filename.
	const changeItemTarget = (id: string, targetExt: string) => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== id) return item;
				const tool = findToolForConversion(item.ext, targetExt);
				return {
					...item,
					targetExt,
					toolId: tool?.id,
					tool,
					status: "idle",
					ratio: 0,
					phase: "",
					output: undefined,
					outputSize: undefined,
					outputName: undefined,
					error: undefined,
				};
			}),
		);
	};
```

- [ ] **Step 4: Fix `applyGlobalTarget`**

Replace the body of `applyGlobalTarget` (currently lines 180-198):

```tsx
	// Apply a global target format across all compatible selected items.
	// Same reset as `changeItemTarget`, for the same reason -- a bulk
	// re-target must not leave a previously "done" row's stale output
	// reachable through its Save button.
	const applyGlobalTarget = (target: string) => {
		setGlobalTarget(target);
		setItems((prev) =>
			prev.map((item) => {
				if (!item.selected) return item;
				const available = getAvailableTargetFormatsForFile(item.file);
				const isCompatible = available.some((t) => t.ext === target);
				if (!isCompatible) return item;

				const tool = findToolForConversion(item.ext, target);
				return {
					...item,
					targetExt: target,
					toolId: tool?.id,
					tool,
					status: "idle",
					ratio: 0,
					phase: "",
					output: undefined,
					outputSize: undefined,
					outputName: undefined,
					error: undefined,
				};
			}),
		);
	};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/instrument/__tests__/MasterConverterClient.test.tsx`
Expected: PASS, all cases in the file including the new one.

- [ ] **Step 6: Run the full existing suite for this feature to confirm no regression**

Run: `npx vitest run src/components/instrument/__tests__/MasterConverterClient.test.tsx src/core/registry/__tests__/converter-match.test.ts`
Expected: PASS (19+ tests, all green).

- [ ] **Step 7: Commit the fix together with the previously-uncommitted master converter files**

```bash
git add src/components/instrument/MasterConverterClient.tsx \
  src/components/instrument/__tests__/MasterConverterClient.test.tsx \
  src/core/registry/converter-match.ts \
  src/core/registry/__tests__/converter-match.test.ts \
  src/app/convert/page.tsx \
  src/app/layout.tsx \
  src/app/sitemap.ts \
  src/app/__tests__/layout.test.tsx
git commit -m "feat(convert): add master multi-file converter, fix stale row output on re-target"
```

---

### Task 2: `ToolsMegaMenu` — registry-driven hover/focus disclosure

**Files:**
- Create: `src/design/chrome/ToolsMegaMenu.tsx`
- Create: `src/design/__tests__/ToolsMegaMenu.test.tsx`
- Modify: `src/design/chrome/chrome.css` (append)
- Modify: `src/design/__tests__/primitives-contract.test.ts` (allowlist)

**Interfaces:**
- Produces: `export function ToolsMegaMenu({ triggerLabel, triggerHref }: { triggerLabel: string; triggerHref: string }): JSX.Element` — Task 3 mounts this beside/instead of the plain nav link.
- Consumes: `deriveTaskGroups` and `Kind` from `@/core/registry/groups` (re-exported via `@/core/registry`, confirm import path against `src/core/registry/index.ts` before writing the import — if `groups.ts` is not re-exported from the registry's own `index.ts`, import directly from `@/core/registry/groups`).

**Design:** Two-level disclosure. Level 1: one row per `TaskGroup` (`kind` + tool count), e.g. "Convert (18)", "Compress (4)". Level 2, on hovering/focusing a level-1 row: that group's tools as links to `/${tool.id}`. Opens on trigger hover/focus; a `mouseleave` on the whole menu region (trigger + panel) schedules a close after a short delay (cleared if the pointer re-enters), so moving diagonally into the panel doesn't close it; `focusout` on the whole region closes immediately if focus left it entirely; `Escape` closes and returns focus to the trigger. A click/tap on the trigger toggles it open/closed for pointers that don't hover (touch), without interfering with desktop hover behavior.

- [ ] **Step 1: Write the failing test file**

Create `src/design/__tests__/ToolsMegaMenu.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolsMegaMenu } from "@/design/chrome/ToolsMegaMenu";

describe("ToolsMegaMenu", () => {
	it("renders a closed trigger with no panel content visible", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });
		expect(trigger.getAttribute("href")).toBe("/tools");
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("group")).toBeNull();
	});

	it("opens on focus of the trigger and lists every task group from the registry", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });

		fireEvent.focus(trigger);

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		const panel = screen.getByRole("group", { name: "Tools" });
		// At least one known kind must appear -- this asserts the data
		// comes from the live registry rather than a hardcoded stub, without
		// hardcoding a specific count here that would drift as tools are added.
		expect(within(panel).getAllByRole("link").length).toBeGreaterThan(0);
	});

	it("expands a group's tools on hover of its row and links resolve to real tool routes", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		fireEvent.focus(screen.getByRole("link", { name: "Tools" }));

		const groupRows = screen.getAllByRole("button", { name: /^\S+ \(\d+\)$/ });
		const firstRow = groupRows[0];
		if (!firstRow) throw new Error("expected at least one task group row");

		fireEvent.mouseEnter(firstRow);

		const subPanel = screen.getByRole("group", {
			name: firstRow.textContent ?? undefined,
		});
		const toolLinks = within(subPanel).getAllByRole("link");
		expect(toolLinks.length).toBeGreaterThan(0);
		for (const link of toolLinks) {
			expect(link.getAttribute("href")).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+$/);
		}
	});

	it("closes on Escape and returns focus to the trigger", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });
		fireEvent.focus(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");

		fireEvent.keyDown(document, { key: "Escape" });

		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(trigger);
	});

	it("toggles open and closed on click, for pointers that do not hover", () => {
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		const trigger = screen.getByRole("link", { name: "Tools" });

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
	});

	it("does not lock body scroll or render a full-viewport scrim", () => {
		// The narrow difference from SiteHeader's mobile disclosure: this is a
		// small anchored panel, not a repeat of the removed full-viewport
		// overlay.
		document.body.style.overflow = "";
		render(<ToolsMegaMenu triggerLabel="Tools" triggerHref="/tools" />);
		fireEvent.focus(screen.getByRole("link", { name: "Tools" }));
		expect(document.body.style.overflow).toBe("");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/design/__tests__/ToolsMegaMenu.test.tsx`
Expected: FAIL — `Cannot find module '@/design/chrome/ToolsMegaMenu'`.

- [ ] **Step 3: Confirm the exact registry import path before writing the component**

Run: `grep -n "groups" src/core/registry/index.ts`
If `deriveTaskGroups`/`Kind` are re-exported there, import from `@/core/registry`; otherwise import from `@/core/registry/groups` directly. Use whichever the grep shows.

- [ ] **Step 4: Write `ToolsMegaMenu`**

Create `src/design/chrome/ToolsMegaMenu.tsx` (adjust the registry import per Step 3's finding):

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { deriveTaskGroups, type Kind } from "@/core/registry/groups";

type Props = {
	triggerLabel: string;
	triggerHref: string;
};

const CLOSE_DELAY_MS = 150;

function label(kind: Kind): string {
	return `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}

/**
 * The hover/focus mega-menu for the one nav item that carries it. This is
 * deliberately NOT a repeat of `SiteHeader`'s mobile disclosure: no portal,
 * no `position: fixed` scrim, no scroll lock, no focus trap. It is a small
 * panel anchored under its trigger, scoped to normal document flow, sourced
 * entirely from `deriveTaskGroups()` so it can never drift from the tool
 * registry.
 */
export function ToolsMegaMenu({ triggerLabel, triggerHref }: Props) {
	const [open, setOpen] = useState(false);
	const [activeKind, setActiveKind] = useState<Kind | null>(null);
	const triggerRef = useRef<HTMLAnchorElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const closeTimer = useRef<number | null>(null);
	const panelId = useId();

	const groups = deriveTaskGroups();

	const cancelScheduledClose = useCallback(() => {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	}, []);

	const close = useCallback(() => {
		cancelScheduledClose();
		setOpen(false);
		setActiveKind(null);
	}, [cancelScheduledClose]);

	const scheduleClose = useCallback(() => {
		cancelScheduledClose();
		closeTimer.current = window.setTimeout(close, CLOSE_DELAY_MS);
	}, [cancelScheduledClose, close]);

	useEffect(() => {
		if (!open) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			event.preventDefault();
			close();
			triggerRef.current?.focus();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, close]);

	useEffect(() => cancelScheduledClose, [cancelScheduledClose]);

	return (
		<div
			ref={rootRef}
			style={{ position: "relative", display: "inline-flex" }}
			onMouseEnter={cancelScheduledClose}
			onMouseLeave={scheduleClose}
			onFocus={() => setOpen(true)}
			onBlur={(event) => {
				if (rootRef.current?.contains(event.relatedTarget as Node | null)) {
					return;
				}
				close();
			}}
		>
			<Link
				ref={triggerRef}
				href={triggerHref}
				aria-expanded={open}
				aria-controls={panelId}
				onMouseEnter={() => setOpen(true)}
				onClick={(event) => {
					event.preventDefault();
					setOpen((current) => !current);
				}}
				style={{
					display: "inline-flex",
					alignItems: "center",
					height: "23px",
					padding: "0 14px",
					background: "transparent",
					color: "var(--ink)",
					borderRadius: "var(--radius-control)",
					fontSize: "var(--label-size)",
					letterSpacing: "var(--label-tracking)",
					fontWeight: "var(--label-weight)",
					whiteSpace: "nowrap",
				}}
			>
				{triggerLabel}
			</Link>

			{open ? (
				<div
					id={panelId}
					role="group"
					aria-label={triggerLabel}
					data-mega-menu
					style={{
						position: "absolute",
						top: "100%",
						left: 0,
						zIndex: 110,
						display: "flex",
						background: "var(--ground)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
						padding: "var(--space-base)",
						gap: "var(--space-base)",
					}}
				>
					<ul
						style={{
							display: "flex",
							flexDirection: "column",
							minWidth: "160px",
						}}
					>
						{groups.map((group) => (
							<li key={group.kind}>
								<button
									type="button"
									onMouseEnter={() => setActiveKind(group.kind)}
									onFocus={() => setActiveKind(group.kind)}
									style={{
										display: "flex",
										width: "100%",
										justifyContent: "space-between",
										gap: "var(--gap-sm)",
										padding: "var(--space-base) var(--gap-sm)",
										background:
											activeKind === group.kind ? "var(--surface)" : "transparent",
										color: "var(--ink)",
										border: "none",
										borderRadius: "var(--radius)",
										fontSize: "var(--label-size)",
										textAlign: "left",
									}}
								>
									<span>{label(group.kind)}</span>
									<span className="mono" style={{ color: "var(--ink-muted)" }}>
										{group.tools.length}
									</span>
								</button>
							</li>
						))}
					</ul>

					{activeKind
						? groups
								.filter((group) => group.kind === activeKind)
								.map((group) => (
									<ul
										key={group.kind}
										role="group"
										aria-label={`${label(group.kind)} (${group.tools.length})`}
										style={{
											display: "flex",
											flexDirection: "column",
											minWidth: "200px",
											borderLeftWidth: "var(--rule-width)",
											borderLeftStyle: "solid",
											borderLeftColor: "var(--rule)",
											paddingLeft: "var(--space-base)",
										}}
									>
										{group.tools.map((tool) => (
											<li key={tool.id}>
												<Link
													href={`/${tool.id}`}
													onClick={close}
													style={{
														display: "block",
														padding: "var(--space-base) var(--gap-sm)",
														color: "var(--ink)",
														fontSize: "var(--body-size)",
													}}
												>
													{tool.seo.title}
												</Link>
											</li>
										))}
									</ul>
								))
						: null}
				</div>
			) : null}
		</div>
	);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/design/__tests__/ToolsMegaMenu.test.tsx`
Expected: PASS. If the group-row role query fails because `firstRow.textContent` includes nested whitespace differently than the accessible name, adjust the test's row `name` matcher to use `getByRole("button", { name: (accName) => /\(\d+\)$/.test(accName) })` style matching instead of a strict regex — fix the test to match the actual rendered accessible name, not the component.

- [ ] **Step 6: Add `ToolsMegaMenu` to the client-component allowlist**

In `src/design/__tests__/primitives-contract.test.ts`, add to `CLIENT_COMPONENT_ALLOWLIST` (after the `"SiteHeader.tsx"` entry):

```ts
	// `ToolsMegaMenu` holds open/closed and active-group state and attaches
	// hover/focus/Escape handlers -- none of which a server component can
	// do. Unlike `SiteHeader`'s mobile disclosure it is NOT a full-viewport
	// panel: no portal, no scroll lock, no focus trap -- a small anchored
	// panel scoped to normal document flow, open only while its trigger or
	// panel has hover or focus.
	"ToolsMegaMenu.tsx",
```

- [ ] **Step 7: Run the contract test to verify it passes**

Run: `npx vitest run src/design/__tests__/primitives-contract.test.ts`
Expected: PASS. (This will fail at this step if `ToolsMegaMenu.tsx` is not yet exported from `src/design/primitives/index.ts` — that export is added in Task 3 alongside `SiteHeader`'s wiring; if this test fails here on a missing-export assertion, skip ahead to confirm Task 3's barrel export first, then return.)

- [ ] **Step 8: Commit**

```bash
git add src/design/chrome/ToolsMegaMenu.tsx src/design/__tests__/ToolsMegaMenu.test.tsx src/design/__tests__/primitives-contract.test.ts
git commit -m "feat(chrome): add registry-driven hover mega-menu component"
```

---

### Task 3: Wire `ToolsMegaMenu` into `SiteHeader`

**Files:**
- Modify: `src/design/chrome/SiteHeader.tsx`
- Modify: `src/design/__tests__/SiteHeader.test.tsx`
- Modify: `src/design/primitives/index.ts`
- Modify: `src/design/chrome/chrome.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `ToolsMegaMenu` from Task 2 (`{ triggerLabel, triggerHref }` props).
- Produces: `SiteHeader`'s `links` prop item shape gains an optional field so callers can opt one link into the mega-menu: `type LinkItem = { href: string; label: string; megaMenu?: boolean }`. Later tasks do not depend on this — it is `layout.tsx`'s wiring only.

**Design:** In the nav's `links.map(...)` (currently `SiteHeader.tsx:450-504`), render `<ToolsMegaMenu triggerLabel={link.label} triggerHref={link.href} />` when `link.megaMenu` is true, else the existing plain `<Link>`. This only changes the desktop inline row; the mobile collapsed panel (below 600px) keeps rendering every link as a plain `<Link>` regardless of `megaMenu` — a mega-menu inside an already-modal mobile panel would nest two disclosures, so on narrow viewports the item just links straight to `/tools`. Implement this by rendering the mega-menu only when the item is not inside the mobile panel: since both live in the *same* `<nav>` (per `SiteHeader`'s single-landmark constraint), the simplest correct approach is to keep the mega-menu itself hidden via `chrome.css` under the same `(max-width: 600px)` query `SiteHeader.tsx` already names in `COLLAPSED`, and render a plain fallback `<Link>` beside it that is hidden above 600px — mirroring the existing "one nav, CSS decides which control is visible" pattern already used for the toggle.

- [ ] **Step 1: Write the failing test**

Add to `src/design/__tests__/SiteHeader.test.tsx`, inside the `describe("SiteHeader", ...)` block:

```tsx
it("renders a mega-menu trigger instead of a plain link for a megaMenu item", () => {
	const links = [
		{ href: "/tools", label: "Tools", megaMenu: true },
		{ href: "/blog", label: "Blog" },
	];
	render(<SiteHeader links={links} cta={CTA} />);

	const trigger = screen.getByRole("link", { name: "Tools" });
	expect(trigger.getAttribute("aria-expanded")).toBe("false");
	expect(screen.getByRole("link", { name: "Blog" })).toBeDefined();
});
```

Update the `LINKS` fixture's type usage is unaffected (plain links still work with no `megaMenu` field), so no other existing test needs editing.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/design/__tests__/SiteHeader.test.tsx -t "renders a mega-menu trigger"`
Expected: FAIL — `aria-expanded` is not present on a plain `<Link>` (or the test throws because `megaMenu` is not a recognized prop yet, harmless either way, but the assertion must fail).

- [ ] **Step 3: Update `LinkItem` and the render branch in `SiteHeader.tsx`**

In `src/design/chrome/SiteHeader.tsx`, change the type at the top (currently line 6):

```tsx
type LinkItem = { href: string; label: string; megaMenu?: boolean };
```

Add the import (near the top, with the other imports):

```tsx
import { ToolsMegaMenu } from "./ToolsMegaMenu";
```

Replace the `links.map` block (currently lines 450-504) with:

```tsx
				{links.map((link) =>
					link.megaMenu ? (
						<ToolsMegaMenu
							key={link.href}
							triggerLabel={link.label}
							triggerHref={link.href}
						/>
					) : (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => {
								if (!open) return;
								close();
							}}
							style={{
								display: "inline-flex",
								alignItems: "center",
								flexShrink: 0,
								height: "23px",
								padding: "0 14px",
								background: "transparent",
								color: "var(--ink)",
								borderRadius: "var(--radius-control)",
								fontSize: "var(--label-size)",
								letterSpacing: "var(--label-tracking)",
								fontWeight: "var(--label-weight)",
								whiteSpace: "nowrap",
							}}
						>
							{link.label}
						</Link>
					),
				)}
```

- [ ] **Step 4: Hide the mega-menu panel and show a plain link inside the mobile collapsed panel**

Append to `src/design/chrome/chrome.css`:

```css
/*
 * `ToolsMegaMenu` is a desktop-only affordance: below 600px its trigger
 * lives inside `SiteHeader`'s own collapsed panel, which is already a
 * full-viewport disclosure -- nesting a second one inside it would trap
 * focus two layers deep for no reason. The trigger keeps working as a
 * plain navigation link there; only the hover/focus panel is suppressed.
 */
@media (max-width: 600px) {
	[data-mega-menu] {
		display: none !important;
	}
}
```

- [ ] **Step 5: Export `ToolsMegaMenu` from the primitives barrel**

In `src/design/primitives/index.ts`, add after `SiteHeader`:

```ts
export { ToolsMegaMenu } from "../chrome/ToolsMegaMenu";
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/design/__tests__/SiteHeader.test.tsx src/design/__tests__/primitives-contract.test.ts src/design/__tests__/ToolsMegaMenu.test.tsx`
Expected: PASS, all files.

- [ ] **Step 7: Wire the "Tools" nav item to the mega-menu in `layout.tsx`**

In `src/app/layout.tsx`, change the `NAV` entry for Tools (currently `{ href: "/tools", label: "Tools" }`):

```ts
	{ href: "/tools", label: "Tools", megaMenu: true },
```

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions in `src/app/__tests__/layout.test.tsx` or elsewhere. If `layout.test.tsx` asserts the exact `NAV` array shape (e.g. via deep equality), update that one assertion to include `megaMenu: true` on the Tools entry — this is expected and not a regression.

- [ ] **Step 9: Commit**

```bash
git add src/design/chrome/SiteHeader.tsx src/design/chrome/chrome.css \
  src/design/primitives/index.ts src/design/__tests__/SiteHeader.test.tsx \
  src/app/layout.tsx src/app/__tests__/layout.test.tsx
git commit -m "feat(chrome): mount the tools mega-menu on the site header's Tools nav item"
```

---

### Task 4: `GroupGrid` — 2D card grid with single-open expand/collapse

**Files:**
- Create: `src/design/families/GroupGrid.tsx`
- Create: `src/design/__tests__/GroupGrid.test.tsx`
- Modify: `src/design/families/index.ts`
- Modify: `src/design/families/families.css`

**Interfaces:**
- Produces: `export type GroupGridItem = { href: string; title: string; meta?: string; description?: string; tools: { href: string; title: string }[] }` and `export function GroupGrid({ items }: { items: GroupGridItem[] }): JSX.Element`. Task 5 constructs `GroupGridItem[]` from `deriveFormatGroups()`/`deriveTaskGroups()`.
- Consumes: nothing beyond React and `next/link` — no registry import here, so this stays a presentational family (registry derivation is the route's job, matching every other family in `src/design/families`).

**Design:** A CSS grid (`display: grid`, `gridTemplateColumns: repeat(var(--grid-cols), minmax(0, 1fr))`, mirroring `FeatureGrid`'s pattern) of bordered cells, one per `GroupGridItem`. Each cell is a `<button>` (not a link — it toggles expansion, matching how `SiteHeader`'s own toggle is a `<button>` for the same "controls local UI state" reason) showing `title`, `meta`, and `description`. Clicking a cell toggles its expansion; opening one collapses any other that was open (single `openHref` state, not a set). An expanded cell renders an inline list of `tools` links plus a "View all →" link to `item.href`. `--grid-cols` defaults to 3 via the same `:root` custom property `FeatureGrid` already relies on — no new token needed — and collapses at the same 900px/600px breakpoints via a `data-group-grid` selector in `families.css`, mirroring `FeatureGrid`'s existing breakpoint rules exactly (2 columns 601-900px, 1 column at 600px and below).

- [ ] **Step 1: Write the failing test file**

Create `src/design/__tests__/GroupGrid.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GroupGrid } from "@/design/families/GroupGrid";

const ITEMS = [
	{
		href: "/groups/format/png",
		title: "PNG",
		meta: "3 tools",
		description: "image",
		tools: [
			{ href: "/png-to-webp", title: "PNG to WebP" },
			{ href: "/png-to-jpg", title: "PNG to JPG" },
		],
	},
	{
		href: "/groups/format/mp4",
		title: "MP4",
		meta: "2 tools",
		description: "video",
		tools: [{ href: "/mp4-to-webm", title: "MP4 to WebM" }],
	},
];

describe("GroupGrid", () => {
	it("renders one cell per group with its title and meta", () => {
		render(<GroupGrid items={ITEMS} />);
		expect(screen.getByRole("button", { name: /PNG/ })).toBeDefined();
		expect(screen.getByRole("button", { name: /MP4/ })).toBeDefined();
	});

	it("is a real 2D grid, not a stack", () => {
		const { container } = render(<GroupGrid items={ITEMS} />);
		const grid = container.querySelector("[data-group-grid]") as HTMLElement;
		expect(grid.style.display).toBe("grid");
	});

	it("expands a cell's tools on click and lists them", () => {
		render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));

		const panel = screen.getByRole("region", { name: /PNG/ });
		expect(within(panel).getByRole("link", { name: "PNG to WebP" })).toBeDefined();
		expect(within(panel).getByRole("link", { name: "PNG to JPG" })).toBeDefined();
		expect(within(panel).getByRole("link", { name: /View all/i }).getAttribute("href")).toBe(
			"/groups/format/png",
		);
	});

	it("collapses any other open cell when a new one is opened", () => {
		render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));
		expect(screen.getByRole("region", { name: /PNG/ })).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: /MP4/ }));

		expect(screen.queryByRole("region", { name: /PNG/ })).toBeNull();
		expect(screen.getByRole("region", { name: /MP4/ })).toBeDefined();
	});

	it("collapses the open cell when it is clicked again", () => {
		render(<GroupGrid items={ITEMS} />);
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));
		fireEvent.click(screen.getByRole("button", { name: /PNG/ }));
		expect(screen.queryByRole("region", { name: /PNG/ })).toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/design/__tests__/GroupGrid.test.tsx`
Expected: FAIL — `Cannot find module '@/design/families/GroupGrid'`.

- [ ] **Step 3: Write `GroupGrid`**

Create `src/design/families/GroupGrid.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export type GroupGridItem = {
	href: string;
	title: string;
	meta?: string;
	description?: string;
	tools: { href: string; title: string }[];
};

type Props = {
	items: GroupGridItem[];
};

/**
 * `/groups`' card grid: the 2D replacement for `ListingRows`' single ruled
 * list, so a reader sees distinct groups laid out in space rather than one
 * flat stack. One cell is open at a time -- `openHref` is a single value,
 * not a set -- so expanding a second group visibly replaces the first
 * rather than piling panels on top of each other.
 *
 * Registry derivation stays out of this file, same as every sibling family:
 * the route (`/groups/page.tsx`) builds `GroupGridItem[]` from
 * `deriveFormatGroups()`/`deriveTaskGroups()` and hands it over as data.
 */
export function GroupGrid({ items }: Props) {
	const [openHref, setOpenHref] = useState<string | null>(null);

	return (
		<div
			data-group-grid
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(var(--grid-cols), minmax(0, 1fr))",
				gap: "var(--gap-sm)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{items.map((item) => {
				const isOpen = openHref === item.href;
				return (
					<div
						key={item.href}
						style={{
							display: "flex",
							flexDirection: "column",
							gridColumn: isOpen ? "1 / -1" : undefined,
						}}
					>
						<button
							type="button"
							aria-expanded={isOpen}
							onClick={() => setOpenHref(isOpen ? null : item.href)}
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								gap: "var(--space-base)",
								padding: "var(--gap-sm)",
								textAlign: "left",
								background: "transparent",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								borderRadius: "var(--radius-card)",
								color: "var(--ink)",
							}}
						>
							<span
								style={{
									fontSize: "var(--label-size)",
									fontWeight: "var(--label-weight)",
									letterSpacing: "var(--label-tracking)",
								}}
							>
								{item.title}
							</span>
							{item.meta ? (
								<span className="mono" style={{ color: "var(--ink-muted)" }}>
									{item.meta}
								</span>
							) : null}
							{item.description ? (
								<span style={{ color: "var(--ink-muted)" }}>
									{item.description}
								</span>
							) : null}
						</button>

						{isOpen ? (
							<div
								role="region"
								aria-label={item.title}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "var(--space-base)",
									padding: "var(--gap-sm)",
									borderWidth: "0 var(--rule-width) var(--rule-width) var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									borderRadius: "0 0 var(--radius-card) var(--radius-card)",
								}}
							>
								{item.tools.map((tool) => (
									<Link
										key={tool.href}
										href={tool.href}
										style={{ color: "var(--ink)" }}
									>
										{tool.title}
									</Link>
								))}
								<Link
									href={item.href}
									className="mono"
									style={{ color: "var(--ink-muted)" }}
								>
									View all →
								</Link>
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/design/__tests__/GroupGrid.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the breakpoint rules to `families.css`**

Append to `src/design/families/families.css`:

```css
/*
 * `GroupGrid` collapses at the same widths `FeatureGrid` already does,
 * reusing the same `--grid-cols` custom property rather than inventing a
 * second one -- both grids share the same 3/2/1 column rhythm.
 */
@media (max-width: 900px) and (min-width: 601px) {
	[data-group-grid] {
		--grid-cols: 2;
	}
}

@media (max-width: 600px) {
	[data-group-grid] {
		--grid-cols: 1;
	}
}
```

- [ ] **Step 6: Export `GroupGrid` from the families barrel**

In `src/design/families/index.ts`, add (alphabetically, after `FusedHeadline`):

```ts
export { GroupGrid, type GroupGridItem } from "./GroupGrid";
```

- [ ] **Step 7: Add `GroupGrid.tsx` to the client-component allowlist**

In `src/design/__tests__/primitives-contract.test.ts`, add to `CLIENT_COMPONENT_ALLOWLIST`:

```ts
	// `GroupGrid` holds which single cell is expanded -- a server component
	// cannot hold that state. Every other family stays a server component;
	// this is the one family whose whole purpose is the expand/collapse
	// interaction the groups index needs.
	"GroupGrid.tsx",
```

- [ ] **Step 8: Run the full design-system test suite**

Run: `npx vitest run src/design/`
Expected: PASS, including `band-gutter.test.ts` (the grid declares `maxWidth: "var(--max-width)"` with no horizontal padding on that same object — confirm by inspection: the padding above is on inner `<button>`/`<div>` elements, not on the `data-group-grid` grid itself) and `primitives-contract.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/design/families/GroupGrid.tsx src/design/families/index.ts \
  src/design/families/families.css src/design/__tests__/GroupGrid.test.tsx \
  src/design/__tests__/primitives-contract.test.ts
git commit -m "feat(families): add GroupGrid, a 2D card grid with single-open expand/collapse"
```

---

### Task 5: Wire `GroupGrid` into `HubPage` and `/groups`

**Files:**
- Modify: `src/design/templates/HubPage.tsx`
- Modify: `src/design/__tests__/HubPage.test.tsx`
- Modify: `src/app/groups/page.tsx`

**Interfaces:**
- Consumes: `GroupGrid`/`GroupGridItem` from Task 4 (`@/design/families`).
- Produces: `HubPage` gains an optional `grid?: { heading?: string; items: GroupGridItem[] }[]` prop, parallel to the existing `sections` prop. Nothing later depends on this beyond `/groups/page.tsx` in this same task.

- [ ] **Step 1: Write the failing test**

Add to `src/design/__tests__/HubPage.test.tsx`:

```tsx
it("renders a GroupGrid section when given `grid` instead of `sections`", () => {
	render(
		<HubPage
			title="Browse by format or task"
			lede="x"
			grid={[
				{
					heading: "BY FORMAT",
					items: [
						{
							href: "/groups/format/png",
							title: "PNG",
							meta: "3 tools",
							tools: [{ href: "/png-to-webp", title: "PNG to WebP" }],
						},
					],
				},
			]}
		/>,
	);
	expect(screen.getByText("BY FORMAT")).toBeDefined();
	expect(screen.getByRole("button", { name: /PNG/ })).toBeDefined();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/design/__tests__/HubPage.test.tsx -t "GroupGrid section"`
Expected: FAIL — `grid` is not a recognized prop and nothing renders.

- [ ] **Step 3: Add the `grid` prop to `HubPage`**

In `src/design/templates/HubPage.tsx`, add the import:

```tsx
import {
	BranchDiagram,
	FusedHeadline,
	GroupGrid,
	type GroupGridItem,
	type ListingItem,
	ListingRows,
} from "@/design/families";
```

Add to the `Props` type (after `sections?: ListingSection[];`):

```tsx
	/**
	 * The 2D-grid alternative to `sections` -- `/groups` uses this instead
	 * of `sections`/`ListingRows` so its two dimensions (format, task) read
	 * as distinct groups in space rather than one flat ruled list. A hub
	 * passes one or the other, never both.
	 */
	grid?: { heading?: string; items: GroupGridItem[] }[];
```

Add the render block (after the `sections?.map(...)` block, before `{children}`):

```tsx
			{grid?.map((section) => (
				<div
					key={section.heading ?? "grid"}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					{section.heading ? (
						<p className="meta" style={{ color: "var(--ink-muted)" }}>
							{section.heading}
						</p>
					) : null}
					<GroupGrid items={section.items} />
				</div>
			))}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/design/__tests__/HubPage.test.tsx`
Expected: PASS, all cases including the new one and the four pre-existing ones.

- [ ] **Step 5: Switch `/groups/page.tsx` from `sections` to `grid`**

In `src/app/groups/page.tsx`, replace the `sections` prop passed to `<HubPage>` with `grid`, reusing the same `formatGroups`/`taskGroups` data and the existing `label`/`toolCount`/`categoriesSpanned` helpers already defined in that file:

```tsx
			grid={[
				{
					heading: "BY FORMAT",
					items: formatGroups.map((group) => ({
						href: `/groups/format/${group.format}`,
						title: group.format.toUpperCase(),
						meta: toolCount(group.tools),
						description: categoriesSpanned(group.tools).join(", "),
						tools: group.tools.map((tool) => ({
							href: `/${tool.id}`,
							title: tool.seo.title,
						})),
					})),
				},
				{
					heading: "BY TASK",
					items: taskGroups.map((group) => ({
						href: `/groups/task/${group.kind}`,
						title: label(group.kind),
						meta: toolCount(group.tools),
						description: categoriesSpanned(group.tools).join(", "),
						tools: group.tools.map((tool) => ({
							href: `/${tool.id}`,
							title: tool.seo.title,
						})),
					})),
				},
			]}
```

- [ ] **Step 6: Confirm `route-purity.test.ts` still passes**

Run: `npx vitest run src/app/__tests__/route-purity.test.ts`
Expected: PASS — `/groups/page.tsx` still imports only from `@/design/templates` (via `HubPage`), not from `@/design/families` directly; `GroupGrid` is composed inside `HubPage`, not inside the route.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, all files. If any snapshot or exact-text test elsewhere asserts on `/groups`' rendered markup (e.g. an e2e or route-shape test expecting `[data-listing-rows]` on that specific route), update it to expect `[data-group-grid]` instead — this is the intended visual change.

- [ ] **Step 8: Manually verify the route**

Run: `npm run dev` and visit `http://localhost:3000/groups`. Confirm: groups render as a grid (not a single column) at desktop width, clicking a group expands it inline showing its tools plus a "View all" link, and clicking a second group collapses the first.

- [ ] **Step 9: Commit**

```bash
git add src/design/templates/HubPage.tsx src/design/__tests__/HubPage.test.tsx src/app/groups/page.tsx
git commit -m "feat(groups): replace the linear group list with an expandable 2D grid"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (master converter review/finish) → Task 1. §2 (mega-menu) → Tasks 2-3. §3 (groups grid) → Tasks 4-5. §4 (SSOT) → satisfied throughout: `ToolsMegaMenu` reads `deriveTaskGroups()` directly, `GroupGrid` stays a pure presentational consumer fed by the route from the same registry derivations `/groups` already used. §5 (testing) → each task's own test file, plus full-suite runs at Task 3 Step 8, Task 4 Step 8, and Task 5 Step 7.
- **Placeholder scan:** no TBD/TODO; every step carries real code or an exact command.
- **Type consistency:** `LinkItem` (`SiteHeader.tsx`) gains `megaMenu?: boolean`, consumed identically in Task 3's render branch. `GroupGridItem` is defined once in Task 4 and reused verbatim in Task 5's `HubPage` prop and `/groups/page.tsx`'s construction. `ToolsMegaMenu`'s props (`triggerLabel`, `triggerHref`) match between its Task 2 definition and Task 3's call site.
