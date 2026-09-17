import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/design/primitives";

type Props = {
	/** The tool's category, in the mono label voice. */
	eyebrow?: string;
	breadcrumbs?: BreadcrumbItem[];
	title: string;
	lede: string;
	/** The instrument itself. */
	children: ReactNode;
	related?: ReactNode;
	/** When true, expands the working measure to `--max-width` (1600px) instead of `--converter-width` (896px). */
	wide?: boolean;
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
	breadcrumbs,
	title,
	lede,
	children,
	related,
	wide = false,
}: Props) {
	const measureAttr = wide ? "wide" : "";
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
			{breadcrumbs ? (
				<div data-converter-measure={measureAttr}>
					<Breadcrumbs items={breadcrumbs} />
				</div>
			) : null}

			{eyebrow ? (
				<p
					data-eyebrow
					data-converter-measure={measureAttr}
					className="meta"
					style={{ color: "var(--ink-muted)", margin: 0 }}
				>
					{eyebrow}
				</p>
			) : null}

			<h1
				data-converter-measure={measureAttr}
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
				data-converter-measure={measureAttr}
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: "var(--body-leading)",
				}}
			>
				{lede}
			</p>

			<div data-converter-measure={measureAttr}>{children}</div>

			{related ? <div data-related>{related}</div> : null}
		</div>
	);
}
