import Link from "next/link";

type Row = {
	label: string;
	value: number;
};

type Props = {
	data: Row[];
};

const BAR_TRACK_HEIGHT = 160;
const TABLE_MIN_WIDTH = 640;

const CATEGORY_TAGS: Record<string, string> = {
	image: "HEIC · AVIF · WEBP · PNG",
	video: "MP4 · GIF · WEBM · AVI",
	audio: "WAV · MP3 · FLAC · M4A",
	document: "PDF MERGE · SPLIT",
	data: "ZERO SERVER OVERHEAD",
};

/**
 * v2's hero data visualisation: an expansive architectural category console
 * with vertical telemetry meters, live status, and format previews.
 *
 * Built on a semantic `<table>` so assistive technology reads clean figures
 * while sighted visitors experience an authoritative, high-density system status.
 *
 * A zero row draws a 1px floor rather than nothing so empty categories
 * remain visible on the axis.
 */
export function BarChart({ data }: Props) {
	const max = Math.max(...data.map((row) => row.value), 1);
	const totalTools = data.reduce((sum, row) => sum + row.value, 0);

	return (
		<div
			style={{
				width: "100%",
				background: "var(--surface)",
				borderWidth: "var(--rule-width)",
				borderStyle: "solid",
				borderColor: "var(--rule)",
				padding: "var(--gap-md)",
				position: "relative",
			}}
		>
			<div
				style={{
					width: "100%",
					overflowX: "auto",
				}}
			>
				<table
					style={{
						width: "100%",
						minWidth: `${TABLE_MIN_WIDTH}px`,
						borderCollapse: "separate",
						borderSpacing: "var(--gap-sm) 0",
						tableLayout: "fixed",
					}}
				>
					<caption
						className="meta"
						style={{
							textAlign: "left",
							captionSide: "top",
							paddingBottom: "var(--gap-md)",
							borderBottom: "var(--rule-width) solid var(--rule-subtle)",
							marginBottom: "var(--gap-md)",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								flexWrap: "wrap",
								gap: "var(--space-base)",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "var(--space-base)",
								}}
							>
								<span
									style={{
										display: "inline-block",
										width: "var(--space-base)",
										height: "var(--space-base)",
										borderRadius: "var(--radius-pill)",
										background: "var(--accent)",
									}}
								/>
								<span
									style={{
										textTransform: "uppercase",
										letterSpacing: "var(--label-tracking)",
										fontWeight: 600,
										color: "var(--ink)",
										fontSize: "var(--label-size)",
									}}
								>
									Tools by category
								</span>
							</div>
							<div
								className="mono"
								style={{
									fontSize: "11px",
									color: "var(--ink-muted)",
									display: "flex",
									alignItems: "center",
									gap: "var(--gap-sm)",
								}}
							>
								<span>
									<strong style={{ color: "var(--ink)", fontWeight: 500 }}>
										{totalTools}
									</strong>{" "}
									client-side tools
								</span>
								<span style={{ color: "var(--rule)" }}>|</span>
								<span>100% private</span>
							</div>
						</div>
					</caption>
					<tbody>
						<tr>
							{data.map((row) => (
								<th
									key={row.label}
									scope="col"
									className="meta"
									style={{
										color: "var(--ink-muted)",
										fontWeight: 500,
										textAlign: "center",
										padding: "0 0 var(--gap-sm)",
										textTransform: "uppercase",
										letterSpacing: "var(--label-tracking)",
										fontSize: "11px",
									}}
								>
									<Link
										href={`/tools?category=${row.label}`}
										style={{
											color: "inherit",
											textDecoration: "none",
										}}
									>
										{row.label}
									</Link>
								</th>
							))}
						</tr>
						<tr>
							{data.map((row) => (
								<td
									key={row.label}
									style={{
										verticalAlign: "bottom",
										height: `${BAR_TRACK_HEIGHT}px`,
										padding: "0 var(--space-base)",
									}}
								>
									<div
										style={{
											height: "100%",
											width: "36px",
											margin: "0 auto",
											background: "var(--ground)",
											borderWidth: "var(--rule-width)",
											borderStyle: "solid",
											borderColor: "var(--rule-subtle)",
											display: "flex",
											alignItems: "flex-end",
											justifyContent: "center",
											padding: "var(--rule-width)",
										}}
									>
										<div
											data-bar
											style={{
												background: "var(--accent)",
												height:
													row.value === 0
														? "1px"
														: `${Math.round((row.value / max) * 10000) / 100}%`,
												width: "100%",
												margin: "0 auto",
											}}
										/>
									</div>
								</td>
							))}
						</tr>
						<tr>
							{data.map((row) => (
								<td
									key={row.label}
									className="mono"
									style={{
										color: "var(--ink)",
										textAlign: "center",
										padding: "var(--gap-sm) 0 0",
										fontSize: "20px",
										fontWeight: 600,
									}}
								>
									{row.value}
									<span
										style={{
											display: "block",
											fontSize: "10px",
											fontWeight: 400,
											color: "var(--ink-muted)",
											letterSpacing: "var(--label-tracking)",
											textTransform: "uppercase",
											marginTop: "var(--rule-width)",
										}}
									>
										tools
									</span>
								</td>
							))}
						</tr>
						<tr>
							{data.map((row) => (
								<td
									key={row.label}
									className="mono"
									style={{
										color: "var(--ink-muted)",
										textAlign: "center",
										padding:
											"var(--space-base) var(--space-base) var(--gap-sm)",
										fontSize: "10px",
										letterSpacing: "0.02em",
									}}
								>
									<span
										style={{
											display: "inline-block",
											padding: "var(--rule-width) var(--space-base)",
											background: "var(--ground)",
											borderWidth: "var(--rule-width)",
											borderStyle: "solid",
											borderColor: "var(--rule-subtle)",
											borderRadius: "var(--radius-pill)",
											whiteSpace: "nowrap",
										}}
									>
										{CATEGORY_TAGS[row.label] ?? "LOCAL"}
									</span>
								</td>
							))}
						</tr>
					</tbody>
				</table>
			</div>

			<div
				style={{
					marginTop: "var(--gap-sm)",
					paddingTop: "var(--gap-sm)",
					borderTopWidth: "var(--rule-width)",
					borderTopStyle: "solid",
					borderTopColor: "var(--rule-subtle)",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "var(--space-base)",
				}}
			>
				<span
					className="mono"
					style={{ fontSize: "11px", color: "var(--ink-muted)" }}
				>
					All tools compile to WebAssembly · zero telemetry · zero cloud latency
				</span>
				<Link
					href="/tools"
					className="meta"
					style={{
						fontSize: "11px",
						color: "var(--accent)",
						textDecoration: "none",
						display: "inline-flex",
						alignItems: "center",
						gap: "var(--space-base)",
					}}
				>
					Browse all {totalTools} tools →
				</Link>
			</div>
		</div>
	);
}
