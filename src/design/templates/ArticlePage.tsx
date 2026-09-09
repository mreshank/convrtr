import { Fragment, type ReactNode } from "react";
import type { PageSection } from "@/content/pages/types";
import { ProseSection } from "@/design/families";
import { Hairline } from "@/design/primitives";

type Props = {
	title: string;
	/** Rendered in the mono voice, already formatted by the route. */
	dateline: string;
	/**
	 * v2's content-band sequence for this page's body -- a mono eyebrow and a
	 * `FusedHeadline` per topic, composed via `ProseSection`. Optional and
	 * additive to `children`, which stays the slot `/blog/[slug]` renders its
	 * MDX `<Content />` into: `route-purity.test.ts` forbids a route (or a
	 * helper it renders) from importing `@/design/families` directly, so this
	 * is the slot a prose route uses to reach `ProseSection` -- hand over
	 * data, and this template does the composing, the same way `HubPage`
	 * already does for `ListingRows`.
	 */
	sections?: PageSection[];
	children?: ReactNode;
	related?: ReactNode;
};

/** Paragraphs in `@/content/pages/*` are wrapped for source readability; this collapses that whitespace back to single spaces before it reaches the DOM. */
function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

/**
 * The article shape: a headline, a mono dateline, a body at a prose measure,
 * and an optional related-reading slot.
 *
 * The prose measure is the reason this template exists. Body copy set to the
 * page's 1600px `--max-width` is unreadable — convention puts a comfortable
 * measure around 60–75 characters. That is a `ch` width, which cannot be
 * expressed against the spacing scale, so it lives in `templates.css` and is
 * the one width in this system that is deliberately not `var(--max-width)`.
 *
 * The date is formatted by the route rather than here. A template that parsed
 * dates would need a locale, and the route already knows the post's own.
 */
export function ArticlePage({
	title,
	dateline,
	sections,
	children,
	related,
}: Props) {
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
				data-prose
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<p data-dateline className="mono" style={{ color: "var(--ink-muted)" }}>
					{dateline}
				</p>
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
			</header>

			<div
				data-prose
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-lg)",
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

			{related ? (
				<div data-related data-prose>
					{related}
				</div>
			) : null}
		</article>
	);
}
