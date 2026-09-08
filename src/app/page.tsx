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
const FEATURES = [
	{ label: "Local", body: "Files never leave the device." },
	{ label: "Fast", body: "No round trip to a server." },
	{ label: "Private", body: "No account, no telemetry." },
	{ label: "Offline", body: "Works with the network off." },
	{ label: "Honest", body: "Fidelity is stated, not implied." },
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
const GRID_FEATURES = [
	{ label: "No upload", body: "Conversion runs in the page." },
	{ label: "No account", body: "Nothing to sign up for." },
	{ label: "No telemetry", body: "No analytics beacon." },
	{ label: "Stated fidelity", body: "Lossless is labelled lossless." },
	{
		label: "Open formats",
		body: `${supportedFormats().length} extensions in and out.`,
	},
	{ label: "Offline", body: "Cached and usable with no network." },
];

export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-8">
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
			 */}
			<FeatureStrip items={FEATURES} />
			{/*
			 * v2's second, denser feature grid: six cells in three columns with
			 * hairline dividers between them, mounted below the five-up strip.
			 * The two coexist because v2 places them at different points on the
			 * page (`DESIGN.v2.md`'s first screen vs. its mid-page enterprise
			 * section) with different cell counts and a different divider
			 * treatment -- this is not a duplicate of `FeatureStrip`.
			 */}
			<FeatureGrid items={GRID_FEATURES} />
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
			 */}
			<BranchDiagram from="heic" to={conversionBranches("heic")} />
			{/*
			 * v2's compliance badge row and mint status dot, adapted for a
			 * product with no certifications to badge -- see the
			 * COMPLIANCE_CLAIMS comment above for why these three claims and
			 * not a seal. "Verified in CI" is true today because
			 * `e2e/network-guard.ts` runs as part of `pnpm run ci`
			 * (`pnpm playwright test`, the suite's last step) and its
			 * beacon-injection self-test proves the guard would catch a leak
			 * rather than silently passing one.
			 */}
			<ComplianceRow
				claims={COMPLIANCE_CLAIMS}
				status={{ label: "Verified in CI", ok: true }}
			/>
		</main>
	);
}
