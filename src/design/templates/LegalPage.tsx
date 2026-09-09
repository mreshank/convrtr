import { Fragment, type ReactNode } from "react";
import type { PageSection } from "@/content/pages/types";
import { ProseSection } from "@/design/families";
import { Hairline } from "@/design/primitives";

type Props = {
	title: string;
	/** Formatted by the route; the template only renders it in the mono voice. */
	revised: string;
	/**
	 * v2's content-band sequence for this document's body -- a `FusedHeadline`
	 * per section, composed via `ProseSection`. Optional and additive to
	 * `children`, which stays the slot `/legal/licences` renders its derived
	 * dependency list into: `route-purity.test.ts` forbids a route (or a
	 * helper it renders) from importing `@/design/families` directly, so this
	 * is the slot a legal route uses to reach `ProseSection` -- hand over
	 * data, and this template does the composing, the same way `HubPage`
	 * already does for `ListingRows`.
	 */
	sections?: PageSection[];
	children?: ReactNode;
};

/** Paragraphs in `@/content/pages/*` are wrapped for source readability; this collapses that whitespace back to single spaces before it reaches the DOM. */
function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

/**
 * Spec §6.2: `LegalPage` is `ArticlePage` at a narrower measure, with a mono
 * revision line in place of a dateline. Legal text sets denser, more
 * clause-heavy sentences than editorial prose, and benefits from a shorter
 * line than the 68ch `[data-prose]` `ArticlePage` uses — `[data-legal-prose]`
 * carries that narrower measure instead (`templates.css`).
 *
 * `revised` rather than `dateline`, because a legal document's date is a
 * revision — the thing it names is "when this text last changed", not a
 * publication date — and the label should say so.
 *
 * The 56ch measure lives on the body only, not the header: an `<h1>` is a
 * few words wherever this template is used ("Terms", "Licences") but the
 * rule can't assume that stays true, and a longer title has no business
 * being force-wrapped into a column sized for dense clause-heavy prose.
 */
export function LegalPage({ title, revised, sections, children }: Props) {
	return (
		<article
			style={{
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			<header
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<h1
					style={{
						fontSize: "var(--headline-size)",
						fontWeight: 400,
						letterSpacing: "var(--headline-tracking)",
						lineHeight: "var(--display-leading)",
						color: "var(--ink)",
					}}
				>
					{title}
				</h1>
				<p data-revised className="mono" style={{ color: "var(--ink-muted)" }}>
					{`Revised ${revised}`}
				</p>
			</header>

			<div
				data-legal-prose
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
				}}
			>
				{sections?.map((section, index) => (
					<Fragment key={section.lead}>
						{index > 0 ? <Hairline /> : null}
						<ProseSection
							eyebrow={section.eyebrow}
							lead={section.lead}
							cont={section.cont}
						>
							{section.paragraphs.map((paragraph) => (
								<p key={paragraph}>{clean(paragraph)}</p>
							))}
						</ProseSection>
					</Fragment>
				))}
				{children}
			</div>
		</article>
	);
}
