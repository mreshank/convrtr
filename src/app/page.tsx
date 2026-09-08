import Link from "next/link";
import { TOOLS } from "@/core/registry";
import { conversionBranches, supportedFormats } from "@/core/registry/stats";
import { BranchDiagram } from "@/design/families/BranchDiagram";
import { ComplianceRow } from "@/design/families/ComplianceRow";
import { DotMatrix } from "@/design/families/DotMatrix";
import { FeatureGrid } from "@/design/families/FeatureGrid";
import { FeatureStrip } from "@/design/families/FeatureStrip";
import { FormatStrip } from "@/design/families/FormatStrip";
import { HeroBand } from "@/design/families/HeroBand";
import { TerminalPanel } from "@/design/families/TerminalPanel";

// Five properties this product actually has, not five pieces of copy.
// "Offline" rests on the service worker `layout.tsx` registers
// (`ServiceWorkerRegistration`, backed by the generated `out/sw.js`); "Honest"
// rests on `FidelityScore` encoding lossless/lossy as a solid-versus-dashed
// ring rather than leaving it to a label. The other three are architectural:
// every conversion in `src/core` runs client-side, decoding and encoding in
// the browser tab with nothing sent anywhere, and there is no account system
// or analytics call anywhere in this codebase.
//
// "Honest" reads "drawn", not "stated", and the word was changed on evidence.
// `FidelityScore` renders a ring and a number; the only place the word
// "lossless" appears is its `aria-label`
// (`FidelityScore.tsx:97`: `Fidelity ${rounded} of 100 -- ${label}`), and the
// `label` prop is documented there as "Accessible name only ... never
// rendered inside the ring". So a claim that fidelity is *stated* was true
// for a screen-reader user and false for a sighted one -- not acceptable on
// a page whose whole argument is that its claims are checkable. What a
// sighted user genuinely gets is a drawing: `isSolid()` picks
// `strokeLinecap: "round"` with no dash for `lossless`/`visually-lossless`
// and `strokeDasharray` for the two lossy states, and the stroke is
// `var(--accent)` for `lossless` alone.
const FEATURES = [
	{ label: "Local", body: "Files never leave the device." },
	{ label: "Fast", body: "No round trip to a server." },
	{ label: "Private", body: "No account, no telemetry." },
	{ label: "Offline", body: "Works with the network off." },
	{ label: "Honest", body: "Fidelity is drawn, not implied." },
];

// v2 puts a certification badge row and an "all systems operational" mint
// status dot in the footer band. This product holds no certifications, and
// printing a SOC 2 or ISO seal it does not have would be a fabricated
// credential -- the one thing a page whose argument is verifiability must
// never carry. These three claims are the checkable equivalent: every one
// of them is what `e2e/network-guard.ts` asserts in `pnpm run ci`, which
// watches every request the page makes and fails if a single byte leaves
// the device, then self-tests by injecting a cross-origin beacon to prove
// the guard actually fires rather than passing by omission.
const COMPLIANCE_CLAIMS = [
	"No file leaves the device",
	"No account required",
	"No analytics beacon",
];

// v2's second, denser feature grid -- six informational claims rather than
// the strip's five. "Open formats" reads `supportedFormats().length` rather
// than a hand-typed count, so the claim cannot go stale as tools are added
// to or removed from the registry.
//
// "Stated fidelity" used to claim "Lossless is labelled lossless", which was
// false for anyone looking at the page: the word appears only in
// `FidelityScore`'s `aria-label` (see the FEATURES comment above). The body
// now describes the encoding that is actually painted, and describes it in
// the direction that is unconditionally true -- `FidelityScore.tsx:139` sets
// `strokeDasharray` if and only if `isSolid()` is false, i.e. exactly for
// `lossy` and `inherently-lossy`. The converse would not be safe to claim:
// `visually-lossless` also draws a solid ring, and something was given up
// there.
const GRID_FEATURES = [
	{ label: "No upload", body: "Conversion runs in the page." },
	{ label: "No account", body: "Nothing to sign up for." },
	{ label: "No telemetry", body: "No analytics beacon." },
	{
		label: "Stated fidelity",
		body: "A broken ring means something was given up.",
	},
	{
		label: "Open formats",
		body: `${supportedFormats().length} extensions in and out.`,
	},
	{ label: "Offline", body: "Cached and usable with no network." },
];

