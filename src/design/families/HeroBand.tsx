import Link from "next/link";
import { toolsByCategory } from "@/core/registry/stats";
import {
	HALFTONE_FRAGMENT,
	HERO_GLOW_FRAGMENT,
	ShaderSurface,
} from "@/design/texture";
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
	// No `transition` here. One was declared -- on `background`, taking the
	// hover duration and the system easing -- with no `:hover` rule for
	// either pill anywhere in `families.css`, `HeroBand.tsx` or
	// `globals.css`, so it animated a property nothing ever changed. v2
	// specifies a hover-lighten only for its mint shell-command CTA, which
	// this system does not build yet, so a white pill with no hover is
	// spec-correct and the declaration was simply inert. Deleted rather than
	// given an invented hover to justify it.
	//
	// The two tokens are named in prose rather than written as `var()` calls,
	// the convention `tokens.css` states for measured colours and for the
	// same reason: the sweeps and audits that count a token's consumers scan
	// raw file text, so a comment written in CSS syntax reports itself as a
	// consumer. The hover duration's real consumer count after this deletion
	// is zero.
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
 *
 * `heroGlow` and `halftone` sit behind the section's content in a plain
 * `position: relative` wrapper -- not inside `DotMatrix`'s own div, which
 * already exists to paint its grain OVER whatever it wraps (see that file's
 * own comment). Stacking order here is a CSS trap, not an assumption: a
 * `position: absolute` canvas paints AFTER a plain, non-positioned sibling
 * regardless of DOM order, because positioned descendants paint in their own
 * later stage of the stacking algorithm. Giving `<section>` its own
 * `position: relative` (auto z-index, same stage as the canvases) is what
 * puts DOM order back in charge, so the two `ShaderSurface`s -- first in the
 * tree -- land underneath it, and `DotMatrix`'s grain -- still painted last,
 * still positioned -- stays on top of all of it, unchanged.
 */
export function HeroBand({ lead, cont, cta, secondary }: Props) {
	return (
		<DotMatrix>
			<div style={{ position: "relative" }}>
				<ShaderSurface
					fragment={HERO_GLOW_FRAGMENT}
					// Fix round 1: 0.5 measured fine (the eyebrow/headline text
					// held 4.5:1+ throughout) but read as invisible in a real
					// screenshot -- raised alongside the bar width/shimmer floor
					// in heroGlow.ts itself so the bars register as a visible,
					// deliberate stroke rather than a value only a pixel sampler
					// could find.
					intensity={0.85}
					label="hero-glow"
				/>
				<ShaderSurface
					fragment={HALFTONE_FRAGMENT}
					// 0.4 put the brightest dot at 0.4 x `--rule` -- channels
					// 19, 20, 22 on black, a 19/255 delta no one was ever going to
					// read as a halftone. 0.75 is a ceiling rather than a taste:
					// `u_intensity` scales the mix toward `--rule` directly, so the
					// densest dot lands near 36, 38, 41, and the grey half of the
					// fused headline (`--ink-muted`) measures 5.19:1 against THAT
					// ground rather than against the black beside it -- the ground
					// is the whole claim, and this project has twice filed a
					// contrast number measured against the wrong one. Full `--rule`
					// (48, 50, 54) is where the same grey drops to 4.39:1 and fails
					// AA: the exact ground `DotMatrix`'s grain had to be moved off.
					//
					// Channel numbers, never a colour function: the palette sweep in
					// `tokens.test.ts` reads comments as well as code, so spelling
					// one out here -- even to explain this rule -- fails it.
					intensity={0.75}
					label="hero-halftone"
				/>
				<section
					style={{
						position: "relative",
						zIndex: 2,
						maxWidth: "var(--max-width)",
						margin: "0 auto",
						// Vertical only -- the horizontal gutter is `EditorialPage`'s
						// shell's job now (see its own comment). Keeping a horizontal
						// value here too would double-gutter this band: the shell's
						// padding plus this section's own would inset it twice as far
						// as every sibling band.
						padding: "var(--gap-lg) 0",
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
							position: "relative",
							zIndex: 10,
							display: "flex",
							flexWrap: "wrap",
							gap: "var(--gap-sm)",
							marginTop: "var(--space-base)",
						}}
					>
						<Link
							href={cta.href}
							// The global `:focus-visible` ring is `1px solid var(--ink)`
							// -- exactly this pill's own fill. The
							// `[data-cta-fill]:focus-visible` rule in families.css
							// therefore pulls the ring inside the pill and recolours it
							// `--ground`, so it reads as a dark ring stamped into the
							// fill. `SiteHeader`'s CTA carries the same attribute for the
							// same reason, and one rule covers both.
							//
							// The number this was originally justified with was wrong,
							// and the correction is in families.css above that rule: the
							// default ring sits at `outline-offset: 2px`, i.e. OUTSIDE
							// the box, so the pre-fix ring was white on the black page at
							// roughly 19:1 rather than white-on-white at 1:1. It was
							// visible. What it was not is legible AS an indicator -- a
							// white hairline two pixels off a large white pill reads as
							// part of the pill -- which is why the rule stays.
							//
							// The secondary pill is transparent, so its default ring
							// already sits on the page with full contrast and is left
							// untouched.
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
			</div>
		</DotMatrix>
	);
}
