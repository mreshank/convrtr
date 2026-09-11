import Link from "next/link";
import type { BlogPostMeta } from "@/content/blog/types";
import type { ComparisonMeta } from "@/content/compare/types";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";
import { RelatedReading } from "./RelatedReading";

export interface FAQItem {
	q: string;
	a: string;
}

export function ToolAppendix({
	faq,
	comparisons,
	posts,
}: {
	faq: FAQItem[];
	comparisons: ComparisonMeta[];
	posts: BlogPostMeta[];
}) {
	return (
		<div
			data-testid="tool-appendix"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-lg)",
				width: "100%",
				maxWidth: "var(--converter-width)",
				margin: "0 auto",
			}}
		>
			{/* Format Comparisons / Battles */}
			{comparisons.length > 0 && (
				<section
					data-testid="tool-comparisons"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-md)",
						borderTop: "var(--rule-width) solid var(--rule)",
						paddingTop: "var(--gap-md)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexWrap: "wrap",
							gap: "var(--gap-sm)",
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
								className="meta"
								style={{
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule-strong)",
									color: "var(--accent)",
									backgroundColor: "var(--surface)",
									padding: "0 14px",
									height: "23px",
									display: "inline-flex",
									alignItems: "center",
									borderRadius: "var(--radius-control)",
								}}
							>
								[ FORMAT SPECIFICATIONS ]
							</span>
							<h2
								style={{
									fontSize: "var(--label-size)",
									color: "var(--ink)",
									fontWeight: "var(--label-weight)",
								}}
							>
								Format Comparisons & Guides
							</h2>
						</div>

						<Link
							href="/compare"
							className="meta"
							style={{
								color: "var(--ink-muted)",
								textDecoration: "none",
								display: "inline-flex",
								alignItems: "center",
								gap: "var(--space-base)",
							}}
						>
							<span>All comparisons</span>
							<ArrowUpRight size={12} />
						</Link>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns:
								comparisons.length === 1
									? "1fr"
									: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: "var(--gap-sm)",
						}}
					>
						{comparisons.map((c) => (
							<Link
								key={c.slug}
								href={`/compare/${c.slug}`}
								style={{
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--surface)",
									padding: "var(--gap-sm)",
									textDecoration: "none",
									gap: "var(--gap-sm)",
									transition: "border-color var(--dur-hover) var(--ease)",
								}}
							>
								<div>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "var(--space-base)",
											marginBottom: "calc(var(--space-base) / 2)",
										}}
									>
										<span
											className="meta"
											style={{
												color: "var(--accent)",
											}}
										>
											{c.formatA} VS {c.formatB}
										</span>
									</div>
									<h3
										style={{
											fontSize: "var(--label-size)",
											color: "var(--ink)",
											fontWeight: 500,
											lineHeight: 1.4,
										}}
									>
										{c.title}
									</h3>
									<p
										style={{
											fontSize: "var(--mono-size)",
											color: "var(--ink-muted)",
											marginTop: "calc(var(--space-base) / 2)",
											lineHeight: 1.5,
										}}
									>
										{c.description}
									</p>
								</div>

								<div
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "calc(var(--space-base) / 2)",
										fontSize: "var(--mono-size)",
										fontFamily: "var(--font-mono)",
										color: "var(--accent)",
									}}
								>
									<span>READ COMPARISON</span>
									<ArrowUpRight size={12} />
								</div>
							</Link>
						))}
					</div>
				</section>
			)}

			{/* Visible FAQ Section for Schema.org FAQPage compliance */}
			{faq.length > 0 && (
				<section
					data-testid="tool-faq"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-md)",
						borderTop: "var(--rule-width) solid var(--rule)",
						paddingTop: "var(--gap-md)",
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
							className="meta"
							style={{
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule-strong)",
								color: "var(--accent)",
								backgroundColor: "var(--surface)",
								padding: "0 14px",
								height: "23px",
								display: "inline-flex",
								alignItems: "center",
								borderRadius: "var(--radius-control)",
							}}
						>
							[ FREQUENTLY ASKED QUESTIONS ]
						</span>
						<h2
							style={{
								fontSize: "var(--label-size)",
								color: "var(--ink)",
								fontWeight: "var(--label-weight)",
							}}
						>
							Technical Details & FAQ
						</h2>
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "var(--gap-sm)",
						}}
					>
						{faq.map((item) => (
							<div
								key={item.q}
								style={{
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									backgroundColor: "var(--surface)",
									padding: "var(--gap-sm)",
									display: "flex",
									flexDirection: "column",
									gap: "calc(var(--space-base) / 2)",
								}}
							>
								<h3
									style={{
										fontSize: "var(--label-size)",
										color: "var(--ink)",
										fontWeight: 500,
										display: "flex",
										alignItems: "baseline",
										gap: "var(--space-base)",
									}}
								>
									<span
										style={{
											color: "var(--accent)",
											fontFamily: "var(--font-mono)",
										}}
									>
										[?]
									</span>
									<span>{item.q}</span>
								</h3>
								<p
									style={{
										fontSize: "var(--body-size)",
										color: "var(--ink-muted)",
										lineHeight: "var(--body-leading)",
										paddingLeft: "calc(var(--space-base) * 2.5)",
									}}
								>
									{item.a}
								</p>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Related Articles & Engineering Guides */}
			<RelatedReading posts={posts} />
		</div>
	);
}
