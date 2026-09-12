type Props = {
	label?: string;
	className?: string;
};

/**
 * An engineered, animated boundary between major sections or dimensions.
 *
 * Renders a full-width 1px hairline track with an animated laser sweep
 * in `--accent` and a centered telemetry pill with a live pulsing beacon.
 * Pure server component -- keyframes live in `primitives.css` and animation
 * is suppressed under `prefers-reduced-motion`.
 */
export function SectionSeparator({
	label = "DIMENSION // SPLIT",
	className,
}: Props) {
	return (
		<div
			data-section-separator
			role="separator"
			aria-label={label}
			className={className}
			style={{
				position: "relative",
				display: "flex",
				alignItems: "center",
				gap: "var(--space-base)",
				width: "100%",
				padding: "var(--gap-sm) 0",
			}}
		>
			<div
				data-separator-track
				style={{
					position: "relative",
					flex: 1,
					height: "var(--rule-width)",
					background: "var(--rule)",
					overflow: "hidden",
				}}
			>
				<div data-separator-runner />
			</div>

			<div
				data-separator-badge
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "var(--space-base)",
					padding: "0 var(--space-base)",
					background: "var(--surface)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					borderRadius: "var(--radius)",
					userSelect: "none",
				}}
			>
				<span data-separator-beacon />
				<span
					className="mono"
					style={{
						fontSize: "var(--mono-size)",
						letterSpacing: "var(--label-tracking)",
						color: "var(--ink-muted)",
					}}
				>
					{label}
				</span>
			</div>

			<div
				data-separator-track="reverse"
				style={{
					position: "relative",
					flex: 1,
					height: "var(--rule-width)",
					background: "var(--rule)",
					overflow: "hidden",
				}}
			>
				<div data-separator-runner />
			</div>
		</div>
	);
}
