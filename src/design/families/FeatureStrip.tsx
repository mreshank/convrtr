import type { ReactNode } from "react";

type Item = {
	label: string;
	body: string;
	media?: ReactNode;
};

type Props = {
	items: Item[];
};

/**
 * v2's five-up feature strip: five equal columns, each a small ink label over
 * a muted clause, with an optional media tile bleeding to the card's edges.
 *
 * v2 specifies "uniform width, not variable spans" and gives the cards a
 * transparent background, no border, zero radius and no padding. All four are
 * pinned by tests, because a card is the thing most likely to acquire a border
 * and a radius from habit.
 *
 * The single-column collapse below 900px is an extension. v2 states the
 * desktop composition and is silent on smaller viewports; five equal columns
 * at phone width give each about 75px, which is narrower than the words in
 * them. The breakpoint lives in `families.css` because a media query cannot be
 * expressed in a style object.
 *
 * The column count is threaded through the `--strip-cols` custom property
 * rather than baked straight into `gridTemplateColumns`, and — this part
 * matters — this element never sets `--strip-cols` itself. It only
 * consumes `var(--strip-cols)`, inheriting the default of 5 from `:root`
 * in `tokens.css`. An inline style value on THIS element for a property
 * would out-rank any external rule targeting this element at any
 * specificity, media query or not, whether that property is
 * `grid-template-columns` directly or `--strip-cols` itself — custom
 * properties cascade by the same rules as any other property, so
 * redeclaring `--strip-cols: 5` inline here would silently defeat the very
 * override this file exists to allow. Leaving the value unset here means
 * there is nothing on this element for `families.css`'s
 * `[data-feature-strip] { --strip-cols: 1; }` to out-rank below 900px: it
 * simply beats the inherited default, the way any matched declaration
 * beats inheritance, no `!important` required.
 */
export function FeatureStrip({ items }: Props) {
	return (
		<div
			data-feature-strip
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(var(--strip-cols), minmax(0, 1fr))",
				gap: "var(--gap-md)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{items.map((item) => (
				<div
					key={item.label}
					data-feature
					style={{
						background: "transparent",
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
					}}
				>
					<p
						style={{
							color: "var(--ink)",
							fontSize: "var(--label-size)",
							fontWeight: "var(--label-weight)",
							letterSpacing: "var(--label-tracking)",
						}}
					>
						{item.label}
					</p>
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--label-size)",
							letterSpacing: "var(--label-tracking)",
							lineHeight: "var(--body-leading)",
						}}
					>
						{item.body}
					</p>
					{item.media ? (
						<div style={{ marginTop: "var(--gap-sm)" }}>{item.media}</div>
					) : null}
				</div>
			))}
		</div>
	);
}
