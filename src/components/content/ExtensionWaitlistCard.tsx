"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CardHeader } from "@/design/families/CardHeader";
import { ArrowUpRight } from "@/design/primitives/ArrowUpRight";
import { CountUp } from "@/design/primitives/CountUp";
import { PillLink } from "@/design/primitives/PillLink";
import { CHROME_EXTENSION_URL } from "@/lib/site";
import { getSubscriptionStats } from "@/lib/subscriptions";
import { SubscribeForm } from "./SubscribeForm";

const FEATURES = [
	{
		code: "⌘⇧C",
		title: "Side Panel Docking",
		desc: "Dock convrtr alongside any active webpage for drag-and-drop batch conversions without tab hopping.",
	},
	{
		code: "⌘⇧,",
		title: "Instant Quick Popup",
		desc: "Summon a high-speed popup converter from anywhere with a single global shortcut.",
	},
	{
		code: "DOM-EXT",
		title: "Page Media Extraction",
		desc: "Scrape responsive images, videos, audio streams, and inline vector SVGs from any site in 1 click.",
	},
	{
		code: "CTX-MNU",
		title: "Right-Click Context Menu",
		desc: "Right-click any web media, selected code, or download link to convert locally in 0ms.",
	},
	{
		code: "cv ...",
		title: "Address Bar Omnibox",
		desc: "Type 'cv png to webp' directly into the Chrome address bar for instant format lookup.",
	},
	{
		code: "0-LEAK",
		title: "Zero Remote Telemetry",
		desc: "Uses WebCodecs & WebAssembly workers entirely in your browser sandbox. Works completely offline.",
	},
];

const CHANNELS = [
	{ value: "extension" as const, label: "Extension Updates" },
	{ value: "ecosystem" as const, label: "Ecosystem Releases" },
	{ value: "releases" as const, label: "WASM Decoder Changelogs" },
];

export function ExtensionWaitlistCard() {
	const [subCount, setSubCount] = useState(1424);

	useEffect(() => {
		const stats = getSubscriptionStats();
		setSubCount(stats.benchmarkWaitlistTotal);
	}, []);

	const refreshCount = () => {
		setSubCount(getSubscriptionStats().benchmarkWaitlistTotal);
	};

	return (
		<div
			id="extension-spotlight"
			className="m3-surface-card relative flex w-full flex-col gap-[var(--gap-md)] p-[var(--gap-md)]"
		>
			<div
				style={{
					borderBottomWidth: "var(--rule-width)",
					borderBottomStyle: "solid",
					borderBottomColor: "var(--rule)",
					paddingBottom: "var(--space-base)",
				}}
			>
				<CardHeader
					eyebrow="CHROME WEB STORE // MANIFEST V3 // NOW LIVE"
					title="convrtr inside Chrome."
					headingLevel="h2"
					badge={
						<span
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--accent)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: "var(--rule-strong)",
								padding: "calc(var(--space-base) / 4) var(--space-base)",
								borderRadius: "var(--radius-control)",
								backgroundColor: "var(--ground)",
							}}
						>
							● NOW LIVE ON CHROME WEB STORE
						</span>
					}
				/>
			</div>

			{/* Description & Direct Store CTA */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
				}}
			>
				<p
					style={{
						color: "var(--ink-muted)",
						fontSize: "var(--body-size)",
						lineHeight: 1.6,
						margin: 0,
						maxWidth: "65ch",
					}}
				>
					The universal in-browser media converter brought directly to your
					daily workflow. Convert, transpile, extract, and inspect assets across
					any webpage without leaving your tab. Zero file bytes or metadata ever
					leave your machine.
				</p>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "var(--gap-md)",
						flexWrap: "wrap",
						marginTop: "calc(var(--space-base) / 2)",
					}}
				>
					<PillLink
						href={CHROME_EXTENSION_URL}
						variant="fill"
						size="sm"
						external
					>
						<span>INSTALL FROM CHROME WEB STORE</span>
						<ArrowUpRight size={14} />
					</PillLink>

					<Link
						href="/extension"
						style={{
							fontSize: "var(--mono-size)",
							fontFamily: "var(--font-mono)",
							color: "var(--accent)",
							textDecoration: "underline",
							textUnderlineOffset: "3px",
						}}
					>
						VIEW EXTENSION SPECS & SHORTCUTS ➔
					</Link>
				</div>
			</div>

			{/* 6-Grid Feature Capabilities */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: "var(--space-base)",
				}}
			>
				{FEATURES.map((f) => (
					<div
						key={f.code}
						className="m3-surface-card flex flex-col gap-2 p-[var(--gap-sm)]"
						style={{
							backgroundColor: "var(--ground)",
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
								className="m3-chip py-0.5 text-[10px] tracking-[0.08em]"
								style={{
									color: "var(--accent)",
								}}
							>
								{f.code}
							</span>
							<span
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink-muted)",
								}}
							>
								●
							</span>
						</div>
						<h3
							style={{
								fontSize: "var(--body-size)",
								fontWeight: 500,
								margin: 0,
								color: "var(--ink)",
							}}
						>
							{f.title}
						</h3>
						<p
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink-muted)",
								margin: 0,
								lineHeight: 1.5,
							}}
						>
							{f.desc}
						</p>
					</div>
				))}
			</div>

			{/* Release Radar Subscription Panel */}
			<div
				id="extension-waitlist"
				className="m3-surface-card flex flex-col gap-[var(--space-base)] p-[var(--gap-md)]"
				style={{
					borderColor: "var(--rule-strong)",
					backgroundColor: "var(--ground)",
				}}
			>
				<CardHeader
					eyebrow="RELEASE RADAR // TECHNICAL CHANGELOGS"
					title="Subscribe to Extension Changelogs & WASM Decoder Updates"
					lede="Receive technical release notes, new format additions, and engine performance updates directly from the engineering team."
				/>

				<p
					className="mono"
					style={{
						fontSize: "var(--mono-size)",
						color: "var(--accent)",
						margin: 0,
					}}
				>
					<CountUp end={subCount} /> SUBSCRIBED {"//"} RELEASE RADAR
				</p>

				<SubscribeForm
					defaultChannels={["extension", "ecosystem"]}
					source="extension-waitlist"
					chips={CHANNELS}
					emailPlaceholder="engineer@domain.com"
					submitLabel="Subscribe for Updates ➔"
					onSubscribed={refreshCount}
				/>
			</div>
		</div>
	);
}
