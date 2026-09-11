"use client";

import Link from "next/link";
import {
	Fragment,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { ToolsMegaMenu } from "./ToolsMegaMenu";

type LinkItem = { href: string; label: string; megaMenu?: boolean };

type Props = {
	links: LinkItem[];
	cta: LinkItem;
	authSlot?: React.ReactNode;
};

/**
 * The viewport width below which the nav collapses behind the toggle.
 *
 * The same 600 `templates.css` already breaks the band rhythm at, expressed
 * here as a media query string because `matchMedia` is the only way JavaScript
 * can be told the layout changed. Written once and used once: the CSS side of
 * the same boundary lives in `chrome.css`, and the two are the same number by
 * inspection, not by mechanism — a token cannot be fed to `matchMedia`.
 */
const COLLAPSED = "(max-width: 600px)";

/**
 * v2's navbar (`DESIGN.v2.md:137`): edge-to-edge, 64px tall, sticky, filled
 * `--ground`, square on all four corners, with the wordmark left and the nav
 * plus a white pill CTA right.
 *
 * **Inline above 600px, a disclosure panel below it.** v2 observes ~36
 * interactive items in this bar because its source is a developer platform
 * with a product surface that size; what v2 *specifies* is the bar — height,
 * fill, corners, stickiness, and the logo/nav/log-in/CTA arrangement inside
 * it. This component's contract is a flat `links` array, so there are no
 * groups to hang dropdowns off and a handful of items to place, which fit
 * inline at 16px labels from 601px up. So on the desktop tier the nav sits in
 * the bar and covers nothing, exactly as before.
 *
 * Below that it did not fit, and the previous version of this comment said it
 * did. Measured on the real export at 375px: the nav's `scrollWidth` was 682
 * against a `clientWidth` of 59. Fifty-nine pixels for the whole nav — a user
 * saw the wordmark, a truncated "Tools", and the CTA. The horizontal scroll it
 * fell back to is still there and still the mechanism at 601-900px, where the
 * row overflows by a little; at 375px it was a 59px window onto 682px of
 * content, which is not a nav row, it is a hidden nav with no affordance.
 *
 * So the disclosure is back, deliberately, with the containment it costs
 * rather than without it. That cost is the whole reason it was refused the
 * first time and it is paid in full here:
 *
 * - open/closed state, and `"use client"` for it — `SiteHeader` is on the
 *   allowlist in `primitives-contract.test.ts` again, with the reason;
 * - `Escape` closes and returns focus to the toggle;
 * - Tab and Shift+Tab cycle inside [toggle, ...links] and reach nothing
 *   behind the panel;
 * - `<body>` scroll is locked while open and restored to its previous value
 *   on close and on unmount;
 * - every closing route — Escape, the toggle, following a link — puts focus
 *   back on the toggle;
 * - a `matchMedia` listener closes it when the viewport crosses back above
 *   600px, so a phone rotated to landscape cannot leave a focus trap running
 *   over an inline desktop row.
 *
 * The old trap this replaces had a guard that silently stopped intercepting
 * when `links` was empty, which is a trap that is not a trap. This one cannot:
 * the toggle is always the first element of the cycle, so an empty `links`
 * array traps Tab on the toggle itself rather than releasing it to the page.
 *
 * **One `<nav aria-label="Main">`, not two.** A second copy rendered for
 * mobile would duplicate the landmark and every link in the accessibility
 * tree at every width. The single nav is an inline row or a panel depending
 * on the viewport and on `data-open`, and the media queries that decide which
 * live in `chrome.css` — inline styles cannot express a media query, which is
 * the same reason `templates.css` exists.
 *
 * `--ink` and `--ground`, not the literals: v2's `navbar-cta` is white on
 * black, which is exactly what those two tokens already are. The old header
 * needed a literal white as the operand of `mix-blend-mode: difference` and
 * was exempted from the palette guard for it; the blend is gone, so the
 * exemption is gone with it. The panel is `--ground` for a second reason as
 * well: v2's guardrail (`DESIGN.v2.md:175`) rations mint to CTA pills, icon
 * glyphs and code tokens, and a full-viewport panel is the largest fill on the
 * site — the one place the accent must not go.
 */
export function SiteHeader({ links, cta, authSlot }: Props) {
	const [open, setOpen] = useState(false);
	const toggleRef = useRef<HTMLButtonElement>(null);
	const navRef = useRef<HTMLElement>(null);
	// `useId` rather than a constant string: `aria-controls` has to point at a
	// real, unique id, and nothing stops a second header from being rendered
	// (tests already render several into one document).
	const navId = useId();

	/**
	 * The single closing route. Every caller — Escape, the toggle, a link —
	 * goes through here, so "focus returns to the toggle" is one line that
	 * cannot be forgotten at one of three call sites.
	 */
	const close = useCallback(() => {
		setOpen(false);
		toggleRef.current?.focus();
	}, []);

	// Escape, and the Tab cycle. Bound to the document rather than to the
	// panel: focus can legitimately sit on the toggle, which is outside the
	// panel, and a panel-scoped listener would never see the keystroke there.
	useEffect(() => {
		if (!open) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				close();
				return;
			}
			if (event.key !== "Tab") return;
			const toggle = toggleRef.current;
			const nav = navRef.current;
			if (!toggle || !nav) return;
			// The cycle is the toggle plus whatever the panel holds. The
			// toggle belongs in it: it is the control that closes the panel,
			// so a keyboard user who tabs past the last link must arrive
			// somewhere they can get out from, and it is what makes the
			// no-links case still a trap.
			//
			// Note: this also picks up the CSS-hidden ToolsMegaMenu trigger
			// anchor on mobile (it's `display: none` there, not removed from
			// the DOM) -- harmless today since a hidden element can't take
			// focus, but worth knowing if that trigger ever becomes visible
			// at this breakpoint.
			const cycle: HTMLElement[] = [
				toggle,
				...nav.querySelectorAll<HTMLElement>("a[href]"),
			];
			const first = cycle[0];
			const last = cycle[cycle.length - 1];
			if (!first || !last) return;
			const active = document.activeElement as HTMLElement | null;
			const inside = active !== null && cycle.includes(active);
			if (event.shiftKey) {
				if (!inside || active === first) {
					event.preventDefault();
					last.focus();
				}
				return;
			}
			if (!inside || active === last) {
				event.preventDefault();
				first.focus();
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, close]);

	// Body scroll lock. The previous value is captured rather than assumed
	// empty, and restored by the cleanup — which React runs on close and on
	// unmount alike, so a header removed while open cannot leave the document
	// unscrollable.
	useEffect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	// The failure this exists for: open the panel at 375px, rotate to
	// landscape or drag the window wide, and `open` stays true over a nav that
	// CSS has already put back inline — a focus trap running on a desktop row,
	// with the page behind it unscrollable and no visible panel to explain
	// why. `matchMedia` on the same query `chrome.css` uses is the only way to
	// hear about that crossing.
	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const query = window.matchMedia(COLLAPSED);
		const sync = () => {
			if (!query.matches) setOpen(false);
		};
		// Read once as well as subscribing: a viewport that was already wide
		// at mount needs no listener to fire for this to be correct.
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	return (
		<header
			style={{
				position: "sticky",
				// `sticky` with no inset never sticks — it stays in flow and
				// scrolls away like any other block. This offset is the
				// mechanism, not a decoration.
				top: 0,
				zIndex: 100,
				// The rule below is part of the 64px, not an extra pixel on
				// top of it: `--navbar-height` is the number anything
				// offsetting itself under this bar will use, and a
				// content-box header would occupy 65 while claiming 64.
				boxSizing: "border-box",
				height: "var(--navbar-height)",
				background: "var(--ground)",
				color: "var(--ink)",
				// The bar and the canvas beneath it are the same black, so
				// without this there is nothing marking where the bar ends.
				//
				// Longhands rather than the `border-bottom` shorthand, the
				// same way `Hairline` writes its rule: a shorthand whose
				// parts are all `var()` cannot be reparsed into its
				// components, so it round-trips through the CSSOM as
				// `var(--rule) var(--rule) var(--rule)` and no test can
				// assert on it.
				borderBottomWidth: "var(--rule-width)",
				borderBottomStyle: "solid",
				borderBottomColor: "var(--rule)",
				padding: "0 var(--gap-md)",
				display: "flex",
				alignItems: "center",
				gap: "var(--gap-md)",
			}}
		>
			{/*
			 * The one lockup v2's type scale does not cover — its own logo is
			 * an image. It takes the label metrics rather than introducing a
			 * size, and the bold weight of v2's bold-clause headline pattern,
			 * which is what separates it from the label-weight nav items
			 * beside it.
			 */}
			<Link
				href="/"
				style={{
					flexShrink: 0,
					fontSize: "var(--label-size)",
					letterSpacing: "var(--label-tracking)",
					fontWeight: 700,
				}}
			>
				convrtr
			</Link>

			{/*
			 * The disclosure control. It carries NO `display` of its own, and
			 * that is deliberate: `chrome.css` hides it by default and reveals
			 * it only under the collapsed query, so an inline `display` here
			 * would out-rank the media query and need `!important` to beat —
			 * and the failure mode of the stylesheet not loading at all is the
			 * toggle staying hidden beside a nav that is still an inline row,
			 * which is the old behaviour rather than a broken one.
			 *
			 * 44px because that is the minimum touch target, and this control
			 * exists only on touch-sized viewports. The 4px radius is v2's
			 * nav-utility value, shared with the links it opens — and on a
			 * transparent control it is visible only as the corner of the
			 * global focus ring, which takes an element's own radius grown by
			 * its offset.
			 */}
			<button
				ref={toggleRef}
				type="button"
				data-site-nav-toggle
				aria-expanded={open}
				aria-controls={navId}
				onClick={() => {
					if (open) {
						close();
						return;
					}
					setOpen(true);
				}}
				style={{
					// No `display` — see above.
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
					width: "44px",
					height: "44px",
					padding: 0,
					background: "transparent",
					color: "var(--ink)",
					border: "none",
					borderRadius: "var(--radius-control)",
				}}
			>
				{/*
				 * Drawn in `currentColor` for the reason `ArrowUpRight` gives:
				 * it then follows whatever ground it is placed on. Decorative
				 * and hidden — the button's own accessible name below says
				 * what it does, and `aria-expanded` says which state it is in,
				 * so a glyph announced alongside them would only repeat them.
				 */}
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					aria-hidden="true"
				>
					{open ? (
						<path
							d="M6 6 L18 18 M18 6 L6 18"
							stroke="currentColor"
							strokeWidth="1"
						/>
					) : (
						<path
							d="M4 7 H20 M4 12 H20 M4 17 H20"
							stroke="currentColor"
							strokeWidth="1"
						/>
					)}
				</svg>
				{/*
				 * The accessible name. A visually-hidden span rather than
				 * `aria-label`, so it is real text a translation layer can
				 * reach — and "Menu" is a description of this control, not a
				 * claim about the product, so it needs no file to make it
				 * true.
				 */}
				<span
					style={{
						position: "absolute",
						width: "1px",
						height: "1px",
						overflow: "hidden",
						clipPath: "inset(50%)",
						whiteSpace: "nowrap",
					}}
				>
					Menu
				</span>
			</button>

			{/*
			 * v2 puts a Log-in text link between the nav and the CTA. convrtr
			 * converts files in the browser and has no accounts, so there is
			 * no destination for one — inventing `/login` would ship a dead
			 * link. The nav items carry the text-link treatment instead, and
			 * the pill stays the bar's single filled control.
			 *
			 * ONE nav, at every width. `data-site-nav` and `data-open` are
			 * what `chrome.css` restyles it through, from this inline row into
			 * a fixed panel below 600px; there is deliberately no second copy
			 * of the landmark or of the links for a narrow viewport.
			 */}
			<nav
				ref={navRef}
				id={navId}
				aria-label="Main"
				data-site-nav
				data-open={open ? "" : undefined}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "var(--gap-sm)",
					marginLeft: "auto",
					// Together these make the nav the row's only shrinkable
					// part: it scrolls within itself on a narrow viewport
					// instead of squeezing the wordmark or the CTA. As the
					// panel they are what lets a long list scroll inside it.
					minWidth: 0,
					overflowX: "auto",
					/*
					 * The signal that this row scrolls, added without a disclosure
					 * and without touching the focus-ring fix below it.
					 *
					 * A `mask-image` fade was the first shape tried and rejected:
					 * masking the scroll container fades its own painted pixels,
					 * ring included, and the ring for the last link sits inside
					 * the same few pixels a fade needs to occupy to read as a
					 * fade at all -- there is no width that hides the cut-off
					 * text without also dimming the exact ring the padding below
					 * was added to keep visible.
					 *
					 * This is the two-layer background trick instead, the
					 * standard CSS-only "scroll shadow": a cover layer (`local`
					 * attachment) travels WITH the scrolled content, glued to its
					 * true trailing edge; the tint (`scroll` attachment, the
					 * default) stays fixed to the row's own right edge. Both are
					 * background layers, painted BEHIND the links and their ring,
					 * so neither ever dims a foreground pixel -- only the flat
					 * black behind it. At rest, or once scrolled all the way to
					 * the last link, the cover sits exactly on top of the tint and
					 * hides it -- nothing shows when there is nothing to show. The
					 * moment content extends past the visible row the cover slides
					 * right along with it, uncovering the `--ink-muted` tint
					 * underneath: the signal appears exactly when, and only when,
					 * something is actually cut off. No JS, no scroll listener,
					 * and the left edge is left alone -- scrolled to the start
					 * there is nothing hidden behind the first link for a matching
					 * left-edge fade to ever earn.
					 *
					 * The cover is FLAT `--ground`, not a gradient to transparent,
					 * and that is the whole difference between this working and
					 * not. A cover that fades cannot hide an opaque tint beneath
					 * it: 6px in from the right edge a 24px fade is ~75% opaque
					 * over a 12px tint that is still ~50% opaque, which composites
					 * to a visible grey smudge. Measured on the built export, the
					 * fading cover left a grey bar painted at 1280px where the nav
					 * does not overflow at all (`scrollWidth === clientWidth ===
					 * 682`) -- a permanent artifact beside the last link rather
					 * than a scroll signal. Flat cover, and the two layers are the
					 * same width so the cover spans every pixel the tint paints.
					 *
					 * Both layers are switched off in the panel, by `chrome.css`,
					 * and they have to be: a vertical list of links inside a
					 * full-height panel is not a row that scrolls sideways, so a
					 * right-edge cut-off tint there would signal something that
					 * cannot happen.
					 */
					backgroundImage: [
						"linear-gradient(var(--ground), var(--ground))",
						"linear-gradient(to left, var(--ink-muted), transparent)",
					].join(", "),
					backgroundRepeat: "no-repeat",
					backgroundPosition: "right, right",
					backgroundSize: "var(--gap-sm) 100%, var(--gap-sm) 100%",
					backgroundAttachment: "local, scroll",
					// Standoff for the focus ring, and it is load-bearing.
					// `overflow-x: auto` cannot be scoped to one axis: the
					// other computes to `auto` alongside it, so this element
					// is a clipping box on all four sides. The links were
					// exactly as tall as the row and the outermost two sat
					// flush against its ends, so the global `:focus-visible`
					// ring — 1px at `outline-offset: 2px`, i.e. 2-3px outside
					// the control — had nowhere to land. Measured on the real
					// export, ring pixels in the 1-4px annulus, as
					// top/bottom/left/right: the first nav link went 0/0/0/29
					// -> 73/75/31/31 and the last 0/1/28/0 -> 77/81/29/31,
					// against 75/75/31/31 for a control with these exact
					// styles rendered outside the nav. Before this line a
					// keyboard user saw one stray hairline; after it, a ring
					// on all four sides, at 1280px and at 420px where the row
					// really does scroll.
					//
					// `--space-base` rather than the 3px the ring strictly
					// needs: it is the scale's own unit, and 23 + 16 leaves
					// the nav 39px inside a 64px bar, with room to grow again
					// if a horizontal scrollbar appears.
					//
					// It is load-bearing in the panel too, where the same
					// clipping box now has a column of links in it and the
					// first and last of them would otherwise sit flush against
					// its ends.
					//
					// Longhands rather than the `padding` shorthand, for the
					// reason the bottom border above is written out: a
					// shorthand whose parts are all `var()` does not reparse
					// into its components, so it round-trips through the
					// CSSOM as the shorthand alone and no test can assert on
					// a side.
					paddingTop: "var(--space-base)",
					paddingRight: "var(--space-base)",
					paddingBottom: "var(--space-base)",
					paddingLeft: "var(--space-base)",
				}}
			>
				{links.map((link) =>
					link.megaMenu ? (
						<Fragment key={link.href}>
							{/*
							 * Desktop trigger: `ToolsMegaMenu`'s own hover/focus
							 * disclosure. Its own `<Link>` `preventDefault()`s every
							 * click to toggle the panel instead of navigating, which
							 * is correct above 600px but would be a dead tap target
							 * below it once `chrome.css` hides the panel this same
							 * click is meant to open. `display: contents` keeps the
							 * wrapper out of the flex layout `ToolsMegaMenu`'s own
							 * root already participates in.
							 */}
							<span data-mega-menu-trigger style={{ display: "contents" }}>
								<ToolsMegaMenu
									triggerLabel={link.label}
									triggerHref={link.href}
								/>
							</span>
							{/*
							 * Mobile fallback: a real, navigable `<Link>` for the
							 * same destination, styled like every other nav-utility
							 * control. `chrome.css` shows this one only below 600px
							 * and hides the trigger above -- the same "always render
							 * both, let CSS decide" pattern this file already uses
							 * for its own hamburger toggle.
							 */}
							<Link
								href={link.href}
								data-mega-menu-fallback
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
						</Fragment>
					) : (
						<Link
							key={link.href}
							href={link.href}
							// Following a link closes the panel. Without this the
							// menu stays open over the page it just navigated to,
							// because a client-side route change never unmounts
							// this component. Guarded on `open` so a mouse click
							// on the inline desktop row does not pull focus off
							// the link and onto a hidden button.
							onClick={() => {
								if (!open) return;
								close();
							}}
							style={{
								display: "inline-flex",
								alignItems: "center",
								flexShrink: 0,
								// v2's nav-utility control: transparent fill,
								// white text, 4px radius, 23px tall, 0/14px
								// padding. The radius is not dead on a
								// transparent control: the global
								// `:focus-visible` outline is the only thing that
								// ever draws this control's shape, and an outline
								// takes its corner radius from the element's own,
								// grown by the offset — 4px here plus 2px of
								// offset, so what a keyboard user sees is a 6px
								// corner derived from this 4px value. Change the
								// radius and the ring's corner changes with it.
								// The ring is only visible at all because the nav
								// above reserves vertical room for it.
								//
								// The panel reuses this treatment unchanged, per
								// the closed design system: it is v2's one
								// nav-utility control, and a second, taller
								// variant invented for the panel would be a
								// component the spec does not have. `chrome.css`
								// stretches it across the panel's width so the
								// tap target is the full row, which changes the
								// cross-size of the flex item and none of the
								// values here.
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
			</nav>

			{authSlot}

			{/* v2's `navbar-cta`: white fill, black text, pill corners, 36px. */}
			<Link
				href={cta.href}
				// The same hook `HeroBand`'s primary pill carries, for the same
				// reason: this is the identical shape -- a white-filled pill on
				// the black canvas -- and the global focus ring is `1px solid
				// var(--ink)`, i.e. the pill's own fill colour. One rule in
				// `families.css` covers both rather than each growing its own,
				// and this instance matters more than the hero's because
				// `layout.tsx` mounts this bar on every route.
				//
				// Measured on the real export before this attribute: the ring
				// was drawn OUTSIDE the pill (`outline-offset: 2px`), so its
				// true neighbours were the black page on both sides at 18.93:1
				// and 17.74:1 -- visible, but as a 1px white hairline hemmed
				// against a large white pill by 2px of gap, reading as part of
				// the pill's own silhouette rather than as an indicator. The
				// ring-versus-fill figure of 1:1 that Task 5 recorded is a real
				// number about a pair that never touch. With the attribute the
				// ring is `--ground` at `outline-offset: -3px`, stamped inside
				// the fill, where its neighbours on both sides are the white
				// pill itself -- an unambiguous dark ring on a light field.
				data-cta-fill
				style={{
					display: "inline-flex",
					alignItems: "center",
					flexShrink: 0,
					height: "36px",
					padding: "0 var(--gap-md)",
					background: "var(--ink)",
					color: "var(--ground)",
					borderRadius: "var(--radius-pill)",
					fontSize: "var(--label-size)",
					letterSpacing: "var(--label-tracking)",
					fontWeight: "var(--label-weight)",
					whiteSpace: "nowrap",
				}}
			>
				{cta.label}
			</Link>
		</header>
	);
}
