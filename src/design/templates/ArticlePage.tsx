import type { ReactNode } from "react";

type Props = {
	title: string;
	/** Rendered in the mono voice, already formatted by the route. */
	dateline: string;
	children: ReactNode;
	related?: ReactNode;
};

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
export function ArticlePage({ title, dateline, children, related }: Props) {
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

			<div data-prose>{children}</div>

			{related ? (
				<div data-related data-prose>
					{related}
				</div>
			) : null}
		</article>
	);
}
