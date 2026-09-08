import Link from "next/link";

type LinkItem = { href: string; label: string };

type Props = {
	links: LinkItem[];
	cta: LinkItem;
};

/**
 * v2's navbar (`DESIGN.v2.md:137`): edge-to-edge, 64px tall, sticky, filled
 * `--ground`, square on all four corners, with the wordmark left and the nav
 * plus a white pill CTA right.
 *
 * **Inline, not an overlay.** v2 observes ~36 interactive items in this bar
 * because its source is a developer platform with a product surface that
 * size; what v2 *specifies* is the bar — height, fill, corners, stickiness,
 * and the logo/nav/log-in/CTA arrangement inside it. This component's
 * contract is a flat `links` array, so there are no groups to hang dropdowns
 * off and a handful of items to place, which fit inline at 16px labels. So
 * the nav sits in the bar and covers nothing.
 *
 * That is the whole reason this file is a server component. The previous
 * header opened an opaque full-viewport overlay, which is why it owned open/
 * closed state, an Escape handler, a Tab trap across [wordmark, toggle,
 * ...links] and a body-scroll lock: focus and scroll must not reach content
 * the user cannot see. Nothing here covers anything, so all of it is gone
 * rather than carried along — a keydown handler trapping Tab on a page with
 * nothing to trap is worse than no handler at all. `SiteHeader` is therefore
 * off the `"use client"` allowlist in `primitives-contract.test.ts`, and
 * `SiteHeader.test.tsx` fails if a disclosure control reappears here, so
 * that decision has to be made again deliberately rather than by accident.
 *
 * Below roughly 600px the nav row scrolls horizontally rather than
 * collapsing behind a toggle. The alternative — a disclosure menu — is the
 * overlay again, with the containment cost above; a scrolling row keeps
 * every destination visible and keyboard-reachable (focus scrolls it into
 * view) and covers nothing.
 *
 * `--ink` and `--ground`, not the literals: v2's `navbar-cta` is white on
 * black, which is exactly what those two tokens already are. The old header
 * needed a literal white as the operand of `mix-blend-mode: difference` and
 * was exempted from the palette guard for it; the blend is gone, so the
 * exemption is gone with it.
 */
export function SiteHeader({ links, cta }: Props) {
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
			 * v2 puts a Log-in text link between the nav and the CTA. convrtr
			 * converts files in the browser and has no accounts, so there is
			 * no destination for one — inventing `/login` would ship a dead
			 * link. The nav items carry the text-link treatment instead, and
			 * the pill stays the bar's single filled control.
			 */}
			<nav
				aria-label="Main"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "var(--gap-sm)",
					marginLeft: "auto",
					// Together these make the nav the row's only shrinkable
					// part: it scrolls within itself on a narrow viewport
					// instead of squeezing the wordmark or the CTA.
					minWidth: 0,
					overflowX: "auto",
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
				{links.map((link) => (
					<Link
						key={link.href}
						href={link.href}
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
				))}
			</nav>

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
