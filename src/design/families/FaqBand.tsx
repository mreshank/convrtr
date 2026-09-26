import Link from "next/link";
import { CollapsibleSection } from "./CollapsibleSection";

type Props = {
	items: { question: string; answer: string }[];
};

/**
 * WriteMate-style 2-column FAQ layout:
 * Left column anchors the sticky section heading, lede, and feedback link.
 * Right column delivers checkable facts via interactive disclosures.
 *
 * Capped with no horizontal padding of its own: the shell owns the gutter,
 * the band owns only its cap.
 */
export function FaqBand({ items }: Props) {
	if (items.length === 0) return null;
	return (
		<div
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
				gap: "var(--gap-lg)",
				padding: "var(--gap-md) 0",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
				}}
			>
				<span
					className="meta"
					style={{
						color: "var(--accent)",
						letterSpacing: "0.08em",
					}}
				>
					ANSWERS {"//"} NO SALES TEAM
				</span>
				<h2
					style={{
						fontSize: "var(--headline-size)",
						color: "var(--ink)",
						fontWeight: 400,
						letterSpacing: "var(--headline-tracking)",
						margin: 0,
					}}
				>
					Frequently Asked Questions
				</h2>
				<p
					style={{
						fontSize: "var(--body-size)",
						color: "var(--ink-muted)",
						lineHeight: "var(--body-leading)",
						margin: 0,
						maxWidth: "40ch",
					}}
				>
					Everything you need to know about private, in-browser file conversion
					with WebAssembly.
				</p>
				<div style={{ marginTop: "var(--gap-sm)" }}>
					<Link
						href="/feedback"
						className="mono"
						style={{
							color: "var(--ink)",
							textDecoration: "underline",
							textUnderlineOffset: "3px",
							fontSize: "var(--mono-size)",
						}}
					>
						Have an unlisted question? Send feedback ↗
					</Link>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-base)",
				}}
			>
				{items.map((item, index) => (
					<CollapsibleSection
						key={item.question}
						heading={item.question}
						defaultOpen={index === 0}
					>
						<p
							style={{
								color: "var(--ink-muted)",
								fontSize: "var(--body-size)",
								lineHeight: 1.6,
								margin: 0,
								padding: "var(--space-base) var(--gap-sm)",
							}}
						>
							{item.answer}
						</p>
					</CollapsibleSection>
				))}
			</div>
		</div>
	);
}
