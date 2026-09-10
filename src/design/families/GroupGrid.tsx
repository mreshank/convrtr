"use client";

import Link from "next/link";
import { useState } from "react";

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

/**
 * `/groups`' interactive card grid:
 * When closed, displays groups in a multi-column responsive grid.
 * When a group is clicked, it expands as a spacious master-detail workspace
 * on the side (docked right by default, with left dock toggle) instead of
 * an in-place accordion that disrupts the grid flow.
 *
 * The expanded workspace utilizes horizontal screen space with a multi-column
 * tool cards grid, format conversion badges, search filter, and direct hub links.
 */
export function GroupGrid({ items, defaultSide = "right" }: Props) {
	const [openHref, setOpenHref] = useState<string | null>(null);
	const [panelSide, setPanelSide] = useState<"right" | "left">(defaultSide);
	const [filter, setFilter] = useState("");

	const activeItem = items.find((item) => item.href === openHref);

	const displayedTools = activeItem
		? activeItem.tools.filter((tool) => {
				if (!filter.trim()) return true;
				const q = filter.toLowerCase();
				return (
					tool.title.toLowerCase().includes(q) ||
					(tool.acceptExt &&
						tool.acceptExt.some((e) => e.toLowerCase().includes(q))) ||
					(tool.outputExt && tool.outputExt.toLowerCase().includes(q)) ||
					(tool.kind && tool.kind.toLowerCase().includes(q))
				);
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
				{items.map((item) => (
					<button
						key={item.href}
						type="button"
						aria-expanded={false}
						onClick={() => {
							setOpenHref(item.href);
							setFilter("");
						}}
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
							gap: "var(--space-base)",
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
						<span
							style={{
								fontSize: "var(--label-size)",
								fontWeight: "var(--label-weight)",
								letterSpacing: "var(--label-tracking)",
							}}
						>
							{item.title}
						</span>
						{item.meta ? (
							<span className="mono" style={{ color: "var(--ink-muted)" }}>
								{item.meta}
							</span>
						) : null}
						{item.description ? (
							<span style={{ color: "var(--ink-muted)" }}>
								{item.description}
							</span>
						) : null}
					</button>
				))}
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
							borderColor: isOpen ? "var(--ink)" : "var(--rule)",
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
						{item.meta ? (
							<span className="mono" style={{ color: "var(--ink-muted)" }}>
								{item.meta}
							</span>
						) : null}
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
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				padding: "var(--gap-md)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				background: "var(--surface)",
				minWidth: 0,
			}}
		>
			<div
				style={{
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
								style={{ color: "var(--accent)", fontSize: "13px" }}
							>
								{activeItem.meta}
							</span>
						) : null}
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
							background: "transparent",
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
							background: "transparent",
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

			{activeItem.tools.length > 4 ? (
				<div>
					<input
						type="text"
						placeholder={`Search ${activeItem.tools.length} conversions...`}
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
				</div>
			) : null}

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
					gap: "var(--gap-sm)",
				}}
			>
				{displayedTools.map((tool) => (
					<Link
						key={tool.href}
						href={tool.href}
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
								style={{ color: "var(--ink-muted)", fontSize: "13px" }}
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
									style={{ fontSize: "11px", color: "var(--accent)" }}
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
									style={{ fontSize: "11px", color: "var(--accent)" }}
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
					paddingTop: "var(--space-base)",
					borderTop: "var(--rule-width) solid var(--rule)",
				}}
			>
				<Link
					href={activeItem.href}
					className="mono"
					style={{ color: "var(--ink-muted)", fontSize: "13px" }}
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
