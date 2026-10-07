import { PillLink } from "@/design/primitives/PillLink";
import { CHROME_EXTENSION_URL } from "@/lib/site";

const INCLUDED = [
	"Every tool included",
	"No file-size paywall",
	"No queue -- 0ms start",
	"Nothing retained, ever",
	"100% in-browser WebAssembly",
];

const CLOUD_OFFER = [
	"Server-side batch conversion pipelines",
	"Custom format + codec onboarding",
	"Security review with audit trail",
	"Dedicated support channel",
	"Scoped per job, not per seat",
];

/**
 * Two-card contrast: local self-serve versus managed cloud.
 * Plan 1 is $0 because a static site has no server bill to pass on --
 * anyone converting in a browser never needs anything else. Plan 2 is for
 * the jobs a browser cannot do: files that cannot reach a device, batches
 * that need a pipeline, teams that need a review trail. That one is a
 * conversation, not a checkout, so its CTA goes to `/contact`.
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
						CONVRTR LOCAL
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
						For everyone converting in a browser. Your files, your device, our
						engines.
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

			{/* Plan 2: Managed cloud (contact us) */}
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
					CONVRTR CLOUD
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
						Custom{" "}
						<span
							style={{
								fontSize: "var(--body-size)",
								color: "var(--ink-muted)",
							}}
						>
							/ scoped per job
						</span>
					</p>
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: "calc(var(--space-base) / 2) 0 0",
						}}
					>
						For teams whose files cannot reach a browser. We run the pipelines
						for you.
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
					{CLOUD_OFFER.map((row) => (
						<li
							key={row}
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink)",
							}}
						>
							<span style={{ color: "var(--accent)" }}>{"✓ "}</span>
							{row}
						</li>
					))}
				</ul>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-base)",
						marginTop: "auto",
						paddingTop: "var(--space-base)",
					}}
				>
					<div>
						<PillLink href="/contact" variant="outline" size="sm">
							Contact us
						</PillLink>
					</div>
					<p
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: 0,
						}}
					>
						A conversation, not a checkout.
					</p>
				</div>
			</div>
		</div>
	);
}
