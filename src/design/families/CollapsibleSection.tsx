"use client";

import { type ReactNode, useId, useState } from "react";

type Props = {
	heading?: string;
	total?: number;
	unit?: string;
	defaultOpen?: boolean;
	children: ReactNode;
	className?: string;
};

/**
 * An interactive, collapsible section wrapper for hub listings and grids.
 *
 * Defaults to expanded (`defaultOpen = true`). When collapsed, shrinks to
 * a sleek disclosure trigger bar with smooth CSS grid-row transitions.
 */
export function CollapsibleSection({
	heading,
	total,
	unit,
	defaultOpen = true,
	children,
	className,
}: Props) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const generatedId = useId();
	const headingId = `collapsible-heading-${generatedId}`;
	const panelId = `collapsible-panel-${generatedId}`;

	return (
		<div
			data-collapsible-section
			className={className}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-sm)",
			}}
		>
			{heading ? (
				<button
					type="button"
					id={headingId}
					aria-expanded={isOpen}
					aria-controls={panelId}
					onClick={() => setIsOpen((open) => !open)}
					data-collapsible-trigger
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						width: "100%",
						padding: "var(--space-base) var(--gap-sm)",
						background: "var(--surface)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
						cursor: "pointer",
						textAlign: "left",
						transition:
							"border-color var(--dur-hover) var(--ease), background var(--dur-hover) var(--ease)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "var(--gap-sm)",
						}}
					>
						<svg
							data-collapsible-chevron
							aria-hidden="true"
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{
								transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
								transition: "transform var(--dur-state) var(--ease)",
								color: isOpen ? "var(--accent)" : "var(--ink-muted)",
								flexShrink: 0,
							}}
						>
							<path d="M4 6l4 4 4-4" />
						</svg>
						<span
							className="meta"
							style={{
								color: "var(--ink)",
								fontWeight: 500,
								letterSpacing: "var(--label-tracking)",
								margin: 0,
							}}
						>
							{heading}
						</span>
						{total !== undefined ? (
							<span
								data-collapsible-count
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									padding: "0 var(--space-base)",
									background: "var(--ground)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									borderRadius: "var(--radius)",
									color: "var(--ink-muted)",
								}}
							>
								{total} {unit ?? (total === 1 ? "group" : "groups")}
							</span>
						) : null}
					</div>

					<span
						data-collapsible-status
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							letterSpacing: "var(--label-tracking)",
							color: "var(--ink-muted)",
							textTransform: "uppercase",
						}}
					>
						{isOpen ? "[ − ] COLLAPSE" : "[ + ] EXPAND"}
					</span>
				</button>
			) : null}

			<div
				id={panelId}
				role="region"
				aria-labelledby={heading ? headingId : undefined}
				data-collapsible-content
				data-collapsed={!isOpen}
			>
				<div data-collapsible-inner>{children}</div>
			</div>
		</div>
	);
}
