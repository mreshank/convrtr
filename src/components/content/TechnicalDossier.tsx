import type { Tool } from "@/core/registry";
import { getConversionBenchmark, getFormatSpec } from "@/lib/format-specs";

export function TechnicalDossier({ tool }: { tool: Tool }) {
	const rawFrom = tool.accept.ext[0] ?? tool.output.ext;
	const rawTo = tool.output.ext;
	const fromSpec = getFormatSpec(rawFrom, tool.category);
	const toSpec = getFormatSpec(rawTo, tool.category);
	const bench = getConversionBenchmark(
		fromSpec,
		toSpec,
		tool.category,
		tool.engines,
	);

	const SPEC_ROWS = [
		{
			label: "Full Name",
			from: fromSpec.name,
			to: toSpec.name,
		},
		{
			label: "Standard / Specification",
			from: fromSpec.standard,
			to: toSpec.standard,
		},
		{
			label: "MIME Media Type",
			from: fromSpec.mime,
			to: toSpec.mime,
		},
		{
			label: "Magic Header Bytes",
			from: fromSpec.magicBytes,
			to: toSpec.magicBytes,
		},
		{
			label: "Compression / Codec",
			from: fromSpec.compression,
			to: toSpec.compression,
		},
		{
			label: "Color / Audio Depth",
			from: fromSpec.colorOrAudio,
			to: toSpec.colorOrAudio,
		},
		{
			label: "Alpha / Transparency",
			from: fromSpec.transparency,
			to: toSpec.transparency,
		},
		{
			label: "Browser Support",
			from: fromSpec.browserSupport,
			to: toSpec.browserSupport,
		},
		{
			label: "Ecosystem Application",
			from: fromSpec.typicalUse,
			to: toSpec.typicalUse,
		},
	];

	return (
		<div
			data-testid="technical-dossier"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "var(--gap-lg)",
				width: "100%",
			}}
		>
			{/* Format Specification Dossier */}
			<section
				data-testid="technical-specs-table"
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule-strong)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						flexWrap: "wrap",
						gap: "var(--gap-sm)",
					}}
				>
					<div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "var(--gap-sm)",
								marginBottom: "calc(var(--space-base) / 2)",
							}}
						>
							<span
								className="meta"
								style={{
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule-strong)",
									color: "var(--accent)",
									backgroundColor: "var(--ground)",
									padding: "0 14px",
									height: "23px",
									display: "inline-flex",
									alignItems: "center",
									borderRadius: "var(--radius-control)",
								}}
							>
								[ SPECIFICATION DOSSIER ]
							</span>
							<span
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
									letterSpacing: "0.06em",
								}}
							>
								{rawFrom.toUpperCase()} {"→"} {rawTo.toUpperCase()}
							</span>
						</div>
						<h2
							style={{
								fontSize: "var(--headline-size)",
								letterSpacing: "var(--headline-tracking)",
								fontWeight: 400,
								margin: 0,
								color: "var(--ink)",
							}}
						>
							Technical Specifications & Architecture Matrix
						</h2>
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
						VERIFIED SPECIFICATION {"//"} BITSTREAM FORENSICS
					</span>
				</div>

				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						lineHeight: 1.6,
						margin: 0,
					}}
				>
					Detailed side-by-side format architecture for {fromSpec.name} (.
					{fromSpec.ext}) and {toSpec.name} (.{toSpec.ext}). Every conversion
					executes strictly within isolated browser memory without network
					transit.
				</p>

				{/* Dossier Table */}
				<div
					style={{
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						backgroundColor: "var(--ground)",
						display: "flex",
						flexDirection: "column",
						width: "100%",
						overflowX: "auto",
					}}
				>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1.2fr 1.4fr 1.4fr",
							minWidth: "36rem",
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
						<span style={{ color: "var(--ink-muted)" }}>Parameter</span>
						<span style={{ color: "var(--ink)" }}>
							Input: {fromSpec.ext.toUpperCase()}
						</span>
						<span style={{ color: "var(--accent)" }}>
							Output: {toSpec.ext.toUpperCase()}
						</span>
					</div>

					{SPEC_ROWS.map((row, idx) => (
						<div
							key={row.label}
							style={{
								display: "grid",
								gridTemplateColumns: "1.2fr 1.4fr 1.4fr",
								minWidth: "36rem",
								padding: "calc(var(--space-base) * 1.25) var(--gap-sm)",
								borderBottomWidth:
									idx === SPEC_ROWS.length - 1 ? 0 : "var(--rule-width)",
								borderBottomStyle: "solid",
								borderBottomColor: "var(--rule-subtle)",
								backgroundColor:
									idx % 2 === 0 ? "var(--ground)" : "var(--surface)",
								fontSize: "var(--mono-size)",
								fontFamily: "var(--font-mono)",
								lineHeight: 1.5,
							}}
						>
							<span
								style={{
									color: "var(--ink-muted)",
									letterSpacing: "0.02em",
								}}
							>
								{row.label}
							</span>
							<span style={{ color: "var(--ink)" }}>{row.from}</span>
							<span style={{ color: "var(--ink)" }}>{row.to}</span>
						</div>
					))}
				</div>
			</section>

			{/* In-Browser Execution & Performance Benchmark Dossier */}
			<section
				data-testid="execution-benchmark-panel"
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
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
								backgroundColor: "var(--ground)",
								padding: "0 14px",
								height: "23px",
								display: "inline-flex",
								alignItems: "center",
								borderRadius: "var(--radius-control)",
							}}
						>
							[ RUNTIME BENCHMARK ]
						</span>
						<h3
							style={{
								fontSize: "var(--label-size)",
								color: "var(--ink)",
								fontWeight: "var(--label-weight)",
								margin: 0,
							}}
						>
							Local Execution & Resource Telemetry
						</h3>
					</div>

					<span
						className="mono text-[11px]"
						style={{ color: "var(--ink-muted)" }}
					>
						ZERO CLOUD INGRESS {"//"} ISOLATED CLIENT RUNTIME
					</span>
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
						gap: "var(--gap-sm)",
					}}
				>
					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
						}}
					>
						<span
							className="mono"
							style={{
								color: "var(--ink-muted)",
								fontSize: "11px",
								letterSpacing: "0.06em",
							}}
						>
							PROCESSING ENGINE
						</span>
						<span
							className="mono"
							style={{
								color: "var(--ink)",
								fontSize: "13px",
								fontWeight: 500,
							}}
						>
							{bench.runtimeEngine}
						</span>
					</div>

					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
						}}
					>
						<span
							className="mono"
							style={{
								color: "var(--ink-muted)",
								fontSize: "11px",
								letterSpacing: "0.06em",
							}}
						>
							NETWORK TELEMETRY
						</span>
						<span
							className="mono"
							style={{
								color: "var(--accent)",
								fontSize: "13px",
								fontWeight: 500,
							}}
						>
							0 BYTES TRANSFERRED
						</span>
					</div>

					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
						}}
					>
						<span
							className="mono"
							style={{
								color: "var(--ink-muted)",
								fontSize: "11px",
								letterSpacing: "0.06em",
							}}
						>
							ESTIMATED PAYLOAD DELTA
						</span>
						<span
							className="mono"
							style={{
								color: "var(--ink)",
								fontSize: "13px",
								fontWeight: 500,
							}}
						>
							{bench.typicalDelta}
						</span>
					</div>

					<div
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
						}}
					>
						<span
							className="mono"
							style={{
								color: "var(--ink-muted)",
								fontSize: "11px",
								letterSpacing: "0.06em",
							}}
						>
							DISPATCH LATENCY
						</span>
						<span
							className="mono"
							style={{
								color: "var(--ink)",
								fontSize: "13px",
								fontWeight: 500,
							}}
						>
							{bench.latencyProfile}
						</span>
					</div>
				</div>

				<div
					style={{
						padding: "var(--gap-sm)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule-subtle)",
						backgroundColor: "var(--ground)",
						fontSize: "var(--body-size)",
						color: "var(--ink-muted)",
						lineHeight: 1.5,
					}}
				>
					<span style={{ color: "var(--accent)", fontWeight: 500 }}>
						Memory Guarantee:{" "}
					</span>
					{bench.memoryProfile}. Unlike cloud SaaS converters that log file
					payloads into storage buckets, no intermediate frames persist after
					execution.
				</div>
			</section>

			{/* Step-by-Step Conversion Protocol */}
			<section
				data-testid="conversion-protocol-steps"
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-md)",
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
							backgroundColor: "var(--ground)",
							padding: "0 14px",
							height: "23px",
							display: "inline-flex",
							alignItems: "center",
							borderRadius: "var(--radius-control)",
						}}
					>
						[ EXECUTION PROTOCOL ]
					</span>
					<h3
						style={{
							fontSize: "var(--label-size)",
							color: "var(--ink)",
							fontWeight: "var(--label-weight)",
							margin: 0,
						}}
					>
						How to Convert {rawFrom.toUpperCase()} to {rawTo.toUpperCase()}{" "}
						Locally
					</h3>
				</div>

				<ol
					style={{
						margin: 0,
						padding: 0,
						listStyle: "none",
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
						gap: "var(--gap-sm)",
					}}
				>
					<li
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<span
							className="mono"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
							}}
						>
							PHASE 01 {"//"} STAGE SOURCE
						</span>
						<h4
							style={{
								margin: 0,
								fontSize: "var(--label-size)",
								color: "var(--ink)",
								fontWeight: 500,
							}}
						>
							Load .{rawFrom.toLowerCase()} Payload
						</h4>
						<p
							style={{
								margin: 0,
								fontSize: "var(--body-size)",
								color: "var(--ink-muted)",
								lineHeight: 1.5,
							}}
						>
							Drag and drop your .{rawFrom.toLowerCase()} file onto the working
							surface or use the system file dialog. File magic bytes are
							verified locally on device.
						</p>
					</li>

					<li
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<span
							className="mono"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
							}}
						>
							PHASE 02 {"//"} CONFIGURE
						</span>
						<h4
							style={{
								margin: 0,
								fontSize: "var(--label-size)",
								color: "var(--ink)",
								fontWeight: 500,
							}}
						>
							Set Codec & Quality Parameters
						</h4>
						<p
							style={{
								margin: 0,
								fontSize: "var(--body-size)",
								color: "var(--ink-muted)",
								lineHeight: 1.5,
							}}
						>
							Select a quality preset (Lossless, Visually Lossless, Balanced,
							Smallest) or adjust advanced encoding switches in the options
							panel.
						</p>
					</li>

					<li
						style={{
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							backgroundColor: "var(--ground)",
							padding: "var(--gap-sm)",
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-base)",
						}}
					>
						<span
							className="mono"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
							}}
						>
							PHASE 03 {"//"} COMPILE & EXPORT
						</span>
						<h4
							style={{
								margin: 0,
								fontSize: "var(--label-size)",
								color: "var(--ink)",
								fontWeight: 500,
							}}
						>
							Export .{rawTo.toLowerCase()} to Disk
						</h4>
						<p
							style={{
								margin: 0,
								fontSize: "var(--body-size)",
								color: "var(--ink-muted)",
								lineHeight: 1.5,
							}}
						>
							Click CONVERT to execute local WebAssembly compilation. Save the
							finished .{rawTo.toLowerCase()} directly to local storage, or
							stage it for chaining.
						</p>
					</li>
				</ol>
			</section>

			{/* Terminal / CLI Equivalent Recipe */}
			<section
				data-testid="cli-recipe-panel"
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--surface)",
					padding: "var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
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
								backgroundColor: "var(--ground)",
								padding: "0 14px",
								height: "23px",
								display: "inline-flex",
								alignItems: "center",
								borderRadius: "var(--radius-control)",
							}}
						>
							[ CLI SPECIFICATION ]
						</span>
						<h3
							style={{
								fontSize: "var(--label-size)",
								color: "var(--ink)",
								fontWeight: "var(--label-weight)",
								margin: 0,
							}}
						>
							Command-Line Equivalent Recipe
						</h3>
					</div>

					<span
						className="mono text-[11px]"
						style={{ color: "var(--ink-muted)" }}
					>
						DEVELOPER TERMINAL SYNTAX
					</span>
				</div>

				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						lineHeight: 1.5,
						margin: 0,
					}}
				>
					Prefer local shell scripting? Run this standard POSIX command on your
					machine to achieve equivalent transcoding without a web interface:
				</p>

				<pre
					style={{
						margin: 0,
						padding: "var(--gap-sm)",
						backgroundColor: "var(--ground)",
						borderWidth: "var(--rule-width)",
						borderStyle: "solid",
						borderColor: "var(--rule)",
						fontFamily: "var(--font-mono)",
						fontSize: "var(--mono-size)",
						color: "var(--ink)",
						overflowX: "auto",
						lineHeight: 1.6,
					}}
				>
					<code>{bench.terminalCommand}</code>
				</pre>
			</section>
		</div>
	);
}
