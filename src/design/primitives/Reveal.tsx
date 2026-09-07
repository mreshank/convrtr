import { Fragment } from "react";

type Props = {
	/** The complete string. Also becomes the accessible name. */
	text: string;
	/** Split granularity. Character split is for display type only. */
	by?: "char" | "word";
	className?: string;
};

/**
 * DESIGN.md's signature reveal: each fragment slides up from
 * translateY(100%) with `--ease` over `--dur-reveal`, staggered.
 *
 * Server-rendered markup driven by pure CSS, with no effect and no
 * measurement. On a static export a JS-driven reveal flashes unstyled
 * content before hydration, which is a worse outcome than no animation at
 * all — so the animation must be something the first paint already knows
 * how to do.
 *
 * The accessibility handling is not decoration. Splitting text into spans
 * makes assistive technology announce a headline fragment by fragment, so
 * the container carries the whole string as its accessible name and every
 * fragment is removed from the accessibility tree.
 *
 * Reduced motion is handled entirely in `globals.css`, and it takes two
 * rules rather than one. Collapsing `animation-duration` to 0.01ms resolves
 * each fragment to its final position rather than skipping it, so no content
 * is lost — but on its own that is not enough for a STAGGERED reveal, and
 * the comment here used to claim it was. The per-fragment
 * `animation-delay` in primitives.css still ran in full, and `both` fill
 * held every fragment at translateY(100%) — clipped out of sight by the
 * parent's overflow — until its turn came. So `globals.css` collapses the
 * delay too, and the whole line resolves at once.
 */
export function Reveal({ text, by = "word", className }: Props) {
	const parts = by === "char" ? [...text] : text.split(" ");

	return (
		// role="img" is what makes aria-label a valid accessible name here: a
		// bare span has role "generic", which the accessible-name spec does not
		// allow to be named at all, so the whole string would fall back to the
		// (fragmented) content instead. The same pattern already names
		// FidelityScore's span in this codebase.
		<span role="img" aria-label={text} className={className} data-reveal>
			{/*
			 * The inter-word space is a plain sibling text node, not part of the
			 * word's own span: a fragment's textContent has to be just the
			 * fragment (spans[0].textContent === "convert", not "convert "),
			 * while the rendered line still needs the space so it reads
			 * normally when copied or read aloud from the DOM.
			 */}
			{parts.map((part, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: fragments are not stable across renders and have no id of their own; index is the honest key here.
				<Fragment key={`${index}-${part}`}>
					<span
						data-reveal-part
						aria-hidden="true"
						style={{ ["--reveal-i" as string]: String(index) }}
					>
						{part}
					</span>
					{by === "word" && index < parts.length - 1 ? " " : null}
				</Fragment>
			))}
		</span>
	);
}
