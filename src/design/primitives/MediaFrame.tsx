import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
};

/**
 * The only element in the system permitted to show colour.
 *
 * DESIGN.md's Special Notes are absolute: "any colour should only come from
 * project photography." This frame holds that line by desaturating its
 * contents completely at rest and restoring them on hover — so colour is
 * never a design decision, only an image being seen properly.
 *
 * The hover rule and the reduced-motion exception both live in
 * `primitives.css`, because neither a descendant `:hover` nor a media query
 * can be expressed in a React style object.
 */
export function MediaFrame({ children }: Props) {
	return (
		<div
			data-media
			style={{
				filter: "grayscale(100%)",
				transitionProperty: "filter, transform",
				transitionDuration: "var(--dur-hover)",
				transitionTimingFunction: "var(--ease)",
				willChange: "filter, transform",
			}}
		>
			{children}
		</div>
	);
}
