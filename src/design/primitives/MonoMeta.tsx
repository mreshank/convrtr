import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Element to render. Defaults to `span`; use `div` for a block row, or `p` for a paragraph. */
	as?: "span" | "div" | "p";
};

/**
 * v2's `label-mono`: GeistMono, 13px, weight 400, line-height 1.5. No
 * uppercase, no letter-spacing — DESIGN.md's uppercase-plus-tracking
 * metadata voice does not exist in v2, which puts eyebrow labels in Inter
 * `label-md` instead and reserves mono for code panels, terminal
 * timestamps and the CTA reading a shell command.
 *
 * The single consumer of `.meta`, and deliberately so. The class exists
 * separately from `.mono` because `.mono` renders *data* — filenames, byte
 * counts, timestamps — and must never uppercase: doing so would display a
 * filename the user does not have. `.meta` renders *labels*, at the
 * label-mono size, without that hazard.
 *
 * Routing every label through here rather than hand-rolling the values in a
 * className is what keeps those two voices from blurring back together.
 */
export function MonoMeta({ children, as: Tag = "span" }: Props) {
	return <Tag className="meta">{children}</Tag>;
}
