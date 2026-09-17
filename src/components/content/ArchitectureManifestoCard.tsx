export function ArchitectureManifestoCard() {
	const COMPARISONS = [
		{
			dimension: "Data Location",
			cloud: "Uploaded to third-party AWS/GCP buckets in plaintext.",
			convrtr: "Never leaves your device. Processed in local WebAssembly memory.",
		},
		{
			dimension: "Queue Latency",
			cloud: "30s to 15m server queue wait times depending on load.",
			convrtr: "Instant 0ms start. Execution begins immediately on your CPU/GPU.",
		},
		{
			dimension: "File Size Limit",
			cloud: "Paywalled at 50MB-100MB. Demands $19/mo for larger batches.",
			convrtr: "Unlimited. Capped only by your device's available memory.",
		},
		{
			dimension: "Network Dependency",
			cloud: "Fails instantly when network drops or is offline.",
			convrtr: "100% offline capable. Runs as an isolated PWA and extension.",
		},
		{
			dimension: "Privacy & Retention",
			cloud: "Files saved to cloud disks for hours or days before deletion.",
			convrtr: "Zero retention. Cleared immediately from RAM upon tab close.",
		},
	];

	return (
		<div
			style={{
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				backgroundColor: "var(--surface)",
				padding: "var(--gap-md)",
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-md)",
				width: "100%",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					flexWrap: "wrap",
					gap: "var(--space-base)",
				}}
			>
				<div>
					<span
						className="meta"
						style={{
							color: "var(--accent)",
							fontSize: "var(--mono-size)",
							letterSpacing: "0.1em",
							textTransform: "uppercase",
						}}
					>
						ARCHITECTURAL CONTRAST {"//"} THE LOCAL MANIFESTO
					</span>
					<h3
						style={{
							fontSize: "var(--headline-size)",
							letterSpacing: "var(--headline-tracking)",
							fontWeight: 400,
							margin: "calc(var(--space-base) / 2) 0 0",
							color: "var(--ink)",
						}}
					>
						Cloud converters are surveillance pipelines.
					</h3>
				</div>
				<span
					className="mono"
					style={{
						fontSize: "var(--mono-size)",
						color: "var(--accent)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						padding: "calc(var(--space-base) / 4) var(--space-base)",
						borderRadius: "var(--radius-control)",
						backgroundColor: "var(--ground)",
					}}
				>
					VERIFIED IN CI // 0 BYTES LEAKED
				</span>
			</div>

			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: 1.6,
					margin: 0,
					maxWidth: "var(--converter-width)",
				}}
			>
				Most online converters act as intermediaries that harvest file contents,
				charge subscription tolls, and subject sensitive documents to cloud
				breaches. convrtr replaces the entire cloud server farm with isolated
				in-browser WASM compilers.
			</p>

			{/* Comparison Table */}
			<div
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--ground)",
					display: "flex",
					flexDirection: "column",
					width: "100%",
				}}
			>
				{/* Table Header */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1.5fr 1.5fr",
						padding: "var(--space-base) var(--gap-sm)",
						borderBottomWidth: "var(--rule-width)",
						borderBottomStyle: "solid",
						borderBottomColor: "var(--rule)",
						backgroundColor: "var(--surface)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						letterSpacing: "0.08em",
						textTransform: "uppercase",
					}}
				>
					<span style={{ color: "var(--ink-muted)" }}>Metric</span>
					<span style={{ color: "var(--ink-muted)" }}>Cloud Converters</span>
					<span style={{ color: "var(--accent)" }}>convrtr Architecture</span>
				</div>

				{/* Table Rows */}
				{COMPARISONS.map((row) => (
					<div
						key={row.dimension}
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1.5fr 1.5fr",
							padding: "var(--gap-sm)",
							borderBottomWidth: "var(--rule-width)",
							borderBottomStyle: "solid",
							borderBottomColor: "var(--rule)",
							alignItems: "center",
							gap: "var(--space-base)",
						}}
					>
						<span
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								fontWeight: 600,
								color: "var(--ink)",
							}}
						>
							{row.dimension}
						</span>
						<span
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
								lineHeight: 1.5,
							}}
						>
							{row.cloud}
						</span>
						<span
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink)",
								lineHeight: 1.5,
								fontWeight: 500,
							}}
						>
							{row.convrtr}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
