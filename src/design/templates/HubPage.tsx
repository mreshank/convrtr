import type { ReactNode } from "react";

type Props = {
	/** Small mono label above the headline. Optional — not every hub needs one. */
	eyebrow?: string;
	title: string;
	lede: string;
	/** v2's data-readout voice applied to a hub: "53 conversions". */
	count?: { value: number; noun: string };
	children: ReactNode;
};

/**
 * The hub shape, shared by the tools index, each category, and the blog: an
 * eyebrow, a headline at the headline scale, a muted lede, an optional mono
 * count, then whatever listing the route resolves.
 *
 * The count is optional rather than derived, because not every hub has a total
 * worth stating — and a hub that invents one would be stating a number for the
 * sake of the shape.
 */
export function HubPage({ eyebrow, title, lede, count, children }: Props) {
	return (
		<div
			data-hub
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			{eyebrow ? (
				<p className="meta" style={{ color: "var(--ink-muted)" }}>
					{eyebrow}
				</p>
			) : null}

			<h1
				style={{
					fontSize: "var(--headline-size)",
					fontWeight: 400,
					letterSpacing: "var(--headline-tracking)",
					lineHeight: "var(--display-leading)",
					color: "var(--ink)",
				}}
			>
				{title}
			</h1>

			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: "var(--body-leading)",
				}}
			>
				{lede}
			</p>

			{count ? (
				<p data-count className="mono" style={{ color: "var(--ink-muted)" }}>
					{`${count.value} ${count.noun}`}
				</p>
			) : null}

			{children}
		</div>
	);
}
