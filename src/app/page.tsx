import Link from "next/link";
import { TOOLS } from "@/core/registry";
import { DotMatrix } from "@/design/families/DotMatrix";
import { HeroBand } from "@/design/families/HeroBand";
import { TerminalPanel } from "@/design/families/TerminalPanel";

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
