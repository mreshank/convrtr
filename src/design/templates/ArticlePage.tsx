import Link from "next/link";
import type { ReactNode } from "react";
import type { PageSection } from "@/content/pages/types";
import { FusedHeadline } from "@/design/families";

type Props = {
	title: string;
	/** Rendered in the mono voice, already formatted by the route. */
	dateline: string;
	/**
	 * v2's content-band sequence for this page's body -- a mono eyebrow and a
	 * `FusedHeadline` per topic, composed into a responsive space-efficient
	 * multi-column grid when provided.
	 */
	sections?: PageSection[];
	children?: ReactNode;
	related?: ReactNode;
};

/** Paragraphs in `@/content/pages/*` are wrapped for source readability; this collapses that whitespace back to single spaces before it reaches the DOM. */
function clean(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

const TOKEN_REGEX =
	/(\/legal\/[a-z-]+|\/privacy|next\.config\.ts(?::\s*output:\s*"export")?|src\/[a-zA-Z0-9_/.-]+|e2e\/[a-zA-Z0-9_/.-]+|scripts\/[a-zA-Z0-9_/.-]+|package\.json|output:\s*"export"|display:\s*"standalone"|localStorage|Origin Private File System|libheif-js)/g;

function formatProseText(text: string): ReactNode {
	const parts = text.split(TOKEN_REGEX);
	if (parts.length === 1) return text;

	return parts.map((part, i) => {
		if (!part) return null;
		if (part.startsWith("/")) {
			return (
				<Link
					// biome-ignore lint/suspicious/noArrayIndexKey: parts are a static regex split sequence
					key={i}
					href={part}
					style={{
						color: "var(--accent)",
						textDecoration: "underline",
						textUnderlineOffset: "3px",
					}}
				>
					{part}
				</Link>
			);
		}
		if (
			part.startsWith("next.config.ts") ||
			part.startsWith("src/") ||
			part.startsWith("e2e/") ||
			part.startsWith("scripts/") ||
			part === "package.json" ||
			part.startsWith("output:") ||
			part.startsWith("display:") ||
			part === "localStorage" ||
			part === "Origin Private File System" ||
			part === "libheif-js"
		) {
			return (
				<code
					// biome-ignore lint/suspicious/noArrayIndexKey: parts are a static regex split sequence
					key={i}
					className="mono"
					style={{
						padding: "1px var(--space-base)",
						background: "var(--ground)",
						border: "var(--rule-width) solid var(--rule)",
						color: "var(--accent)",
						fontSize: "var(--mono-size)",
					}}
				>
					{part}
				</code>
			);
		}
		return part;
	});
}

/**
 * The article shape:
 * - When `sections` is passed (/about, /how-it-works, /privacy), it renders a
 *   spacious, space-efficient multi-column technical grid across `--max-width`
 *   with quick jump navigation, step badges, and interactive citations.
 * - When `children` is passed without `sections` (/blog/[slug]), it retains the
 *   classic 68ch prose measure (`data-prose`) optimal for continuous reading.
 */
export function ArticlePage({
	title,
	dateline,
	sections,
	children,
	related,
}: Props) {
	if (sections && sections.length > 0) {
		const isOdd = sections.length % 2 !== 0;

		return (
			<article
				style={{
					maxWidth: "var(--max-width)",
					margin: "0 auto",
					width: "100%",
					padding: "var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
				}}
			>
				<header
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
						borderBottom: "var(--rule-width) solid var(--rule)",
						paddingBottom: "var(--gap-md)",
					}}
				>
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "var(--gap-sm)",
						}}
					>
						<p
							data-dateline
							className="mono"
							style={{
								color: "var(--ink-muted)",
								fontSize: "var(--mono-size)",
								margin: "0",
							}}
						>
							{dateline}
						</p>
						<span
							className="meta"
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "var(--space-base)",
								padding: "0 14px",
								background: "var(--surface)",
								border: "var(--rule-width) solid var(--rule)",
								color: "var(--ink-muted)",
								fontSize: "var(--mono-size)",
								height: "23px",
							}}
						>
							<span
								aria-hidden="true"
								style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
							>
								●
							</span>
							{`${sections.length} SPECIFICATIONS`}
						</span>
					</div>

					<h1
						style={{
							fontSize: "var(--headline-size)",
							fontWeight: 400,
							letterSpacing: "var(--headline-tracking)",
							lineHeight: "var(--display-leading)",
							color: "var(--ink)",
							margin: 0,
						}}
					>
						{title}
					</h1>

					<nav
						aria-label="Section shortcuts"
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "var(--space-base)",
							marginTop: "var(--space-base)",
						}}
					>
						{sections.map((section, idx) => {
							const num = String(idx + 1).padStart(2, "0");
							const label = section.eyebrow ?? section.lead.split(" ")[0];
							return (
								<a key={section.lead} href={`#section-${idx}`} data-jump-pill>
									<span style={{ color: "var(--accent)" }}>{num}</span>
									<span>{label}</span>
								</a>
							);
						})}
					</nav>
				</header>

				<div data-section-grid>
					{sections.map((section, index) => {
						const num = String(index + 1).padStart(2, "0");
						const isFeatured = isOdd && index === 0;

						return (
							<section
								key={section.lead}
								id={`section-${index}`}
								data-section-card
								data-featured={isFeatured ? "true" : undefined}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: "var(--space-base)",
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "var(--gap-sm)",
										}}
									>
										<span
											className="mono"
											style={{
												color: "var(--accent)",
												fontSize: "var(--mono-size)",
												fontWeight: 500,
											}}
										>
											{num}
										</span>
										{section.eyebrow ? (
											<span
												className="meta"
												style={{
													color: "var(--ink-muted)",
													letterSpacing: "0.05em",
												}}
											>
												{section.eyebrow}
											</span>
										) : null}
									</div>
									<span
										aria-hidden="true"
										className="mono"
										style={{
											color: "var(--rule-strong)",
											fontSize: "11px",
										}}
									>
										{"///"}
									</span>
								</div>

								<FusedHeadline
									as="h2"
									lead={section.lead}
									cont={section.cont}
								/>

								<div
									data-section-body
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--body-size)",
										lineHeight: "var(--body-leading)",
										display: "flex",
										flexDirection: "column",
										gap: "var(--gap-sm)",
										marginTop: "auto",
									}}
								>
									{section.paragraphs.map((paragraph) => (
										<p key={paragraph} style={{ margin: 0 }}>
											{formatProseText(clean(paragraph))}
										</p>
									))}
								</div>
							</section>
						);
					})}
					{children}
				</div>

				{related ? (
					<div data-related style={{ marginTop: "var(--gap-md)" }}>
						{related}
					</div>
				) : null}
			</article>
		);
	}

	return (
		<article
			style={{
				padding: "var(--gap-lg) var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
			}}
		>
			<header
				data-prose
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<p data-dateline className="mono" style={{ color: "var(--ink-muted)" }}>
					{dateline}
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
			</header>

			<div
				data-prose
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-lg)",
				}}
			>
				{children}
			</div>

			{related ? (
				<div data-related data-prose>
					{related}
				</div>
			) : null}
		</article>
	);
}
