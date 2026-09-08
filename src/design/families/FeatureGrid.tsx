type Item = {
	label: string;
	body: string;
};

type Props = {
	items: Item[];
};

/**
 * v2's enterprise-feature grid: six informational cells in two rows of three,
 * separated by hairline dividers, with a mint glyph over an ink label and a
 * muted body.
 *
 * v2's guardrail names this component specifically -- "Never round the
 * feature-grid or panel cards -- 0px radius is structural to this system" --
 * so the square corners and transparent fill are both pinned by tests.
 *
 * The dividers go *between* cells, not around them. A border on every cell
 * would double every interior line and draw an outer frame v2 does not ask
 * for, so the rules live in `families.css` where a selector can pick out only
 * the cells that have a neighbour.
 *
 * The glyph is the "icon glyph" use of mint the palette rations. It stays a
 * glyph: mint as a fill is what a call to action looks like, and this grid
 * deliberately has none.
 *
 * The column count is threaded through the `--grid-cols` custom property,
 * exactly as `FeatureStrip` threads `--strip-cols` -- and, the same as that
 * component, THIS element never sets `--grid-cols` itself. It only consumes
 * `var(--grid-cols)`, inheriting the default of 3 from `:root` in
 * `tokens.css`. An inline style value on this element for a property always
 * out-ranks any external rule targeting this same element, media query or
 * not, regardless of selector specificity -- and that holds whether the
 * property is `grid-template-columns` directly or `--grid-cols` itself,
 * because custom properties cascade by the same rules as any other property.
 * Setting `--grid-cols` inline here (even to its own default of 3) would
 * silently defeat the very override `families.css`'s
 * `[data-feature-grid] { --grid-cols: 2; }` (900px) and `{ --grid-cols: 1; }`
 * (600px) exist to make -- confirmed by Task 7's isolated reproduction: a
 * plain, non-important media-query rule cannot move a custom property a
 * `style` attribute has already set on that same element. Leaving the value
 * unset here means there is nothing on this element for those rules to
 * out-rank: they simply beat the inherited default, the way any matched
 * declaration beats inheritance, no `!important` required. The divider rules
 * below are ordinary selectors on the cells, not overrides of an inline
 * style, so they are unaffected either way and are restated per breakpoint
 * because their `:nth-child` arithmetic is tied to the column count.
 */
export function FeatureGrid({ items }: Props) {
	return (
		<div
			data-feature-grid
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(var(--grid-cols), minmax(0, 1fr))",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{items.map((item) => (
				<div
					key={item.label}
					data-cell
					style={{
						background: "transparent",
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
						padding: "var(--gap-md)",
					}}
				>
					<span
						data-glyph
						aria-hidden="true"
						className="mono"
						style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
					>
						{"///"}
					</span>
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
							fontSize: "var(--body-size)",
							lineHeight: "var(--body-leading)",
						}}
					>
						{item.body}
					</p>
				</div>
			))}
		</div>
	);
}
