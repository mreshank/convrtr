import Link from "next/link";
import { TOOLS } from "@/core/registry";
import { HeroBand } from "@/design/families/HeroBand";

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
		</main>
	);
}
