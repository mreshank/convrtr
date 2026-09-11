import Link from "next/link";
import type { ComparisonMeta } from "@/content/compare/types";

type Props = {
	comparison: ComparisonMeta;
};

export function ComparisonView({ comparison }: Props) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-lg)",
				width: "100%",
			}}
		>
			{/* Executive Summary Callout */}
			<div
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-md)",
				}}
			>
				<p
					className="meta"
					style={{
						color: "var(--accent)",
						fontSize: "var(--mono-size)",
						letterSpacing: "0.1em",
						textTransform: "uppercase",
						marginBottom: "var(--space-base)",
					}}
				>
					EXECUTIVE SUMMARY
				</p>
				<p
					style={{
						fontSize: "var(--body-size)",
						lineHeight: "1.6",
						color: "var(--ink)",
						margin: 0,
					}}
				>
					{comparison.summary}
				</p>
			</div>

			{/* Direct Specs Matrix Table */}
			<div>
				<p
					className="meta"
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--mono-size)",
						letterSpacing: "0.08em",
						textTransform: "uppercase",
						marginBottom: "var(--gap-sm)",
					}}
				>
					TECHNICAL SPECIFICATIONS COMPARISON
				</p>
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						overflowX: "auto",
					}}
				>
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							textAlign: "left",
						}}
					>
						<thead>
							<tr
								style={{ borderBottom: "var(--rule-width) solid var(--rule)" }}
							>
								<th
									className="meta"
									style={{
										padding: "var(--gap-sm)",
										color: "var(--ink-muted)",
									}}
								>
									FEATURE
								</th>
								<th
									className="meta"
									style={{ padding: "var(--gap-sm)", color: "var(--accent)" }}
								>
									{comparison.formatA.toUpperCase()}
								</th>
								<th
									className="meta"
									style={{ padding: "var(--gap-sm)", color: "var(--ink)" }}
								>
									{comparison.formatB.toUpperCase()}
								</th>
							</tr>
						</thead>
						<tbody>
							{comparison.specs.map((spec) => (
								<tr
									key={spec.feature}
									style={{
										borderBottom: "var(--rule-width) solid var(--rule)",
									}}
								>
									<td
										className="mono"
										style={{
											padding: "var(--gap-sm)",
											fontSize: "var(--mono-size)",
											color: "var(--ink-muted)",
										}}
									>
										{spec.feature}
									</td>
									<td
										className="mono"
										style={{
											padding: "var(--gap-sm)",
											fontSize: "var(--mono-size)",
											color: "var(--ink)",
										}}
									>
										{spec.formatA}
									</td>
									<td
										className="mono"
										style={{
											padding: "var(--gap-sm)",
											fontSize: "var(--mono-size)",
											color: "var(--ink)",
										}}
									>
										{spec.formatB}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Strengths Grid */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
					gap: "var(--gap-md)",
				}}
			>
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						padding: "var(--gap-md)",
					}}
				>
					<p
						className="meta"
						style={{
							color: "var(--accent)",
							marginBottom: "var(--space-base)",
						}}
					>
						WHY CHOOSE {comparison.formatA.toUpperCase()}
					</p>
					<ul
						style={{
							margin: 0,
							paddingLeft: "var(--gap-sm)",
							color: "var(--ink)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						{comparison.prosA.map((pro) => (
							<li
								key={pro}
								style={{ fontSize: "var(--body-size)", lineHeight: "1.5" }}
							>
								{pro}
							</li>
						))}
					</ul>
				</div>

				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						padding: "var(--gap-md)",
					}}
				>
					<p
						className="meta"
						style={{ color: "var(--ink)", marginBottom: "var(--space-base)" }}
					>
						WHY CHOOSE {comparison.formatB.toUpperCase()}
					</p>
					<ul
						style={{
							margin: 0,
							paddingLeft: "var(--gap-sm)",
							color: "var(--ink)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						{comparison.prosB.map((pro) => (
							<li
								key={pro}
								style={{ fontSize: "var(--body-size)", lineHeight: "1.5" }}
							>
								{pro}
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* Recommendation Verdict */}
			<div
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--ground)",
					padding: "var(--gap-md)",
				}}
			>
				<p
					className="meta"
					style={{
						color: "var(--ink-muted)",
						marginBottom: "var(--space-base)",
					}}
				>
					ARCHITECTURAL VERDICT
				</p>
				<p
					style={{
						fontSize: "var(--body-size)",
						lineHeight: "1.6",
						color: "var(--ink)",
						margin: 0,
					}}
				>
					{comparison.verdict}
				</p>
			</div>

			{/* Direct Converters Call to Action */}
			<div>
				<p
					className="meta"
					style={{ color: "var(--ink-muted)", marginBottom: "var(--gap-sm)" }}
				>
					DIRECT IN-BROWSER CONVERTERS
				</p>
				<div
					style={{ display: "flex", gap: "var(--gap-sm)", flexWrap: "wrap" }}
				>
					{comparison.relatedTools.map((toolId) => (
						<Link
							key={toolId}
							href={`/${toolId}`}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "var(--gap-sm)",
								height: "36px",
								padding: "0 14px",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule)",
								borderRadius: "var(--radius-pill)",
								backgroundColor: "var(--surface)",
								color: "var(--ink)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								textDecoration: "none",
							}}
						>
							<span>Convert with {toolId}</span>
							<span style={{ color: "var(--accent)" }}>↗</span>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
