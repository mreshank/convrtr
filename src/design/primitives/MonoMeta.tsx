import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Element to render. Defaults to `span`; use `div` for a block row, or `p` for a paragraph. */
	as?: "span" | "div" | "p";
};

/**
 * DESIGN.md's metadata voice: monospace, 14px, uppercase, 0.1em tracking.
 *
 * The single consumer of `.meta`, and deliberately so. The class exists
 * separately from `.mono` because `.mono` renders *data* — filenames, byte
 * counts, timestamps — and must never uppercase: doing so would display a
 * filename the user does not have. `.meta` renders *labels*, where
 * DESIGN.md's uppercase treatment belongs.
 *
 * Routing every label through here rather than hand-rolling the values in a
 * className is what keeps those two voices from blurring back together.
 */
export function MonoMeta({ children, as: Tag = "span" }: Props) {
	return <Tag className="meta">{children}</Tag>;
}
