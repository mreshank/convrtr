import type { ReactNode } from "react";
import { FusedHeadline } from "./FusedHeadline";

type Props = {
	/** Small mono label above the headline. Optional -- not every section needs one. */
	eyebrow?: string;
	/** The bold opening clause of the section's headline. */
	lead: string;
	/** The muted continuation, fused onto the same line as `lead`. */
	cont: string;
	/** The section's body, usually a run of `<p>` elements. */
	children: ReactNode;
};

/**
 * v2's content-band shape, scaled down to one section of running prose: a
 * mono eyebrow, `FusedHeadline` at h2, then body copy -- the same
 * eyebrow-then-heading idiom `HubPage` and `ConverterPage` already use for a
 * listing and an instrument, applied here to a page whose body is prose.
 *
 * `ArticlePage` and `LegalPage` compose a sequence of these from a `sections`
 * prop instead of rendering a bare stack of `<p>` elements with nothing to
 * navigate by -- which is what `/about`, `/how-it-works` and `/privacy` did
 * before this existed: a title over a flat column, no hierarchy, nothing to
 * skim by.
 *
 * No width of its own: this is always mounted inside `[data-prose]` or
 * `[data-legal-prose]`, and a competing `max-width` here would fight
 * whichever ambient measure the caller already set -- the same trap
 * `TerminalPanel`'s own doc comment records for a capped element nested
 * inside a narrower measure elsewhere.
 */
export function ProseSection({ eyebrow, lead, cont, children }: Props) {
	return (
		<section
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-sm)",
			}}
		>
			{eyebrow ? (
				<p className="meta" style={{ color: "var(--ink-muted)" }}>
					{eyebrow}
				</p>
			) : null}
			<FusedHeadline as="h2" lead={lead} cont={cont} />
			<div
				data-section-body
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				{children}
			</div>
		</section>
	);
}
