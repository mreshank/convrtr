import Link from "next/link";
import { TOOLS } from "@/core/registry";

// Curated high-impact tool pipelines representing the 273 client-side tools
const ROW_ONE_IDS = [
	"heic-to-jpg",
	"mp4-to-mp3",
	"pdf-to-png",
	"webp-to-png",
	"mkv-to-mp4",
	"wav-to-mp3",
	"csv-to-parquet",
	"avif-to-jpg",
	"flac-to-wav",
	"mov-to-mp4",
	"png-to-webp",
	"mp4-to-gif",
	"svg-to-png",
	"heic-to-png",
	"opus-to-mp3",
];

const ROW_TWO_IDS = [
	"epub-to-pdf",
	"json-to-csv",
	"flac-to-mp3",
	"pdf-to-jpg",
	"parquet-to-csv",
	"gif-to-mp4",
	"tiff-to-png",
	"m4a-to-mp3",
	"docx-to-pdf",
	"wav-to-flac",
	"webp-to-jpg",
	"avi-to-mp4",
	"csv-to-json",
	"png-to-svg",
	"aac-to-wav",
];

function getToolSafe(id: string) {
	const found = TOOLS.find((t) => t.id === id);
	if (found) return found;
	// Fallback representation if tool id format varies
	const parts = id.split("-to-");
	return {
		id,
		name: id.toUpperCase().replace(/-/g, " "),
		inputFormat: parts[0] ?? "raw",
		outputFormat: parts[1] ?? "out",
		category: "utility",
	};
}

const ROW_ONE_TOOLS = ROW_ONE_IDS.map(getToolSafe);
const ROW_TWO_TOOLS = ROW_TWO_IDS.map(getToolSafe);

function ToolChip({
	tool,
}: {
	tool: {
		id: string;
		name: string;
		inputFormat: string;
		outputFormat: string;
		category: string;
	};
}) {
	return (
		<Link
			href={`/${tool.id}`}
			className="shrink-0 group inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-control)] border border-rule bg-ground hover:border-ink transition-colors"
			style={{ textDecoration: "none" }}
		>
			<span
				className="w-1.5 h-1.5 rounded-full"
				style={{ backgroundColor: "var(--accent)" }}
				aria-hidden="true"
			/>
			<span
				className="mono text-xs font-semibold"
				style={{ color: "var(--ink)", letterSpacing: "0.04em" }}
			>
				{tool.inputFormat.toUpperCase()}
			</span>
			<span
				className="mono text-xs"
				style={{ color: "var(--ink-muted)" }}
				aria-hidden="true"
			>
				➔
			</span>
			<span
				className="mono text-xs font-semibold"
				style={{ color: "var(--ink)", letterSpacing: "0.04em" }}
			>
				{tool.outputFormat.toUpperCase()}
			</span>
			<span
				className="mono text-[10px] px-1 py-0.5 rounded-[var(--radius-control)] border border-rule-subtle bg-surface text-ink-muted group-hover:text-ink hidden sm:inline-block"
				style={{ letterSpacing: "0.02em" }}
			>
				{tool.category.toUpperCase()}
			</span>
		</Link>
	);
}

function DualTrack({
	tools,
	reverse = false,
}: {
	tools: typeof ROW_ONE_TOOLS;
	reverse?: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				gap: "var(--gap-sm)",
				overflow: "hidden",
				width: "100%",
				userSelect: "none",
			}}
		>
			<div
				data-marquee
				style={{
					display: "flex",
					gap: "var(--gap-sm)",
					flexShrink: 0,
					animationName: "marquee-scroll",
					animationDuration: "50s",
					animationTimingFunction: "linear",
					animationIterationCount: "infinite",
					animationDirection: reverse ? "reverse" : "normal",
				}}
			>
				{tools.map((tool) => (
					<ToolChip key={`${tool.id}-${reverse ? "rev" : "fwd"}`} tool={tool} />
				))}
			</div>
			<div
				data-marquee
				aria-hidden="true"
				inert={true}
				style={{
					display: "flex",
					gap: "var(--gap-sm)",
					flexShrink: 0,
					animationName: "marquee-scroll",
					animationDuration: "50s",
					animationTimingFunction: "linear",
					animationIterationCount: "infinite",
					animationDirection: reverse ? "reverse" : "normal",
				}}
			>
				{tools.map((tool) => (
					<ToolChip
						key={`${tool.id}-dup-${reverse ? "rev" : "fwd"}`}
						tool={tool}
					/>
				))}
			</div>
		</div>
	);
}

export function ToolsDualMarquee() {
	return (
		<div className="w-full flex flex-col gap-[var(--space-base)] py-[var(--space-base)]">
			<DualTrack tools={ROW_ONE_TOOLS} reverse={false} />
			<DualTrack tools={ROW_TWO_TOOLS} reverse={true} />
		</div>
	);
}
