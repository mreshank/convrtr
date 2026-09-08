import Link from "next/link";
import { toolsByCategory } from "@/core/registry/stats";
import { BarChart } from "./BarChart";
import { DotMatrix } from "./DotMatrix";
import { FusedHeadline } from "./FusedHeadline";

type Action = {
	href: string;
	label: string;
};

type Props = {
	lead: string;
	cont: string;
	cta: Action;
	secondary: Action;
};

const PILL = {
	height: "44px",
	borderRadius: "var(--radius-pill)",
	display: "inline-flex",
	alignItems: "center",
	padding: "0 var(--gap-md)",
	fontSize: "var(--label-size)",
	fontWeight: 500,
	letterSpacing: "var(--label-tracking)",
	textDecoration: "none",
	transition: "background var(--dur-hover) var(--ease)",
} as const;

/**
 * v2's first screen: the fused headline, a pill pair, and the bar chart
 * bleeding into the fold, all under the dot-matrix grain.
 *
 * The primary pill is white-filled and the secondary is a transparent outline.
 * v2 is explicit that "the outline variant is secondary, never primary"
 * (DESIGN.v2.md:138), and swapping them inverts the emphasis of the whole
 * first screen -- so a test pins the fill on one and the border on the other.
 *
 * Mint is deliberately absent from these two. It means two things in this
 * system and shape is what keeps them apart: a mint pill FILL is a call to
 * action, a mint stroke TINT is the lossless fidelity ring. The mint pill
 * belongs to v2's shell-command CTA (DESIGN.v2.md:143), not to the hero
 * primary, which v2 observes as white. Outlining anything in mint here would
 * collapse the distinction the fidelity ring depends on.
 *
 * The secondary pill's border is written as longhands, not the `border`
 * shorthand -- the same reason SiteHeader.tsx:67 and Hairline.tsx give: a
 * shorthand whose parts are all `var()` cannot be reparsed into its
 * components, so it round-trips through the CSSOM as
 * `var(--rule) var(--rule) var(--rule)` and no test could tell it apart from
 * a shorthand written with the wrong token.
 */
export function HeroBand({ lead, cont, cta, secondary }: Props) {
	return (
		<DotMatrix>
			<section
				style={{
					maxWidth: "var(--max-width)",
					margin: "0 auto",
					padding: "var(--gap-lg) var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
				}}
			>
				<p className="meta" style={{ color: "var(--ink-muted)" }}>
					Local file conversion
				</p>

				<FusedHeadline as="h1" lead={lead} cont={cont} />

				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "var(--gap-sm)",
						marginTop: "var(--space-base)",
					}}
				>
					<Link
						href={cta.href}
						// The global `:focus-visible` ring is `1px solid var(--ink)`
						// -- exactly this pill's own fill. Tabbed to in a real
						// browser, the ring and the pill are the same white, so the
						// two are indistinguishable: contrast 1:1, the same class of
						// bug `SiteFooter.tsx` documents from the inverted-band side
						// ("draws black on black over every link here"), mirrored
						// here on a filled light control over the dark page. The
						// `[data-cta-fill]:focus-visible` rule in families.css pulls
						// the ring inside the pill and colours it `--ground` so it
						// reads as a dark ring stamped into the fill; the secondary
						// pill is transparent, so its default ring already has full
						// contrast against the page and is left untouched.
						data-cta-fill
						style={{
							...PILL,
							background: "var(--ink)",
							color: "var(--ground)",
						}}
					>
						{cta.label}
					</Link>
					<Link
						href={secondary.href}
						style={{
							...PILL,
							background: "transparent",
							color: "var(--ink)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
						}}
					>
						{secondary.label}
					</Link>
				</div>

				<div style={{ marginTop: "var(--gap-lg)" }}>
					<BarChart data={toolsByCategory()} />
				</div>
			</section>
		</DotMatrix>
	);
}
