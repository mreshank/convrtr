import Link from "next/link";
import type { Tool } from "@/core/registry";
import { getRelatedToolsGraph } from "@/core/registry/related";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";

export function RelatedConverters({ tool }: { tool: Tool }) {
	const graph = getRelatedToolsGraph(tool);
	const rawFrom = (tool.accept.ext[0] ?? "").toUpperCase();
	const rawTo = (tool.output.ext ?? "").toUpperCase();

	return (
		<section
			data-testid="related-converters"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				borderTop: "var(--rule-width) solid var(--rule)",
				paddingTop: "var(--gap-md)",
			}}
		>
			{/* Section Header */}
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
						[ CONVERSION NETWORK ]
					</span>
					<h2
						style={{
							fontSize: "var(--label-size)",
							color: "var(--ink)",
							fontWeight: "var(--label-weight)",
						}}
					>
						Related Converters & Routing
					</h2>
				</div>

				{/* Hub shortcuts */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "var(--space-base)",
						flexWrap: "wrap",
					}}
				>
					<Link
						href={graph.formatHubs.inputHref}
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							textDecoration: "none",
							padding: "1px var(--space-base)",
							border: "var(--rule-width) solid var(--rule)",
							borderRadius: "var(--radius-control)",
							backgroundColor: "var(--surface)",
							display: "inline-flex",
							alignItems: "center",
							gap: "var(--space-base)",
						}}
					>
						<span>{rawFrom} HUB</span>
						<ArrowUpRight size={10} />
					</Link>
					<Link
						href={graph.formatHubs.outputHref}
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							textDecoration: "none",
							padding: "1px var(--space-base)",
							border: "var(--rule-width) solid var(--rule)",
							borderRadius: "var(--radius-control)",
							backgroundColor: "var(--surface)",
							display: "inline-flex",
							alignItems: "center",
							gap: "var(--space-base)",
						}}
					>
						<span>{rawTo} HUB</span>
						<ArrowUpRight size={10} />
					</Link>
					<Link
						href={graph.categoryHub.href}
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--accent)",
							textDecoration: "none",
							padding: "1px var(--space-base)",
							border: "var(--rule-width) solid var(--rule-strong)",
							borderRadius: "var(--radius-control)",
							backgroundColor: "var(--surface)",
							display: "inline-flex",
							alignItems: "center",
							gap: "var(--space-base)",
						}}
					>
						<span>{graph.categoryHub.label.toUpperCase()}</span>
						<ArrowUpRight size={10} />
					</Link>
				</div>
			</div>

			{/* Direct Reciprocal Reverse Converter */}
			{graph.reverseTool && (
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule-strong)",
						backgroundColor: "var(--surface)",
						padding: "var(--gap-sm)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "var(--gap-sm)",
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
									fontSize: "var(--mono-size)",
								}}
							>
								RECIPROCAL ROUTE
							</span>
							<span
								className="mono"
								style={{
									color: "var(--ink-muted)",
									fontSize: "var(--mono-size)",
								}}
							>
								{rawTo} ➔ {rawFrom}
							</span>
						</div>
						<p
							style={{
								margin: 0,
								fontSize: "var(--body-size)",
								color: "var(--ink)",
								fontWeight: 500,
							}}
						>
							{graph.reverseTool.seo.h1}
						</p>
					</div>

					<Link
						href={`/${graph.reverseTool.id}`}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "var(--space-base)",
							height: "36px",
							padding: "0 14px",
							backgroundColor: "var(--ground)",
							color: "var(--ink)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule-strong)",
							borderRadius: "var(--radius-control)",
							fontFamily: "var(--font-mono)",
							fontSize: "var(--mono-size)",
							textDecoration: "none",
							letterSpacing: "0.06em",
						}}
					>
						<span>
							CONVERT {rawTo} ➔ {rawFrom}
						</span>
						<ArrowUpRight size={12} />
					</Link>
				</div>
			)}

			{/* Sibling Output Formats (Other destinations from same source) */}
			{graph.siblingOutputs.length > 0 && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.08em",
						}}
					>
						CONVERT {rawFrom} TO OTHER TARGET FORMATS
					</p>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
							gap: "var(--gap-sm)",
						}}
					>
						{graph.siblingOutputs.map((sibling) => {
							const outExt = sibling.output.ext.toUpperCase();
							return (
								<Link
									key={sibling.id}
									href={`/${sibling.id}`}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "var(--gap-sm)",
										backgroundColor: "var(--surface)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										textDecoration: "none",
										gap: "var(--space-base)",
										transition: "border-color var(--dur-hover) var(--ease)",
									}}
								>
									<div style={{ display: "flex", flexDirection: "column" }}>
										<span
											className="mono"
											style={{
												fontSize: "var(--mono-size)",
												color: "var(--accent)",
												fontWeight: 500,
											}}
										>
											{rawFrom} ➔ {outExt}
										</span>
										<span
											style={{
												fontSize: "12px",
												color: "var(--ink-muted)",
											}}
										>
											{sibling.seo.h1}
										</span>
									</div>
									<ArrowUpRight size={12} />
								</Link>
							);
						})}
					</div>
				</div>
			)}

			{/* Sibling Input Formats (Other sources targeting same output) */}
			{graph.siblingInputs.length > 0 && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.08em",
						}}
					>
						PRODUCE {rawTo} FROM OTHER SOURCE FORMATS
					</p>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
							gap: "var(--gap-sm)",
						}}
					>
						{graph.siblingInputs.map((sibling) => {
							const inExt = (sibling.accept.ext[0] ?? "").toUpperCase();
							return (
								<Link
									key={sibling.id}
									href={`/${sibling.id}`}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "var(--gap-sm)",
										backgroundColor: "var(--surface)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor: "var(--rule)",
										textDecoration: "none",
										gap: "var(--space-base)",
										transition: "border-color var(--dur-hover) var(--ease)",
									}}
								>
									<div style={{ display: "flex", flexDirection: "column" }}>
										<span
											className="mono"
											style={{
												fontSize: "var(--mono-size)",
												color: "var(--ink)",
												fontWeight: 500,
											}}
										>
											{inExt} ➔ {rawTo}
										</span>
										<span
											style={{
												fontSize: "12px",
												color: "var(--ink-muted)",
											}}
										>
											{sibling.seo.h1}
										</span>
									</div>
									<ArrowUpRight size={12} />
								</Link>
							);
						})}
					</div>
				</div>
			)}

			{/* Collectives */}
			{graph.collectives.length > 0 && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--gap-sm)",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--ink-muted)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.08em",
						}}
					>
						CURATED WORKFLOW COLLECTIVES
					</p>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
							gap: "var(--gap-sm)",
						}}
					>
						{graph.collectives.map((collective) => (
							<Link
								key={collective.slug}
								href={`/collectives/${collective.slug}`}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "calc(var(--space-base) / 2)",
									padding: "var(--gap-sm)",
									backgroundColor: "var(--surface)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
									textDecoration: "none",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<span className="meta" style={{ color: "var(--accent)" }}>
										COLLECTIVE
									</span>
									<ArrowUpRight size={12} />
								</div>
								<p
									style={{
										margin: 0,
										fontSize: "var(--label-size)",
										color: "var(--ink)",
										fontWeight: 500,
									}}
								>
									{collective.title}
								</p>
								<p
									style={{
										margin: 0,
										fontSize: "var(--mono-size)",
										color: "var(--ink-muted)",
										lineHeight: 1.4,
									}}
								>
									{collective.why}
								</p>
							</Link>
						))}
					</div>
				</div>
			)}
		</section>
	);
}
