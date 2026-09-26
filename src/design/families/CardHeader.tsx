import type { ReactNode } from "react";

type Props = {
	/** Mono uppercase eyebrow, e.g. "DISPATCH // STAY SYNCHRONIZED". */
	eyebrow: string;
	/** Plain ink headline. Single colour by design -- emphasis here comes
	 * from the eyebrow above and the lede below, not from a fused clause. */
	title: string;
	/** Optional muted lede paragraph under the header row. */
	lede?: string;
	/** Optional right-side pill (badge, status, install CTA). */
	badge?: ReactNode;
	/** The extension card's outer header is an h2; everything else is h3. */
	headingLevel?: "h2" | "h3";
	/** The manifesto's lede runs to the converter measure; the default is
	 * the 65ch reading measure every other card uses. */
	wideLede?: boolean;
};

/**
 * The canonical card header: eyebrow + headline left, badge right, lede
 * below. Five cards and one explorer re-implemented this shape by hand with
 * small drifts (letter-spacing 0.1em vs 0.08em, badge ink vs accent), so it
 * lives here now -- one spelling, composed everywhere.
 *
 * No width cap and no outer padding: hosts (surface cards, chapter bodies)
 * own their geometry; this owns only the header's internal rhythm.
 */
export function CardHeader({
	eyebrow,
	title,
	lede,
	badge,
	headingLevel = "h3",
	wideLede = false,
}: Props) {
	const Title = headingLevel;
	return (
		<div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					flexWrap: "wrap",
					gap: "var(--space-base)",
				}}
			>
				<div>
					<span
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.1em",
							textTransform: "uppercase",
						}}
					>
						{eyebrow}
					</span>
					<Title
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: "calc(var(--space-base) / 2) 0 0",
							color: "var(--ink)",
						}}
					>
						{title}
					</Title>
				</div>
				{badge}
			</div>
			{lede && (
				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						lineHeight: 1.6,
						margin: "var(--space-base) 0 0",
						maxWidth: wideLede ? "var(--converter-width)" : "65ch",
					}}
				>
					{lede}
				</p>
			)}
		</div>
	);
}