export default function Home() {
	return (
		<main
			// No `max-w-4xl` and no Tailwind `gap-*` here. This container used
			// to impose its own 896px cap and a flat 16px gap on every child --
			// dead weight, because each family below already carries its own
			// `maxWidth: "var(--max-width)"` (1600px) and manages its own
			// internal padding. A competing cap on the parent meant none of
			// those family widths could ever bind at any viewport, and the
			// 16px gap buried v2's "generous 240px section padding creating
			// long black voids between bands" (DESIGN.v2.md:133) under a
			// value 15 times smaller. `--section-pad` now drives the gap
			// directly -- see `families.css`'s `[data-home-shell]` rules for
			// the narrower-viewport tiers, which cannot live in this style
			// object.
			data-home-shell
			className="flex w-full flex-col p-8"
			style={{ gap: "var(--section-pad)" }}
		>
			{/*
			 * The fused headline, the pill pair and the registry-derived chart,
			 * under the dot-matrix grain -- replacing the separate FusedHeadline,
			 * DotMatrix and BarChart mounts Tasks 2-4 placed here. `HeroBand`
			 * composes the same three pieces, so this is one component rather
			 * than three, not a loss of any of them.
			 *
			 * The tool grid below stays OUTSIDE `HeroBand`: v2 confines the grain
			 * to the hero -- "overlays the topmost strip banner and recurs
			 * faintly behind code-panel graphics" -- and Task 3's wider
			 * `DotMatrix` wrapper had stretched it down over this 53-link grid
			 * as well. `HeroBand`'s own `DotMatrix` wraps only its own
			 * `<section>`, so the fix here is not nesting the grid inside it.
			 *
			 * The secondary pill points at `/blog` rather than `/how-it-works`:
			 * there is no `/how-it-works` route, and `/tools` and `/blog` are the
			 * only built destinations besides the primary CTA's own `/tools`. A
			 * 404 in the hero is the same defect Task 1 already guards against
			 * in the chrome.
			 */}
			<HeroBand
				lead="Convert anything."
				cont="Nothing uploads."
				cta={{ href: "/tools", label: "Start converting" }}
				secondary={{ href: "/blog", label: "Read the blog" }}
			/>
			{/*
			 * v2's mono family names code panels as one of its homes, and this
			 * is that panel -- the terminal/code panel on the raised surface,
			 * `--surface`'s first consumer. Wrapped in its own `DotMatrix`
			 * rather than sharing the hero's: v2 confines the grain to the
			 * topmost strip and code-panel graphics specifically, not
			 * everything between them, and Task 3 already established that a
			 * shared wrapper over-applies it.
			 *
			 * There is no command line here -- this product converts files in
			 * a browser tab, nothing more -- so the lines describe what the
			 * browser actually does for `heic-to-jpg`: `heic.ts` decodes HEIC
			 * via `libheif-js/wasm-bundle`, wholly client-side, and
			 * `quality-profiles.ts`'s "balanced" default for the mozjpeg
			 * encoder is quality 78. Both are real code paths in this
			 * repository, not invented numbers.
			 */}
			<DotMatrix>
				<TerminalPanel
					label="What happens when you convert a file"
					lines={[
						{ text: "photo.heic selected — 4.2 MB" },
						{ text: "decoding locally, no upload", tone: "muted" },
						{ text: "libheif → jpeg, quality 78", tone: "muted" },
						{ text: "photo.jpg ready — 1.1 MB", tone: "accent" },
					]}
				/>
			</DotMatrix>
			{/*
			 * v2's five-up feature strip, mounted below the terminal panel per
			 * Task 7. Each item is a property the product actually has, not
			 * marketing copy -- see the FEATURES comment above for how each one
			 * was verified.
			 *
			 * Wrapped in a bare `<div>`, and that wrapper is load-bearing, not
			 * decorative -- discovered measuring this very fix at 1920px.
			 * `FeatureStrip`'s own root carries `maxWidth: var(--max-width)`
			 * PLUS `margin: "0 auto"` on the SAME element, and that element is
			 * now a direct flex child of this `<main>`. Per the flexbox
			 * alignment spec, a flex item with an auto margin on the cross axis
			 * (here, left/right, because `main` is a column flex) does NOT
			 * stretch to fill the container even when `align-items` would
			 * otherwise say so -- the auto margin absorbs the free space
			 * instead, and the item is sized to its own content (measured
			 * 1192px at a 1920px viewport, not 1600px). `HeroBand` never hit
			 * this because `DotMatrix` already wraps it in exactly this kind
			 * of plain, non-auto-margin div; the wrapper here gives
			 * `FeatureStrip`, `FeatureGrid`, `ComplianceRow` and
			 * `BranchDiagram` the same shape. The wrapper sets nothing itself:
			 * with no margin of its own it stretches to `main`'s full content
			 * width exactly as `align-items: normal` (`stretch`) intends, and
			 * the family's own `max-width` + `margin: auto` then centers
			 * correctly inside THAT plain block, one level down, where
			 * auto-margin-vs-stretch is not a question block layout asks.
			 */}
			<div>
				<FeatureStrip items={FEATURES} />
			</div>
			{/*
			 * v2's second, denser feature grid: six cells in three columns with
			 * hairline dividers between them, mounted below the five-up strip.
			 * The two coexist because v2 places them at different points on the
			 * page (`DESIGN.v2.md`'s first screen vs. its mid-page enterprise
			 * section) with different cell counts and a different divider
			 * treatment -- this is not a duplicate of `FeatureStrip`.
			 *
			 * Wrapped for the same reason `FeatureStrip` above is -- see that
			 * comment.
			 */}
			<div>
				<FeatureGrid items={GRID_FEATURES} />
			</div>
			{/*
			 * v2's scrolling logo rail, adapted: this product has no customer
			 * logos, and inventing them would be fabrication on a page whose
			 * whole claim is that it can be verified. The formats the registry
			 * accepts or emits are the honest equivalent, and they are derived
			 * so this cannot drift as tools are added.
			 */}
			<FormatStrip formats={supportedFormats()} />
			{/*
			 * Derived from the registry rather than hand-listed, so adding a tool
			 * adds its link here for free. Hard-coding one would quietly falsify
			 * the architecture claim that nothing in `src/app` is per-tool.
			 */}
			<div className="flex flex-wrap gap-2">
				{TOOLS.map((tool) => (
					<Link
						key={tool.id}
						href={`/${tool.id}`}
						className="mono border px-4 py-2 text-[12px]"
						style={{
							color: "var(--ink)",
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
						}}
					>
						{tool.accept.ext[0]?.toUpperCase()} {"→"}{" "}
						{tool.output.ext.toUpperCase()}
					</Link>
				))}
			</div>
			<span className="mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
				LOCAL ONLY · 0 BYTES UPLOADED · WORKS OFFLINE
			</span>
			{/*
			 * v2's branching-line graphic, carrying the registry's own
			 * conversion graph. `heic` is the input: it is the format people
			 * most often need converted, and it genuinely branches three ways
			 * (`conversionBranches("heic")` returns jpg, png, webp), so the
			 * drawing is real data rather than a decorative network of
			 * invented nodes.
			 *
			 * Wrapped for the flex-stretch reason recorded above `FeatureStrip`.
			 */}
			<div>
				<BranchDiagram from="heic" to={conversionBranches("heic")} />
			</div>
			{/*
			 * v2's compliance badge row and mint status dot, adapted for a
			 * product with no certifications to badge -- see the
			 * COMPLIANCE_CLAIMS comment above for why these three claims and
			 * not a seal. "Verified in CI" is true today because
			 * `e2e/network-guard.ts` runs as part of `pnpm run ci`
			 * (`pnpm playwright test`, the suite's last step) and its
			 * beacon-injection self-test proves the guard would catch a leak
			 * rather than silently passing one.
			 *
			 * Wrapped for the flex-stretch reason recorded above `FeatureStrip`.
			 */}
			<div>
				<ComplianceRow
					claims={COMPLIANCE_CLAIMS}
					status={{ label: "Verified in CI", ok: true }}
				/>
			</div>
		</main>
	);
}
