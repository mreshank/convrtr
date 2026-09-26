import type { ReactNode } from "react";
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
 */
export function StoryChapter({ index, eyebrow, title, lede, children }: Props) {
	return (
		<section
			aria-label={`Chapter ${index}: ${eyebrow}`}
			style={{ maxWidth: "var(--max-width)", margin: "0 auto", width: "100%" }}
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
				<p className="meta" style={{ color: "var(--accent)", margin: 0 }}>
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
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-md)",
						marginTop: "var(--space-base)",
					}}
				>
					{children}
				</div>
			</div>
		</section>
	);
}
