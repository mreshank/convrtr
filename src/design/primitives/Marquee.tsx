import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Names the region. The duplicated track is hidden, so this is said once. */
	ariaLabel: string;
};

/**
 * DESIGN.md's continuous scroll: full-bleed, 30s linear, pausing on hover.
 *
 * Two identical tracks run side by side. When the first has travelled its
 * own width the second sits exactly where the first began, so the loop has
 * no seam — one track would visibly snap back.
 *
 * `data-marquee` goes on the TRACKS, not the container, and that placement
 * is load-bearing. `globals.css` pauses reduced motion with
 * `[data-marquee] { animation-play-state: paused }`, and that rule affects
 * only the element it matches. On the container it would match an element
 * with no animation and quietly do nothing.
 *
 * The second track is decorative repetition, so it leaves the
 * accessibility tree and the region is named once.
 *
 * `inert` goes on alongside `aria-hidden`, and it is not redundant with it.
 * The duplicate renders the SAME children as the original, so anything
 * focusable a caller passes in — spec §8.4's showcase cards link to their
 * converters — exists twice. A focusable element inside an `aria-hidden`
 * subtree is a WCAG 4.1.2 failure: the keyboard user tabs into a control
 * the screen reader will not announce, and then does it again on the copy.
 * `aria-hidden` cannot remove anything from the tab order; `inert` can, and
 * doing so also settles the duplicated-DOM-id question for every case where
 * a duplicated id could have been reached.
 */
export function Marquee({ children, ariaLabel }: Props) {
	const track = (duplicate: boolean) => (
		<div
			data-marquee
			aria-hidden={duplicate ? "true" : undefined}
			inert={duplicate}
			style={{
				display: "flex",
				flexShrink: 0,
				animationName: "marquee-scroll",
				animationDuration: "var(--dur-marquee)",
				animationTimingFunction: "linear",
				animationIterationCount: "infinite",
			}}
		>
			{children}
		</div>
	);

	return (
		<section
			aria-label={ariaLabel}
			data-marquee-viewport
			style={{ display: "flex", overflow: "hidden", width: "100%" }}
		>
			{track(false)}
			{track(true)}
		</section>
	);
}
