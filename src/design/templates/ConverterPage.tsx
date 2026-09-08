import type { ReactNode } from "react";

type Props = {
	/** The tool's category, in the mono label voice. */
	eyebrow: string;
	title: string;
	lede: string;
	/** The instrument itself. */
	children: ReactNode;
	related?: ReactNode;
};

/**
 * The converter shape: the instrument, framed.
 *
 * This template deliberately does very little. `ToolClient` is the product and
 * is around 1100 lines of state machine, worker orchestration and fidelity
 * reporting; framing it means giving it a heading and a category label, not
 * rebuilding it. Every `data-testid` inside it is frozen — 42 Playwright specs
 * drive them — so the template adds no landmark that could change what those
 * selectors resolve against.
 */
export function ConverterPage({
	eyebrow,
	title,
	lede,
	children,
	related,
}: Props) {
	return (
		<div
			data-converter
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			<p data-eyebrow className="meta" style={{ color: "var(--ink-muted)" }}>
				{eyebrow}
			</p>

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

			{children}

			{related ? <div data-related>{related}</div> : null}
		</div>
	);
}
