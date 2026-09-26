import Link from "next/link";
import { PillLink } from "@/design/primitives/PillLink";
import { CHROME_EXTENSION_URL } from "@/lib/site";

const INCLUDED = [
	"Every tool included",
	"No file-size paywall",
	"No queue -- 0ms start",
	"Nothing retained, ever",
	"100% in-browser WebAssembly",
];

const CLOUD_TOLL = [
	"$19/mo paywall at 50-100MB",
	"30s-15m queues on shared servers",
	"Files retained for hours or days",
	"Upload everything first, hope second",
	"Ad trackers & server retention",
];

const AIR_GAPPED = [
	"Air-gapped offline operation",
	"Static export with zero backend",
	"Zero external telemetry or beacons",
	"Verified by CI Network Guard",
	"Installable as standalone PWA",
];

/**
 * WriteMate-style 3-card pricing grid:
 * The only plan is $0 because a static site has no server bill to pass on.
 * The middle card exposes the cloud toll ($19/mo, queue delays, server retention)
 * for honest contrast. The third card covers air-gapped enterprise use.
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
				gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
				gap: "var(--gap-sm)",
			}}
		>
			{/* Plan 1: The Only Plan (convrtr) */}
			<div
				className="m3-surface-card flex flex-col gap-[var(--gap-sm)] p-[var(--gap-md)]"
				style={{
					backgroundColor: "var(--surface)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--accent)",
					position: "relative",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<span
						className="meta"
						style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
					>
						THE ONLY PLAN
					</span>
					<span
						className="mono px-2 py-0.5"
						style={{
							fontSize: "calc(var(--mono-size) * 0.85)",
							backgroundColor: "var(--ground)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--accent)",
							borderRadius: "var(--radius-control)",
							color: "var(--accent)",
							letterSpacing: "0.06em",
						}}
					>
						RECOMMENDED
					</span>
				</div>

				<div>
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
							style={{
								fontSize: "var(--body-size)",
								color: "var(--ink-muted)",
							}}
						>
							/ forever
						</span>
					</p>
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: "calc(var(--space-base) / 2) 0 0",
						}}
					>
						For creators, developers, and privacy-first teams.
					</p>
				</div>

				<ul
					style={{
						listStyle: "none",
						margin: 0,
						paddingLeft: 0,
						paddingRight: 0,
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
						borderTopWidth: "var(--rule-width)",
						borderTopStyle: "solid",
						borderTopColor: "var(--rule-subtle)",
						paddingTop: "var(--space-base)",
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
						marginTop: "auto",
						paddingTop: "var(--space-base)",
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

			{/* Plan 2: The Cloud Toll (Other Guys) */}
			<div
				className="m3-surface-card flex flex-col gap-[var(--gap-sm)] p-[var(--gap-md)]"
				style={{
					backgroundColor: "var(--ground)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
				}}
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

				<div>
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
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: "calc(var(--space-base) / 2) 0 0",
						}}
					>
						What cloud converters charge you, plus your data.
					</p>
				</div>

				<ul
					style={{
						listStyle: "none",
						margin: 0,
						paddingLeft: 0,
						paddingRight: 0,
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
						borderTopWidth: "var(--rule-width)",
						borderTopStyle: "solid",
						borderTopColor: "var(--rule-subtle)",
						paddingTop: "var(--space-base)",
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
						margin: "auto 0 0",
						paddingTop: "var(--space-base)",
					}}
				>
					Per their public pricing pages & terms of service.
				</p>
			</div>

			{/* Plan 3: Air-Gapped & Enterprise */}
			<div
				className="m3-surface-card flex flex-col gap-[var(--gap-sm)] p-[var(--gap-md)]"
				style={{
					backgroundColor: "var(--surface)",
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
				}}
			>
				<span
					className="meta"
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--mono-size)",
					}}
				>
					AIR-GAPPED & ENTERPRISE
				</span>

				<div>
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
							style={{
								fontSize: "var(--body-size)",
								color: "var(--ink-muted)",
							}}
						>
							/ open source
						</span>
					</p>
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: "calc(var(--space-base) / 2) 0 0",
						}}
					>
						For security audits, healthcare & defense networks.
					</p>
				</div>

				<ul
					style={{
						listStyle: "none",
						margin: 0,
						paddingLeft: 0,
						paddingRight: 0,
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
						borderTopWidth: "var(--rule-width)",
						borderTopStyle: "solid",
						borderTopColor: "var(--rule-subtle)",
						paddingTop: "var(--space-base)",
					}}
				>
					{AIR_GAPPED.map((row) => (
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
						marginTop: "auto",
						paddingTop: "var(--space-base)",
					}}
				>
					<Link
						href="/about"
						className="mono"
						style={{
							display: "inline-flex",
							alignItems: "center",
							fontSize: "var(--mono-size)",
							color: "var(--ink)",
							textDecoration: "underline",
							textUnderlineOffset: "3px",
						}}
					>
						Read the security architecture ↗
					</Link>
				</div>
			</div>
		</div>
	);
}
