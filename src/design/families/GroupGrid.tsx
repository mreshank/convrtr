"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HALFTONE_FRAGMENT, ShaderSurface } from "@/design/texture";

export type GroupGridToolItem = {
	href: string;
	title: string;
	kind?: string;
	category?: string;
	acceptExt?: string[];
	outputExt?: string;
};

export type GroupGridItem = {
	href: string;
	title: string;
	meta?: string;
	description?: string;
	tools: GroupGridToolItem[];
};

type Props = {
	items: GroupGridItem[];
	defaultSide?: "right" | "left";
};

/** Computes Levenshtein edit distance between two strings for typo tolerance. */
function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	let prev = new Array<number>(n + 1);
	let curr = new Array<number>(n + 1);

	for (let j = 0; j <= n; j++) prev[j] = j;

	for (let i = 1; i <= m; i++) {
		curr[0] = i;
		const charA = a[i - 1];
		for (let j = 1; j <= n; j++) {
			const cost = charA === b[j - 1] ? 0 : 1;
			const del = (prev[j] ?? 0) + 1;
			const ins = (curr[j - 1] ?? 0) + 1;
			const sub = (prev[j - 1] ?? 0) + cost;
			curr[j] = Math.min(del, ins, sub);
		}
		const temp = prev;
		prev = curr;
		curr = temp;
	}
	return prev[n] ?? 0;
}

/** Fuzzy matches a tool item against user query. */
function matchesToolFuzzy(tool: GroupGridToolItem, query: string): boolean {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return true;
	const tokens = trimmed.split(/\s+/).filter(Boolean);

	const title = tool.title.toLowerCase();
	const from = (tool.acceptExt || []).join(" ").toLowerCase();
	const to = (tool.outputExt || "").toLowerCase();
	const kind = (tool.kind || "").toLowerCase();
	const category = (tool.category || "").toLowerCase();
	const haystack = `${title} ${from} ${to} ${kind} ${category}`;

	return tokens.every((token) => {
		if (haystack.includes(token)) return true;
		if (token.length >= 4) {
			const words = haystack.split(/\W+/).filter(Boolean);
			for (const w of words) {
				if (w.length >= 4) {
					const dist = levenshtein(token, w);
					if (dist <= 1) {
						if (
							token.length >= 5 ||
							w.length >= 5 ||
							Math.abs(token.length - w.length) === 1
						) {
							return true;
						}
					}
				}
			}
		}
		return false;
	});
}

/**
 * `/groups`' interactive card grid:
 * When closed, displays groups in a multi-column responsive grid with
 * live conversion counts, category badges, and format transformation preview pills.
 * When a group is clicked, it expands as a spacious master-detail workspace
 * on the side with ambient halftone texture, fuzzy search, format filter chips,
 * and direct hub links.
 */
