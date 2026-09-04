import type { CSSProperties, ReactNode } from "react";

type Props = {
	children: ReactNode;
	/** Which of DESIGN.md's three radius patterns to use. */
	variant: "a" | "b" | "c";
	aspect?: "5/7" | "4/3";
};

/**
 * DESIGN.md's asymmetric card radii, applied in rotation so a grid stops
 * reading as a row of identical rectangles — its Special Components section
 * calls this out explicitly as breaking the grid's monotony.
 *
 * Radii are tokens rather than literals. The design-system sweep permits
 * the literal values 40 and 100, so writing them here would pass review and
 * still leave two sources of truth for the card system.
 */
const RADII: Record<Props["variant"], CSSProperties> = {
	a: { borderTopLeftRadius: "var(--radius-card-lg)" },
	b: {
		borderTopRightRadius: "var(--radius-card-lg)",
		borderBottomLeftRadius: "var(--radius-card)",
	},
	c: { borderRadius: "var(--radius-card)" },
};

export function AsymCard({ children, variant, aspect = "4/3" }: Props) {
	return (
		<div style={{ ...RADII[variant], aspectRatio: aspect, overflow: "hidden" }}>
			{children}
		</div>
	);
}
