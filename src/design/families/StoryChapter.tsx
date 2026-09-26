import type { ReactNode } from "react";
import { ScrollReveal } from "@/design/primitives/ScrollReveal";
import { FusedHeadline } from "./FusedHeadline";

type Props = {
	/** Two-digit chapter number, e.g. "02". */
	index: string;
	/** Chapter name, e.g. "THE JOURNEY". */
	eyebrow: string;
	title: { lead: string; cont: string };
	/** One or two sentences setting up everything nested inside. */
	lede: string;
	children: ReactNode;
};

/**
 * One chapter of the homepage's single story: a file's journey from drop to
 * download. The chapter number + eyebrow give every band a place in the
 * narrative, so the page reads as six connected rooms instead of eleven
 * stacked billboards.
 *
 * The `maxWidth` cap sits on a padding-free wrapper: the shell owns the
 * gutter, the band owns only its cap (see `band-gutter.test.ts`). Vertical
 * padding is the band's own rhythm and stays.
 *
 * The eyebrow sticks under the navbar while its chapter scrolls past, so
 * the reader always knows which room they are in. Sticky needs an inset to
 * stick at all (`top` is the mechanism); the navbar's own token keeps the
 * bar clear of it, and the ground background keeps scrolled content from
 * showing through. The section also carries its anchor id plus a scroll
 * margin for the same navbar, so progress-rail jumps land the chapter
 * below the bar instead of under it.
 */
export function StoryChapter({ index, eyebrow, title, lede, children }: Props) {
	return (
		<section
			id={`chapter-${index}`}
			data-story-chapter={`chapter-${index}`}
			aria-label={`Chapter ${index}: ${eyebrow}`}
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				scrollMarginTop: "calc(var(--navbar-height) + var(--space-base))",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
					paddingTop: "var(--gap-md)",
					paddingBottom: "var(--gap-md)",
				}}
			>
				<p
					className="meta"
					style={{
						color: "var(--accent)",
						margin: 0,
						position: "sticky",
						top: "var(--navbar-height)",
						zIndex: 5,
						backgroundColor: "var(--ground)",
						paddingTop: "var(--space-base)",
						paddingBottom: "var(--space-base)",
						borderBottomWidth: "var(--rule-width)",
						borderBottomStyle: "solid",
						borderBottomColor: "var(--rule-subtle)",
					}}
				>
					CH.{index} {"//"} {eyebrow}
				</p>
				<FusedHeadline as="h2" lead={title.lead} cont={title.cont} />
				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						lineHeight: 1.6,
						margin: 0,
						maxWidth: "65ch",
					}}
				>
					{lede}
				</p>
				<ScrollReveal
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-md)",
						marginTop: "var(--space-base)",
					}}
				>
					{children}
				</ScrollReveal>
			</div>
		</section>
	);
}
