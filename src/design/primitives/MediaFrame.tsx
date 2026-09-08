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
 */
export function MediaFrame({ children }: Props) {
	const mask = "linear-gradient(160deg, #000 55%, transparent 100%)";

	return (
		<div
			data-media
			style={{
				maskImage: mask,
				WebkitMaskImage: mask,
			}}
		>
			{children}
		</div>
	);
}
