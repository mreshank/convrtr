"use client";

import Link from "next/link";
import { useState } from "react";

export type GroupGridItem = {
	href: string;
	title: string;
	meta?: string;
	description?: string;
	tools: { href: string; title: string }[];
};

type Props = {
	items: GroupGridItem[];
};

/**
 * `/groups`' card grid: the 2D replacement for `ListingRows`' single ruled
 * list, so a reader sees distinct groups laid out in space rather than one
 * flat stack. One cell is open at a time -- `openHref` is a single value,
 * not a set -- so expanding a second group visibly replaces the first
 * rather than piling panels on top of each other.
 *
 * Registry derivation stays out of this file, same as every sibling family:
 * the route (`/groups/page.tsx`) builds `GroupGridItem[]` from
 * `deriveFormatGroups()`/`deriveTaskGroups()` and hands it over as data.
 */
export function GroupGrid({ items }: Props) {
	const [openHref, setOpenHref] = useState<string | null>(null);

	return (
		<div
			data-group-grid
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(var(--grid-cols), minmax(0, 1fr))",
				gap: "var(--gap-sm)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{items.map((item) => {
				const isOpen = openHref === item.href;
				return (
					<div
						key={item.href}
						style={{
							display: "flex",
							flexDirection: "column",
							gridColumn: isOpen ? "1 / -1" : undefined,
						}}
					>
						<button
							type="button"
							aria-expanded={isOpen}
							onClick={() => setOpenHref(isOpen ? null : item.href)}
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
								borderRadius: "var(--radius-card)",
								color: "var(--ink)",
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

						{isOpen ? (
							<section
								aria-label={item.title}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "var(--space-base)",
									padding: "var(--gap-sm)",
									borderWidth:
										"0 var(--rule-width) var(--rule-width) var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									borderRadius: "0 0 var(--radius-card) var(--radius-card)",
								}}
							>
								{item.tools.map((tool) => (
									<Link
										key={tool.href}
										href={tool.href}
										style={{ color: "var(--ink)" }}
									>
										{tool.title}
									</Link>
								))}
								<Link
									href={item.href}
									className="mono"
									style={{ color: "var(--ink-muted)" }}
								>
									View all →
								</Link>
							</section>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