export function GroupGrid({ items, defaultSide = "right" }: Props) {
	const [openHref, setOpenHref] = useState<string | null>(null);
	const [panelSide, setPanelSide] = useState<"right" | "left">(defaultSide);
	const [filter, setFilter] = useState("");
	const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

	const activeItem = items.find((item) => item.href === openHref);

	const availableFormats = useMemo(() => {
		if (!activeItem) return [];
		const set = new Set<string>();
		for (const t of activeItem.tools) {
			if (t.acceptExt) {
				for (const ext of t.acceptExt) set.add(ext.toUpperCase());
			}
			if (t.outputExt) set.add(t.outputExt.toUpperCase());
		}
		return Array.from(set).sort();
	}, [activeItem]);

	const displayedTools = activeItem
		? activeItem.tools.filter((tool) => {
				if (selectedFormat) {
					const matchFrom = tool.acceptExt?.some(
						(e) => e.toUpperCase() === selectedFormat,
					);
					const matchTo = tool.outputExt?.toUpperCase() === selectedFormat;
					if (!matchFrom && !matchTo) return false;
				}
				return matchesToolFuzzy(tool, filter);
			})
		: [];

	if (!activeItem) {
		return (
			<div
				data-group-grid
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(var(--grid-cols), minmax(0, 1fr))",
					gap: "var(--gap-sm)",
					width: "100%",
					maxWidth: "var(--max-width)",
					margin: "0 auto",
				}}
			>
				{items.map((item) => {
					const formatPreviews = item.tools
						.filter((t) => t.acceptExt && t.outputExt)
						.slice(0, 3)
						.map(
							(t) =>
								`${t.acceptExt?.[0]?.toUpperCase()} → ${t.outputExt?.toUpperCase()}`,
						);
					const previewChips =
						formatPreviews.length > 0
							? formatPreviews
							: item.tools.slice(0, 2).map((t) => t.title);
					const remainingCount = item.tools.length - previewChips.length;

					return (
						<button
							key={item.href}
							type="button"
							aria-expanded={false}
							onClick={() => {
								setOpenHref(item.href);
								setFilter("");
								setSelectedFormat(null);
							}}
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "stretch",
								justifyContent: "space-between",
								gap: "var(--gap-sm)",
								padding: "var(--gap-sm)",
								textAlign: "left",
								background: "transparent",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								color: "var(--ink)",
								cursor: "pointer",
								transition:
									"border-color var(--dur-hover) var(--ease), background-color var(--dur-hover) var(--ease)",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "var(--space-base)",
								}}
							>
								{/* Header metadata row */}
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										width: "100%",
									}}
								>
									{item.meta ? (
										<span
											className="mono"
											style={{
												fontSize: "11px",
												letterSpacing: "var(--label-tracking)",
												color: "var(--accent)",
												borderWidth: "var(--rule-width)",
												borderStyle: "solid",
												borderColor: "var(--rule)",
												padding: "0 var(--space-base)",
												background: "var(--surface)",
											}}
										>
											{item.meta.toUpperCase()}
										</span>
									) : (
										<span />
									)}
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "var(--space-base)",
										}}
									>
										<span
											style={{
												width: "var(--space-base)",
												height: "var(--space-base)",
												borderRadius: "50%",
												background: "var(--accent)",
												display: "inline-block",
											}}
										/>
										<span
											className="mono"
											style={{
												fontSize: "11px",
												color: "var(--ink-muted)",
												letterSpacing: "var(--label-tracking)",
											}}
										>
											{item.tools.length} CONVERSIONS
										</span>
									</div>
								</div>

								{/* Title & Description */}
								<span
									style={{
										fontSize: "var(--label-size)",
										fontWeight: "var(--label-weight)",
										letterSpacing: "var(--label-tracking)",
										color: "var(--ink)",
									}}
								>
									{item.title}
								</span>
								{item.description ? (
									<span
										style={{
											color: "var(--ink-muted)",
											fontSize: "13px",
											lineHeight: "var(--body-leading)",
										}}
									>
										{item.description}
									</span>
								) : null}

								{/* Preview format chips */}
								{previewChips.length > 0 ? (
									<div
										style={{
											display: "flex",
											flexWrap: "wrap",
											gap: "var(--space-base)",
											alignItems: "center",
											paddingTop: "var(--space-base)",
										}}
									>
										{previewChips.map((chip) => (
											<span
												key={chip}
												className="mono"
												style={{
													fontSize: "11px",
													padding: "0 var(--space-base)",
													background: "var(--surface)",
													borderWidth: "var(--rule-width)",
													borderStyle: "solid",
													borderColor: "var(--rule)",
													color: "var(--ink)",
												}}
											>
												{chip}
											</span>
										))}
										{remainingCount > 0 ? (
											<span
												className="mono"
												style={{
													fontSize: "11px",
													color: "var(--ink-muted)",
												}}
											>
												+{remainingCount} MORE
											</span>
										) : null}
									</div>
								) : null}
							</div>

							{/* Card footer prompt */}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									width: "100%",
									paddingTop: "var(--space-base)",
									borderTop: "var(--rule-width) solid var(--rule)",
								}}
							>
								<span
									className="mono"
									style={{
										fontSize: "11px",
										color: "var(--accent)",
										letterSpacing: "var(--label-tracking)",
									}}
								>
									EXPAND WORKSPACE
								</span>
								<span
									aria-hidden="true"
									style={{
										fontSize: "11px",
										color: "var(--accent)",
									}}
								>
									↘
								</span>
							</div>
						</button>
					);
				})}
			</div>
		);
	}

	const listNode = (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-sm)",
			}}
		>
			{items.map((item) => {
				const isOpen = item.href === openHref;
				return (
					<button
						key={item.href}
						type="button"
						aria-expanded={isOpen}
						onClick={() => {
							if (isOpen) {
								setOpenHref(null);
							} else {
								setOpenHref(item.href);
								setFilter("");
								setSelectedFormat(null);
							}
						}}
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
							gap: "var(--space-base)",
							padding: "var(--gap-sm)",
							textAlign: "left",
							background: isOpen ? "var(--surface)" : "transparent",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: isOpen ? "var(--accent)" : "var(--rule)",
							color: "var(--ink)",
							cursor: "pointer",
							transition:
								"border-color var(--dur-hover) var(--ease), background-color var(--dur-hover) var(--ease)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								width: "100%",
							}}
						>
							<span
								style={{
									fontSize: "var(--label-size)",
									fontWeight: "var(--label-weight)",
									letterSpacing: "var(--label-tracking)",
								}}
							>
								{item.title}
							</span>
							{isOpen ? (
								<span
									className="mono"
									style={{
										fontSize: "11px",
										color: "var(--accent)",
									}}
								>
									{panelSide === "left" ? "← Active" : "Active →"}
								</span>
							) : null}
						</div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								width: "100%",
							}}
						>
							{item.meta ? (
								<span
									className="mono"
									style={{ color: "var(--ink-muted)", fontSize: "11px" }}
								>
									{item.meta}
								</span>
							) : (
								<span />
							)}
							<span
								className="mono"
								style={{ color: "var(--ink-muted)", fontSize: "11px" }}
							>
								{item.tools.length} tools
							</span>
						</div>
						{item.description ? (
							<span style={{ color: "var(--ink-muted)", fontSize: "13px" }}>
								{item.description}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);

	const panelNode = (
		<section
			aria-label={activeItem.title}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				background: "var(--surface)",
				minWidth: 0,
			}}
		>
			{/* Ambient texture workspace header */}
			<div
				style={{
					position: "relative",
					overflow: "hidden",
					padding: "var(--gap-md)",
					borderBottom: "var(--rule-width) solid var(--rule)",
					background: "var(--surface)",
				}}
			>
				<ShaderSurface
					fragment={HALFTONE_FRAGMENT}
					intensity={0.16}
					label="group-workspace-halftone"
				/>
				<div
					style={{
						position: "relative",
						zIndex: 1,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						gap: "var(--gap-sm)",
						flexWrap: "wrap",
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<h2
							style={{
								fontSize: "28px",
								fontWeight: 400,
								letterSpacing: "var(--headline-tracking)",
								color: "var(--ink)",
								margin: 0,
							}}
						>
							{activeItem.title}
						</h2>
						<div
							style={{
								display: "flex",
								gap: "var(--gap-sm)",
								alignItems: "center",
								flexWrap: "wrap",
							}}
						>
							{activeItem.meta ? (
								<span
									className="mono"
									style={{
										color: "var(--accent)",
										fontSize: "11px",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										padding: "0 var(--space-base)",
										background: "var(--ground)",
									}}
								>
									{activeItem.meta}
								</span>
							) : null}
							<span
								className="mono"
								style={{ color: "var(--ink-muted)", fontSize: "11px" }}
							>
								{activeItem.tools.length} CONVERSIONS AVAILABLE
							</span>
							{activeItem.description ? (
								<span style={{ color: "var(--ink-muted)", fontSize: "13px" }}>
									{activeItem.description}
								</span>
							) : null}
						</div>
					</div>

					<div
						style={{
							display: "flex",
							gap: "var(--space-base)",
							alignItems: "center",
						}}
					>
						<button
							type="button"
							onClick={() =>
								setPanelSide(panelSide === "right" ? "left" : "right")
							}
							aria-label={`Dock panel ${panelSide === "right" ? "left" : "right"}`}
							style={{
								padding: "var(--space-base)",
								fontSize: "12px",
								background: "var(--ground)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								color: "var(--ink-muted)",
								cursor: "pointer",
							}}
						>
							{panelSide === "right" ? "← Dock Left" : "Dock Right →"}
						</button>
						<button
							type="button"
							onClick={() => setOpenHref(null)}
							aria-label="Close panel"
							style={{
								padding: "var(--space-base)",
								fontSize: "12px",
								background: "var(--ground)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								color: "var(--ink-muted)",
								cursor: "pointer",
							}}
						>
							✕ Close
						</button>
					</div>
				</div>
			</div>

			{/* Search & Filter Toolbar */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
					padding: "0 var(--gap-md)",
				}}
			>
				{activeItem.tools.length > 4 ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<input
							type="text"
							placeholder={`Search ${activeItem.tools.length} conversions (supports typo fuzzy search)...`}
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							aria-label={`Filter ${activeItem.title} tools`}
							style={{
								width: "100%",
								padding: "var(--space-base) var(--gap-sm)",
								background: "var(--ground)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								color: "var(--ink)",
								fontSize: "14px",
								outline: "none",
								boxSizing: "border-box",
							}}
						/>

						{/* Format Quick Filter Pills */}
						{availableFormats.length > 1 && availableFormats.length <= 12 ? (
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: "var(--space-base)",
									alignItems: "center",
								}}
							>
								<span
									className="mono"
									style={{
										fontSize: "11px",
										color: "var(--ink-muted)",
										letterSpacing: "var(--label-tracking)",
									}}
								>
									FILTER BY FORMAT:
								</span>
								<button
									type="button"
									onClick={() => setSelectedFormat(null)}
									className="mono"
									style={{
										fontSize: "11px",
										padding: "0 var(--space-base)",
										background:
											selectedFormat === null ? "var(--ink)" : "var(--ground)",
										color:
											selectedFormat === null
												? "var(--ground)"
												: "var(--ink-muted)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor:
											selectedFormat === null ? "var(--ink)" : "var(--rule)",
										cursor: "pointer",
									}}
								>
									ALL
								</button>
								{availableFormats.map((fmt) => {
									const isSelected = selectedFormat === fmt;
									return (
										<button
											key={fmt}
											type="button"
											onClick={() => setSelectedFormat(isSelected ? null : fmt)}
											className="mono"
											style={{
												fontSize: "11px",
												padding: "0 var(--space-base)",
												background: isSelected
													? "var(--accent)"
													: "var(--ground)",
												color: isSelected ? "var(--ground)" : "var(--ink)",
												borderWidth: "var(--rule-width)",
												borderStyle: "solid",
												borderColor: isSelected
													? "var(--accent)"
													: "var(--rule)",
												cursor: "pointer",
											}}
										>
											{fmt}
										</button>
									);
								})}
							</div>
						) : null}

						{/* Readout */}
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span
								className="mono"
								style={{
									fontSize: "11px",
									color: "var(--ink-muted)",
									letterSpacing: "var(--label-tracking)",
								}}
							>
								SHOWING {displayedTools.length} OF {activeItem.tools.length}{" "}
								CONVERSIONS
							</span>
							{filter || selectedFormat ? (
								<button
									type="button"
									onClick={() => {
										setFilter("");
										setSelectedFormat(null);
									}}
									className="mono"
									style={{
										fontSize: "11px",
										color: "var(--accent)",
										background: "transparent",
										border: "none",
										cursor: "pointer",
										padding: 0,
									}}
								>
									RESET FILTERS
								</button>
							) : null}
						</div>
					</div>
				) : null}
			</div>

			{/* Tool Cards Grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
					gap: "var(--gap-sm)",
					padding: "0 var(--gap-md)",
				}}
			>
				{displayedTools.map((tool) => (
					<Link
						key={tool.href}
						href={tool.href}
						aria-label={tool.title}
						style={{
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-between",
							gap: "var(--space-base)",
							padding: "var(--gap-sm)",
							background: "var(--ground)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							color: "var(--ink)",
							textDecoration: "none",
							transition:
								"border-color var(--dur-hover) var(--ease), background-color var(--dur-hover) var(--ease)",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
								gap: "var(--space-base)",
							}}
						>
							<span
								style={{
									fontSize: "14px",
									fontWeight: 500,
									lineHeight: 1.3,
								}}
							>
								{tool.title}
							</span>
							<span
								aria-hidden="true"
								style={{ color: "var(--accent)", fontSize: "13px" }}
							>
								↗
							</span>
						</div>
						{tool.acceptExt && tool.outputExt ? (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "var(--space-base)",
								}}
							>
								<span
									className="mono"
									style={{
										fontSize: "11px",
										color: "var(--accent)",
										background: "var(--surface)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										padding: "0 var(--space-base)",
									}}
								>
									{tool.acceptExt.map((e) => e.toUpperCase()).join("/")}
								</span>
								<span
									style={{
										color: "var(--ink-muted)",
										fontSize: "10px",
									}}
								>
									→
								</span>
								<span
									className="mono"
									style={{
										fontSize: "11px",
										color: "var(--accent)",
										background: "var(--surface)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										padding: "0 var(--space-base)",
									}}
								>
									{tool.outputExt.toUpperCase()}
								</span>
							</div>
						) : tool.kind ? (
							<span
								className="mono"
								style={{ fontSize: "11px", color: "var(--ink-muted)" }}
							>
								{tool.kind.toUpperCase()}
							</span>
						) : null}
					</Link>
				))}
				{displayedTools.length === 0 ? (
					<p
						style={{
							color: "var(--ink-muted)",
							fontSize: "14px",
							gridColumn: "1 / -1",
							padding: "var(--gap-sm) 0",
						}}
					>
						No tools match &ldquo;{filter}&rdquo;
					</p>
				) : null}
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "var(--gap-sm) var(--gap-md)",
					borderTop: "var(--rule-width) solid var(--rule)",
				}}
			>
				<Link
					href={activeItem.href}
					className="mono"
					style={{ color: "var(--accent)", fontSize: "13px" }}
				>
					View all →
				</Link>
			</div>
		</section>
	);

	return (
		<div
			data-group-grid
			data-expanded="true"
			data-dock={panelSide}
			style={{
				display: "grid",
				gap: "var(--gap-md)",
				width: "100%",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				alignItems: "start",
			}}
		>
			{panelSide === "left" ? (
				<>
					{panelNode}
					{listNode}
				</>
			) : (
				<>
					{listNode}
					{panelNode}
				</>
			)}
		</div>
	);
}
