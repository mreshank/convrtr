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
 */
export function Marquee({ children, ariaLabel }: Props) {
	const track = (duplicate: boolean) => (
		<div
			data-marquee
			aria-hidden={duplicate ? "true" : undefined}
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
