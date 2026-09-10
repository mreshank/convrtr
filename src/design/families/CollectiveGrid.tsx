"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

export type CollectiveToolItem = {
	id: string;
	name: string;
	fromExt?: string;
	toExt?: string;
	href: string;
};

export type CollectiveGridItem = {
	slug: string;
	title: string;
	why: string;
	hasDemo?: boolean;
	tools: CollectiveToolItem[];
};

type Props = {
	collectives: CollectiveGridItem[];
};

export function CollectiveGrid({ collectives }: Props) {
	const searchId = useId();
	const [query, setQuery] = useState("");

	const filteredCollectives = useMemo(() => {
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) return collectives;

		const tokens = trimmed.split(/\s+/).filter(Boolean);
		return collectives.filter((c) => {
			const haystack = [
				c.title,
				c.why,
				c.slug,
				...c.tools.map(
					(t) => `${t.id} ${t.name} ${t.fromExt ?? ""} ${t.toExt ?? ""}`,
				),
			]
				.join(" ")
				.toLowerCase();

			return tokens.every((token) => haystack.includes(token));
		});
	}, [collectives, query]);

	const isFiltered = query.trim().length > 0;

	return (
		<div
			data-collective-grid
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			{/* Search & Filter Toolbar */}
			<div
				data-collective-toolbar
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
					border: "var(--rule-width) solid var(--rule)",
					background: "var(--surface)",
					padding: "var(--gap-md)",
				}}
			>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "var(--gap-sm)",
					}}
				>
					<div
						style={{
							position: "relative",
							flex: "1 1 300px",
							display: "flex",
							alignItems: "center",
						}}
					>
						<label htmlFor={searchId} className="sr-only">
							Search collectives
						</label>
						<input
							id={searchId}
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by mission, tool name, or format (e.g. WAV, MP3, EXIF, metadata)…"
							className="mono"
							style={{
								width: "100%",
								background: "var(--ground)",
								border: "var(--rule-width) solid var(--rule)",
								color: "var(--ink)",
								fontSize: "var(--mono-size)",
								padding: "var(--space-base) var(--gap-sm)",
								borderRadius: "var(--radius)",
								outline: "none",
							}}
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery("")}
								aria-label="Clear search query"
								className="mono"
								style={{
									position: "absolute",
									right: "var(--space-base)",
									background: "transparent",
									border: "none",
									color: "var(--ink-muted)",
									cursor: "pointer",
									fontSize: "var(--mono-size)",
									padding: "0 var(--space-base)",
								}}
							>
								✕
							</button>
						)}
					</div>

					<p
						data-count
						className="mono"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
							margin: 0,
						}}
					>
						{isFiltered
							? `SHOWING ${filteredCollectives.length} OF ${collectives.length} COLLECTIVES`
							: `${collectives.length} CURATED COLLECTIVES`}
					</p>
				</div>
			</div>

			{/* Cards Grid */}
			{filteredCollectives.length > 0 ? (
				<div
					data-collective-cards
					style={{
						gap: "var(--gap-md)",
						width: "100%",
					}}
				>
					{filteredCollectives.map((collective, index) => (
						<article
							key={collective.slug}
							data-collective-card
							style={{
								background: "var(--surface)",
								border: "var(--rule-width) solid var(--rule)",
								padding: "var(--gap-md)",
								display: "flex",
								flexDirection: "column",
								gap: "var(--gap-md)",
								borderRadius: "var(--radius)",
								position: "relative",
							}}
						>
							{/* Card Header: Index & Live Demo Tag */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "var(--gap-sm)",
								}}
							>
								<span
									className="mono"
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--mono-size)",
									}}
								>
									{`COLLECTIVE // 0${index + 1}`}
								</span>

								{collective.hasDemo && (
									<span
										className="mono"
										style={{
											color: "var(--accent)",
											fontSize: "var(--mono-size)",
											display: "inline-flex",
											alignItems: "center",
											gap: "var(--space-base)",
										}}
									>
										<span aria-hidden="true">●</span>
										{"LIVE DEMO INCLUDED"}
									</span>
								)}
							</div>

							{/* Title */}
							<h2
								style={{
									fontSize: "var(--headline-size)",
									fontWeight: 400,
									letterSpacing: "var(--headline-tracking)",
									lineHeight: "var(--display-leading)",
									margin: 0,
								}}
							>
								<Link
									href={`/collectives/${collective.slug}`}
									style={{
										color: "var(--ink)",
										textDecoration: "none",
										display: "inline-flex",
										alignItems: "baseline",
										gap: "var(--space-base)",
									}}
								>
									<span>{collective.title}</span>
									<ArrowUpRight size={14} />
								</Link>
							</h2>

							{/* Editorial Rationale: Why */}
							<div
								style={{
									background: "var(--ground)",
									borderLeft: "1px solid var(--accent)",
									padding: "var(--gap-sm)",
									display: "flex",
									flexDirection: "column",
									gap: "var(--space-base)",
								}}
							>
								<span
									className="meta"
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--mono-size)",
									}}
								>
									EDITORIAL MISSION
								</span>
								<p
									style={{
										color: "var(--ink)",
										fontSize: "var(--body-size)",
										lineHeight: "var(--body-leading)",
										margin: 0,
									}}
								>
									{collective.why}
								</p>
							</div>

							{/* Included Workflow Tools Strip */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "var(--gap-sm)",
									marginTop: "auto",
									paddingTop: "var(--gap-sm)",
									borderTop: "var(--rule-width) solid var(--rule)",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<span
										className="meta"
										style={{
											color: "var(--ink-muted)",
											fontSize: "var(--mono-size)",
										}}
									>
										{`WORKFLOW PIPELINE (${collective.tools.length} TOOLS)`}
									</span>
								</div>

								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "var(--space-base)",
									}}
								>
									{collective.tools.map((tool, toolIdx) => (
										<div
											key={tool.id}
											data-collective-tool-row
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "var(--gap-sm)",
												background: "var(--ground)",
												border: "var(--rule-width) solid var(--rule)",
												padding: "var(--space-base) var(--gap-sm)",
												transition: "border-color var(--dur-hover) var(--ease)",
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "var(--gap-sm)",
													minWidth: 0,
												}}
											>
												<span
													className="mono"
													style={{
														color: "var(--ink-muted)",
														fontSize: "var(--mono-size)",
													}}
												>
													{`0${toolIdx + 1}`}
												</span>
												<Link
													href={tool.href}
													style={{
														color: "var(--ink)",
														textDecoration: "none",
														fontSize: "var(--body-size)",
														whiteSpace: "nowrap",
														overflow: "hidden",
														textOverflow: "ellipsis",
													}}
												>
													{tool.name}
												</Link>
											</div>

											{tool.fromExt && tool.toExt && (
												<span
													className="mono"
													style={{
														color: "var(--ink-muted)",
														fontSize: "var(--mono-size)",
														whiteSpace: "nowrap",
													}}
												>
													{`${tool.fromExt.toUpperCase()} → ${tool.toExt.toUpperCase()}`}
												</span>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Collective Link Button */}
							<div
								style={{
									display: "flex",
									justifyContent: "flex-end",
								}}
							>
								<Link
									href={`/collectives/${collective.slug}`}
									className="mono"
									style={{
										background: "var(--ink)",
										color: "var(--ground)",
										textDecoration: "none",
										padding: "var(--space-base) var(--gap-md)",
										fontSize: "var(--mono-size)",
										fontWeight: 600,
										display: "inline-flex",
										alignItems: "center",
										gap: "var(--space-base)",
										borderRadius: "var(--radius)",
									}}
								>
									<span>View full suite</span>
									<ArrowUpRight size={14} />
								</Link>
							</div>
						</article>
					))}
				</div>
			) : (
				<div
					style={{
						border: "var(--rule-width) solid var(--rule)",
						background: "var(--surface)",
						padding: "var(--gap-lg) var(--gap-md)",
						textAlign: "center",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "var(--gap-sm)",
					}}
				>
					<p
						className="mono"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
						}}
					>
						[NO_COLLECTIVE_MATCH]
					</p>
					<p style={{ color: "var(--ink)", margin: 0 }}>
						No collectives matched your search query.
					</p>
					<button
						type="button"
						onClick={() => setQuery("")}
						className="mono"
						style={{
							marginTop: "var(--gap-sm)",
							background: "var(--ink)",
							color: "var(--ground)",
							border: "none",
							padding: "var(--space-base) var(--gap-md)",
							cursor: "pointer",
							fontSize: "var(--mono-size)",
							borderRadius: "var(--radius)",
							fontWeight: 600,
						}}
					>
						Clear search
					</button>
				</div>
			)}
		</div>
	);
}
