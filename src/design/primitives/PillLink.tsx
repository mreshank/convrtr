import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
	href: string;
	children: ReactNode;
	/** Fill is the primary call to action; outline is secondary, never primary. */
	variant: "fill" | "outline";
	/** Compact 36px height for in-card CTAs; default 44px v2 pill. */
	size?: "md" | "sm";
	external?: boolean;
};

/**
 * The canonical pill CTA. `HeroBand`'s white primary + transparent secondary
 * pair and the extension card's store button were three copies of the same
 * geometry (pill radius, label tracking, ink fill vs rule outline) with
 * small drifts (44px vs 36px heights kept here as explicit sizes).
 *
 * The fill carries `data-cta-fill`: the global `:focus-visible` ring is
 * `1px solid var(--ink)` -- exactly the fill's own colour -- so the rule in
 * `families.css` pulls the ring inside and recolours it `--ground`, keeping
 * the indicator legible as an indicator rather than part of the pill.
 */
export function PillLink({
	href,
	children,
	variant,
	size = "md",
	external = false,
}: Props) {
	return (
		<Link
			href={href}
			target={external ? "_blank" : undefined}
			rel={external ? "noopener noreferrer" : undefined}
			{...(variant === "fill" ? { "data-cta-fill": true } : {})}
			style={{
				height: size === "sm" ? "36px" : "44px",
				borderRadius: "var(--radius-pill)",
				display: "inline-flex",
				alignItems: "center",
				gap: "var(--space-base)",
				padding: "0 var(--gap-md)",
				fontSize: "var(--label-size)",
				fontWeight: 500,
				letterSpacing: "var(--label-tracking)",
				textDecoration: "none",
				background: variant === "fill" ? "var(--ink)" : "transparent",
				color: variant === "fill" ? "var(--ground)" : "var(--ink)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: variant === "fill" ? "var(--ink)" : "var(--rule)",
			}}
		>
			{children}
		</Link>
	);
}
