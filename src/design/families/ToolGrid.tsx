"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ToolsDualMarquee } from "@/components/home/ToolsDualMarquee";
import type { Tool } from "@/core/registry";
import { FusedHeadline } from "./FusedHeadline";

type Props = {
	tools: Tool[];
	/** The small label above the headline, e.g. "Every tool, no menu". */
	eyebrow: string;
	/** The fused headline's two clauses -- see `FusedHeadline`. */
	title: { lead: string; cont: string };
};

const CATEGORIES = [
	{ id: "all", label: "ALL" },
	{ id: "image", label: "IMAGE" },
	{ id: "video", label: "VIDEO" },
	{ id: "audio", label: "AUDIO" },
	{ id: "document", label: "DOCUMENT" },
	{ id: "data", label: "DATA" },
] as const;

export function ToolGrid({ tools, eyebrow, title }: Props) {
	const [activeCat, setActiveCat] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	const filteredTools = useMemo(() => {
		let list = tools;
		if (activeCat !== "all") {
			list = list.filter((t) => t.category === activeCat);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(t) =>
					t.name.toLowerCase().includes(q) ||
					t.id.toLowerCase().includes(q) ||
					t.accept.ext.some((ext) => ext.toLowerCase().includes(q)) ||
					t.output.ext.toLowerCase().includes(q),
			);
		}
		return list;
	}, [tools, activeCat, searchQuery]);

	if (tools.length === 0) return null;

	return (
		<section
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
				}}
			>
				<p className="meta" style={{ color: "var(--ink-muted)", margin: 0 }}>
					{eyebrow}
				</p>
				<FusedHeadline lead={title.lead} cont={title.cont} />
			</div>

			{/* Creative Dual-Direction Tool Marquee */}
			<div className="w-full rounded-[var(--radius)] border border-rule bg-surface p-[var(--gap-sm)] flex flex-col gap-[var(--space-base)]">
				<div className="flex items-center justify-between text-xs mono">
					<span
						className="flex items-center gap-2"
						style={{ color: "var(--accent)" }}
					>
						<span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
						LIVE REGISTRY STREAM {"//"} 273 DUAL-DIRECTION CONVERTERS
					</span>
					<span
						style={{ color: "var(--ink-muted)" }}
						className="hidden sm:inline-block"
					>
						HOVER TO PAUSE STREAM
					</span>
				</div>
				<ToolsDualMarquee />
			</div>

			{/* Interactive Filter & Search Bar */}
			<div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[var(--space-base)] p-[var(--space-base)] rounded-[var(--radius)] border border-rule bg-ground">
				{/* Category Chips */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{CATEGORIES.map((cat) => {
						const count =
							cat.id === "all"
								? tools.length
								: tools.filter((t) => t.category === cat.id).length;
						const isSelected = activeCat === cat.id;
						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => setActiveCat(cat.id)}
								className={`mono text-xs px-2.5 py-1 rounded-[var(--radius-control)] border transition-colors cursor-pointer ${
									isSelected
										? "bg-ink text-ground border-ink font-semibold"
										: "bg-surface text-ink-muted border-rule hover:text-ink hover:border-ink"
								}`}
							>
								{cat.label} [{count}]
							</button>
						);
					})}
				</div>

				{/* Search Field */}
				<div className="relative min-w-48">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Filter tools..."
						aria-label="Filter conversion tools"
						className="w-full mono text-xs px-2.5 py-1 rounded-[var(--radius-control)] border border-rule bg-surface text-ink placeholder:text-ink-muted outline-none focus:border-ink"
					/>
				</div>
			</div>

			{/* Filter Result Count */}
			<div className="flex items-center justify-between text-xs mono">
				<span style={{ color: "var(--ink-muted)" }}>
					SHOWING {filteredTools.length} OF {tools.length} CLIENT-SIDE TOOLS
				</span>
				{(activeCat !== "all" || searchQuery) && (
					<button
						type="button"
						onClick={() => {
							setActiveCat("all");
							setSearchQuery("");
						}}
						className="mono text-xs cursor-pointer hover:underline"
						style={{
							color: "var(--accent)",
							background: "none",
							border: "none",
						}}
					>
						[RESET FILTERS]
					</button>
				)}
			</div>

			{/* Full Tool Pills Matrix */}
			<div className="flex flex-wrap gap-2">
				{filteredTools.map((tool) => (
					<Link
						key={tool.id}
						href={`/${tool.id}`}
						className="mono text-xs px-3 py-1.5 rounded-[var(--radius-control)] border border-rule bg-surface text-ink-muted hover:text-ink hover:border-ink transition-colors inline-flex items-center gap-1.5"
						style={{ textDecoration: "none" }}
					>
						<span style={{ color: "var(--ink)", fontWeight: 500 }}>
							{tool.accept.ext[0]?.toUpperCase() ?? "IN"}
						</span>
						<span style={{ color: "var(--rule-strong)" }} aria-hidden="true">
							➔
						</span>
						<span style={{ color: "var(--ink)", fontWeight: 500 }}>
							{tool.output.ext.toUpperCase()}
						</span>
					</Link>
				))}
			</div>
		</section>
	);
}
