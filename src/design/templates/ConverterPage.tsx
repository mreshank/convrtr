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
 *
 * The shell itself imposes no width cap — the same lesson `EditorialPage`
 * already learned: a `max-w-4xl` on that shell once clamped every family's
 * own `var(--max-width)` permanently dead, because the shell's own padding
 * comes out of the cap before its children ever see it. `ToolClient`'s
 * instrument needs the full 896px `--converter-width`, not 896px minus this
 * shell's `--gap-md` padding, so the heading pieces and the instrument each
 * carry `data-converter-measure` and measure themselves independently against
 * the shell's padded content width — `templates.css` centres each of them at
 * `--converter-width` the same way `[data-prose]` centres `ArticlePage`'s
 * header, body and related slot independently rather than through one shared
 * cap on the `<article>`. Four elements computing the same measure against
 * the same available width land at the same size and the same left edge,
 * which is what puts the title directly above the instrument it names
 * instead of ~328px to its left, as it measured before this existed.
 *
 * `--converter-width` is also now the instrument's only source for 896px:
 * `ToolClient` dropped the `max-w-4xl` it used to state independently, so
 * there is one number instead of two that had to happen to agree.
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
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			<p
				data-eyebrow
				data-converter-measure
				className="meta"
				style={{ color: "var(--ink-muted)" }}
			>
				{eyebrow}
			</p>

			<h1
				data-converter-measure
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
				data-converter-measure
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: "var(--body-leading)",
				}}
			>
				{lede}
			</p>

			<div data-converter-measure>{children}</div>

			{related ? <div data-related>{related}</div> : null}
		</div>
	);
}
