type Props = {
	type: "success" | "error";
	text: string;
	/** Label for the dismiss button. Canonical is "[close]". */
	onDismiss: () => void;
};

/**
 * The canonical form-status feedback box: bordered notice with the message
 * left and a dismiss control right. Success draws its border in mint, error
 * in the strong rule -- the same border-means-state language as
 * `ComplianceRow`'s status pill.
 *
 * A plain component with no "use client" directive: its hosts are client
 * components, so it ships in their bundle either way, and staying directive-
 * free keeps the server-component guard green.
 */
export function StatusNotice({ type, text, onDismiss }: Props) {
	return (
		<div
			role="status"
			style={{
				padding: "calc(var(--space-base) / 2) var(--gap-sm)",
				backgroundColor: "var(--surface)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor:
					type === "success" ? "var(--accent)" : "var(--rule-strong)",
				color: type === "success" ? "var(--accent)" : "var(--ink-muted)",
				fontFamily: "var(--font-mono)",
				fontSize: "var(--mono-size)",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: "var(--space-base)",
			}}
		>
			<span>{text}</span>
			<button
				type="button"
				onClick={onDismiss}
				style={{
					background: "transparent",
					border: "none",
					color: "var(--ink-muted)",
					cursor: "pointer",
					fontFamily: "var(--font-mono)",
					fontSize: "var(--mono-size)",
					flexShrink: 0,
				}}
			>
				[close]
			</button>
		</div>
	);
}
