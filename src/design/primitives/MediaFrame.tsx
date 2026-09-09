import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

/**
 * v2's media treatment: the image fades into the canvas on an angle, as a
 * resting state rather than a hover reveal.
 *
 * This replaces the previous system's grayscale-until-hover entirely. That
 * mechanism existed because DESIGN.md rationed colour to a single
 * interaction — v2 does not ration it that way, so the image is simply
 * present, dissolving into the ground at its trailing edge instead of
 * ending on a hard rectangle.
 *
 * The mask is declared here rather than in the stylesheet because the angle
 * is the component's defining property and belongs where a reader looks
 * first. `-webkit-mask-image` rides alongside for Safari, which still
 * requires the prefix for mask shorthand.
 *
 * `flex: 1` plus `minHeight: 0` is this component's own sizing, not left to
 * whatever wraps it (C1): its one caller, `LiveDemo`, nests it in a flex
 * column alongside a label and a button/readout row, all inside a card
 * `AsymCard` gives a fixed total height via `aspect-ratio`. Before this,
 * `[data-media]` carried no size of its own at all -- a flex item with no
 * `flex-basis`/`flex-grow` sizes to its own content, and this element's only
 * content was a child stretched to `height: 100%` of *it*, so the pair
 * collapsed to zero (measured: `getBoundingClientRect()` returning
 * `{width: 1200, height: 0}`). `flex: 1` gives it the remaining share of the
 * card's fixed height instead, which is what makes `height: 100%` on its
 * child resolve to something real. `minHeight: 0` overrides the flex default
 * of `min-height: auto`, which would otherwise let this item's own content
 * (an `<img>`'s intrinsic size once a demo produces one) push the card
 * taller than the fixed aspect ratio the card declares -- the disagreement
 * that made a produced result balloon into an oversized, disproportionate
 * card. Sized this way, the media area always fills exactly its share of
 * the fixed-height card, whatever it is showing.
 */
export function MediaFrame({ children }: Props) {
	const mask = "linear-gradient(160deg, #000 55%, transparent 100%)";

	return (
		<div
			data-media
			style={{
				flex: "1 1 0%",
				minHeight: 0,
				maskImage: mask,
				WebkitMaskImage: mask,
			}}
		>
			{children}
		</div>
	);
}
