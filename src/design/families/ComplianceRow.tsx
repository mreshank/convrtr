type Props = {
	claims: string[];
	status: { label: string; ok: boolean };
};

/**
 * v2's compliance badge row and mint status dot, adapted to a product that
 * holds no certifications.
 *
 * Printing a SOC 2 or ISO badge this product does not have would be a
 * fabricated credential, which is the one thing a page about verifiability
 * must not do. The component's purpose translates cleanly though: a row of
 * short claims with a check chip. convrtr's claims are stronger than most
 * seals precisely because they are checkable -- `e2e/network-guard.ts`
 * asserts no file bytes leave the device, and self-tests by injecting a
 * cross-origin beacon to prove the guard fires.
 *
 * The status dot is a rationed mint use and a pill, per the radius set. It
 * does not encode its state in colour alone: a hue-only signal says nothing
 * to a colour-blind reader and nothing at all in greyscale or print, so the
 * label carries the state and the dot reinforces it. When the status is not
 * ok the mint is dropped entirely -- mint means intact in this system, and a
 * failing status wearing it would be the same lie the fidelity ring was fixed
 * to stop telling.
 */
export function ComplianceRow({ claims, status }: Props) {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				gap: "var(--gap-md)",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
			}}
		>
			{claims.map((claim) => (
				<span
					key={claim}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "var(--space-base)",
					}}
				>
					<span
						data-chip
						aria-hidden="true"
						className="mono"
						style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
					>
						✓
					</span>
					<span className="meta" style={{ color: "var(--ink-muted)" }}>
						{claim}
					</span>
				</span>
			))}

			<span
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "var(--space-base)",
					marginLeft: "auto",
				}}
			>
				<span
					data-status-dot
					aria-hidden="true"
					style={{
						width: "var(--space-base)",
						height: "var(--space-base)",
						borderRadius: "var(--radius-pill)",
						background: status.ok ? "var(--accent)" : "var(--ink-muted)",
					}}
				/>
				<span className="meta" style={{ color: "var(--ink-muted)" }}>
					{status.label}
				</span>
			</span>
		</div>
	);
}
