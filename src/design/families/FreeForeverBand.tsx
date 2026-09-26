import { PillLink } from "@/design/primitives/PillLink";
import { CHROME_EXTENSION_URL } from "@/lib/site";

const INCLUDED = [
	"Every tool included",
	"No file-size paywall",
	"No queue -- 0ms start",
	"Nothing retained, ever",
];

const CLOUD_TOLL = [
	"$19/mo paywall at 50-100MB",
	"30s-15m queues on shared servers",
	"Files retained for hours or days",
	"Upload everything first, hope second",
];

/**
 * The pricing section with one row instead of three tiers: $0 covers
 * everything because a static site has no server bill to pass on. The
 * right column is the cloud toll from the manifesto's own numbers
 * ($19/mo, 30s-15m queues, hours-long retention) -- the comparison a
 * pricing table exists to make, without inventing plans nobody sells.
 *
 * Capped with no horizontal padding of its own: the shell owns the gutter,
 * the band owns only its cap.
 */
export function FreeForeverBand() {
	return (
		<div
			style={{
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
				gap: "var(--space-base)",
			}}
		>
			<div
				className="m3-surface-card flex flex-col gap-[var(--gap-sm)] p-[var(--gap-md)]"
				style={{
					backgroundColor: "var(--ground)",
					borderColor: "var(--accent)",
				}}
			>
				<span
					className="meta"
					style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
				>
					THE ONLY PLAN
				</span>
				<p
					className="mono"
					style={{
						fontSize: "var(--headline-size)",
						color: "var(--ink)",
						margin: 0,
					}}
				>
					$0{" "}
					<span
						style={{ fontSize: "var(--body-size)", color: "var(--ink-muted)" }}
					>
						/ forever
					</span>
				</p>
				<ul
					style={{
						listStyle: "none",
						margin: 0,
						paddingLeft: 0,
						paddingRight: 0,
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
					}}
				>
					{INCLUDED.map((row) => (
						<li
							key={row}
							className="mono"
							style={{ fontSize: "var(--mono-size)", color: "var(--ink)" }}
						>
							<span style={{ color: "var(--accent)" }}>{"✓ "}</span>
							{row}
						</li>
					))}
				</ul>
				<div
					style={{
						display: "flex",
						gap: "var(--space-base)",
						flexWrap: "wrap",
						marginTop: "var(--space-base)",
					}}
				>
					<PillLink href="/convert" variant="fill" size="sm">
						Start converting
					</PillLink>
					<PillLink
						href={CHROME_EXTENSION_URL}
						variant="outline"
						size="sm"
						external
					>
						Get the extension
					</PillLink>
				</div>
			</div>

			<div
				className="m3-surface-card flex flex-col gap-[var(--gap-sm)] p-[var(--gap-md)]"
				style={{ backgroundColor: "var(--ground)" }}
			>
				<span
					className="meta"
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--mono-size)",
					}}
				>
					THE CLOUD TOLL
				</span>
				<p
					className="mono"
					style={{
						fontSize: "var(--headline-size)",
						color: "var(--ink-muted)",
						margin: 0,
					}}
				>
					$19 <span style={{ fontSize: "var(--body-size)" }}>/ month</span>
				</p>
				<ul
					style={{
						listStyle: "none",
						margin: 0,
						paddingLeft: 0,
						paddingRight: 0,
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
					}}
				>
					{CLOUD_TOLL.map((row) => (
						<li
							key={row}
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
							}}
						>
							<span style={{ color: "var(--rule-strong)" }}>{"— "}</span>
							{row}
						</li>
					))}
				</ul>
				<p
					className="mono"
					style={{
						fontSize: "var(--mono-size)",
						color: "var(--rule-strong)",
						margin: "var(--space-base) 0 0",
					}}
				>
					Per the manifesto above. Per their pricing pages.
				</p>
			</div>
		</div>
	);
}
