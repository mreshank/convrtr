"use client";

import { useMemo, useState } from "react";
import { findConversionRoute } from "@/core/registry/converter-match";
import { conversionBranches } from "@/core/registry/stats";
import { branchPath } from "./BranchDiagram";
import { CardHeader } from "./CardHeader";

type Props = {
	/** Input extensions worth exploring, richest lineage first. */
	sources: string[];
};

const MAX_DIRECT_SHOWN = 12;
const MAX_TWO_HOP = 6;
const TREE_WIDTH = 240;
const ROW_HEIGHT = 26;

type TwoHop = {
	via: string;
	to: string;
	tools: string;
};

/**
 * The graph chapter's instrument: pick any input format and watch its live
 * lineage branch. Direct edges come from `conversionBranches`; the two-hop
 * chains underneath are found by the real `findConversionRoute` BFS, with
 * the tool chain that the router itself would execute.
 *
 * Everything here is derived from the registry at render time, so the tree
 * can never drift from the product: add a tool, and some format's lineage
 * grows a branch on the next build. The `<svg>` is `aria-hidden` geometry
 * (as in `BranchDiagram`); the format names beside it are the content.
 */
export function LineageExplorer({ sources }: Props) {
	const [active, setActive] = useState(sources[0] ?? "heic");

	const direct = useMemo(() => conversionBranches(active), [active]);
	const shown = direct.slice(0, MAX_DIRECT_SHOWN);
	const hidden = direct.length - shown.length;

	const twoHop = useMemo<TwoHop[]>(() => {
		const out: TwoHop[] = [];
		const directSet = new Set(direct);
		for (const via of direct) {
			if (out.length >= MAX_TWO_HOP) break;
			for (const target of conversionBranches(via)) {
				if (out.length >= MAX_TWO_HOP) break;
				if (target === active || directSet.has(target)) continue;
				if (out.some((chain) => chain.to === target)) continue;
				const route = findConversionRoute(active, target);
				if (!route || route.route.length < 2) continue;
				out.push({
					via,
					to: target,
					tools: route.route.map((tool) => tool.slug ?? tool.id).join(" + "),
				});
			}
		}
		return out;
	}, [active, direct]);

	const treeHeight = Math.max(96, shown.length * ROW_HEIGHT);

	return (
		<div
			className="m3-surface-card flex w-full flex-col gap-[var(--gap-md)] p-[var(--gap-md)]"
			style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}
		>
			<CardHeader
				eyebrow="LINEAGE EXPLORER // LIVE REGISTRY GRAPH"
				title="Pick a format. Watch it branch."
			/>

			<fieldset
				style={{
					display: "flex",
					gap: "calc(var(--space-base) / 2)",
					flexWrap: "wrap",
					border: "none",
					margin: 0,
					padding: 0,
				}}
			>
				<legend
					className="meta"
					style={{
						color: "var(--rule-strong)",
						fontSize: "var(--mono-size)",
						padding: 0,
						marginBottom: "calc(var(--space-base) / 2)",
					}}
				>
					SOURCE FORMAT
				</legend>
				{sources.map((source) => {
					const isSelected = source === active;
					return (
						<button
							key={source}
							type="button"
							onClick={() => setActive(source)}
							aria-pressed={isSelected}
							className={`m3-chip ${isSelected ? "m3-chip-active" : ""}`}
						>
							{source.toUpperCase()}
						</button>
					);
				})}
			</fieldset>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "var(--gap-sm)",
					flexWrap: "wrap",
				}}
			>
				<span className="meta" style={{ color: "var(--ink)" }}>
					{active.toUpperCase()}
				</span>
				<svg
					aria-hidden="true"
					width={TREE_WIDTH}
					height={treeHeight}
					viewBox={`0 0 ${TREE_WIDTH} ${treeHeight}`}
					style={{ flexShrink: 0, overflow: "visible" }}
				>
					{shown.map((output, index) => (
						<path
							key={output}
							d={branchPath(index, shown.length, TREE_WIDTH, treeHeight)}
							stroke="var(--rule)"
							strokeWidth="1"
							fill="none"
						/>
					))}
				</svg>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-around",
						height: `${treeHeight}px`,
					}}
				>
					{shown.map((output) => (
						<span
							key={output}
							className="meta"
							style={{ color: "var(--ink-muted)" }}
						>
							{output.toUpperCase()}
						</span>
					))}
				</div>
				<span
					className="mono"
					style={{ fontSize: "var(--mono-size)", color: "var(--accent)" }}
				>
					{direct.length} DIRECT {direct.length === 1 ? "EDGE" : "EDGES"}
					{hidden > 0 ? ` · +${hidden} MORE` : ""}
				</span>
			</div>

			<div
				style={{
					borderTopWidth: "var(--rule-width)",
					borderTopStyle: "solid",
					borderTopColor: "var(--rule)",
					paddingTop: "var(--space-base)",
					display: "flex",
					flexDirection: "column",
					gap: "calc(var(--space-base) / 2)",
				}}
			>
				<span
					className="meta"
					style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
				>
					TWO-HOP LINEAGE — ROUTES THE ENGINE FOUND
				</span>
				{twoHop.length === 0 ? (
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: 0,
						}}
					>
						Every reachable format from {active.toUpperCase()} is one hop away.
						Pick a richer source to watch the router chain tools.
					</p>
				) : (
					twoHop.map((chain) => (
						<div
							key={`${chain.via}-${chain.to}`}
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
								display: "flex",
								gap: "var(--space-base)",
								flexWrap: "wrap",
								alignItems: "baseline",
							}}
						>
							<span style={{ color: "var(--ink)" }}>
								{active.toUpperCase()} ➔ {chain.via.toUpperCase()} ➔{" "}
								{chain.to.toUpperCase()}
							</span>
							<span style={{ color: "var(--rule-strong)" }}>{chain.tools}</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
