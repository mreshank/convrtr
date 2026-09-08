import Link from "next/link";
import type { Tool } from "@/core/registry";
import { FusedHeadline } from "./FusedHeadline";

type Props = {
	tools: Tool[];
	/** The small label above the headline, e.g. "Every tool, no menu". */
	eyebrow: string;
	/** The fused headline's two clauses -- see `FusedHeadline`. */
	title: { lead: string; cont: string };
};

/**
 * The registry's full catalogue, as one flat grid of links.
 *
 * Derived from the registry rather than hand-listed, so adding a tool adds
 * its link here for free. Hard-coding one would quietly falsify the
 * architecture claim that nothing in `src/app` is per-tool.
 *
 * `eyebrow` and `title` are props, not copy baked into this file -- every
 * sibling family (`FeatureStrip`, `FeatureGrid`, `ComplianceRow`, ...) takes
 * its words as data from the route, and a family that hardcodes its own
 * page-specific copy is a route-shaped thing living in the families
 * directory. The route supplies both from `src/app/home-content.ts`.
 *
 * This band used to sit on the page as a bare `flex flex-wrap` of links with
 * no eyebrow and no heading -- the one band with nothing identifying what it
 * was, breaking the eyebrow-plus-headline composition every other content
 * band on the page follows. The eyebrow and the fused headline below are
 * that framing, not new content: the caller's claim ("one flat list",
 * "nothing to open first") is the grid's own actual shape -- every tool
 * renders as a single direct link, with no category the reader has to click
 * through before reaching it.
 */
export function ToolGrid({ tools, eyebrow, title }: Props) {
	if (tools.length === 0) return null;

	return (
		<section
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
				}}
			>
				<p className="meta" style={{ color: "var(--ink-muted)" }}>
					{eyebrow}
				</p>
				<FusedHeadline lead={title.lead} cont={title.cont} />
			</div>
			<div className="flex flex-wrap gap-2">
				{tools.map((tool) => (
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
		</section>
	);
}
