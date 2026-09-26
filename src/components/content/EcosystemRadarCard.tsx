"use client";

import { CardHeader } from "@/design/families/CardHeader";
import { SubscribeForm } from "./SubscribeForm";

const CHANNELS = [
	{ value: "ecosystem" as const, label: "Product Releases" },
	{ value: "releases" as const, label: "New Codecs & WASM Engines" },
	{ value: "security" as const, label: "Security & Network Audits" },
];

export function EcosystemRadarCard() {
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
			<CardHeader
				eyebrow="DISPATCH // STAY SYNCHRONIZED"
				title="The convrtr Ecosystem Radar"
				lede="We release new WebAssembly format decoders, browser extensions, and client-side tools on a continuous cycle. Subscribe for direct dispatch alerts when new formats arrive or when major performance upgrades drop."
				badge={
					<span
						className="mono"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							borderWidth: "var(--rule-width)",
							borderStyle: "solid",
							borderColor: "var(--rule)",
							padding: "calc(var(--space-base) / 4) var(--space-base)",
							borderRadius: "var(--radius-control)",
						}}
					>
						ZERO TELEMETRY {"//"} RSS & EMAIL
					</span>
				}
			/>

			<SubscribeForm
				defaultChannels={["ecosystem", "releases", "security"]}
				source="radar"
				chips={CHANNELS}
				emailPlaceholder="researcher@lab.org"
				submitLabel="Subscribe to Radar ➔"
			/>
		</div>
	);
}
