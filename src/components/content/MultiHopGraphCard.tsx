"use client";

import { useState } from "react";
import { CardHeader } from "@/design/families/CardHeader";

interface RoutingExample {
	from: string;
	to: string;
	hops: string[];
	engines: string[];
	description: string;
}

const ROUTING_PRESETS: RoutingExample[] = [
	{
		from: "HEIC",
		to: "WEBP",
		hops: ["HEIC (Apple RAW)", "RGBA Decoded Buffer", "WebP (Lossy Balanced)"],
		engines: ["libheif-js (WASM)", "libwebp (Oxipng JSquash)"],
		description:
			"Apple proprietary HEIC decoded client-side via libheif WASM bundle, preserving 10-bit color profile and re-encoded into modern WebP.",
	},
	{
		from: "CLIP",
		to: "PDF",
		hops: ["CLIP (Clip Studio)", "PNG Raster Extraction", "Multi-Page PDF"],
		engines: ["SQLite in-WASM reader", "pdf-lib (Vector Staging)"],
		description:
			"Extracts raster layers embedded inside proprietary Clip Studio Paint databases directly into a print-ready vector PDF container.",
	},
	{
		from: "XM",
		to: "MP3",
		hops: [
			"XM (FastTracker II)",
			"PCM 16-bit Float Stream",
			"MP3 (320kbps CBR)",
		],
		engines: ["FastTracker Synthesizer", "LAME.js (CBR Encoder)"],
		description:
			"Renders 90s tracker chiptune audio channels in real-time float PCM, encoded into high-fidelity MP3 without server transcoding.",
	},
	{
		from: "PCK",
		to: "MP3",
		hops: ["PCK (Godot Package)", "WAV Audio Extraction", "MP3 Audio"],
		engines: ["Binary Stream Parser", "LAME.js MP3 Engine"],
		description:
			"Decapsulates Godot game engine binary packages in memory, extracting raw sound effects and converting them to universal MP3.",
	},
];

export function MultiHopGraphCard() {
	const [activeIdx, setActiveIdx] = useState(0);
	const active = ROUTING_PRESETS[activeIdx] ??
		ROUTING_PRESETS[0] ?? {
			from: "",
			to: "",
			hops: [],
			engines: [],
			description: "",
		};

	return (
		<div className="m3-surface-card flex w-full flex-col gap-[var(--gap-md)] p-[var(--gap-md)]">
			<CardHeader
				eyebrow="DYNAMIC ROUTING // MULTI-HOP GRAPH"
				title="Intelligent path traversal."
				lede="When you feed convrtr a file format that cannot be converted in a single hop, the graph engine automatically computes the shortest, highest-fidelity route across local decoders and encoders in real time."
				badge={
					<span
						className="mono rounded-full border px-3 py-1"
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							borderColor: "var(--rule-subtle)",
							backgroundColor: "var(--surface)",
						}}
					>
						147 WASM ENGINES ACTIVE
					</span>
				}
			/>

			{/* Presets Navigation */}
			<div
				style={{
					display: "flex",
					gap: "calc(var(--space-base) / 2)",
					flexWrap: "wrap",
				}}
			>
				{ROUTING_PRESETS.map((preset, idx) => {
					const isSelected = idx === activeIdx;
					return (
						<button
							key={`${preset.from}-${preset.to}`}
							type="button"
							onClick={() => setActiveIdx(idx)}
							className={`m3-chip ${isSelected ? "m3-chip-active" : ""}`}
						>
							{preset.from} ➔ {preset.to}
						</button>
					);
				})}
			</div>

			{/* Interactive Flow Nodes */}
			<div
				className="m3-surface-card flex flex-col gap-[var(--gap-sm)] p-[var(--gap-md)]"
				style={{
					backgroundColor: "var(--ground)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "var(--space-base)",
						flexWrap: "wrap",
					}}
				>
					{active.hops.map((hop, hIdx) => (
						<div
							key={hop}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "var(--space-base)",
							}}
						>
							<div
								className="m3-surface-card"
								style={{
									borderColor:
										hIdx === 0 || hIdx === active.hops.length - 1
											? "var(--accent)"
											: "var(--rule-subtle)",
									padding: "var(--space-base) var(--gap-sm)",
								}}
							>
								<div
									className="meta"
									style={{
										color: "var(--ink-muted)",
										fontSize: "var(--mono-size)",
									}}
								>
									HOP 0{hIdx + 1}
								</div>
								<div
									className="mono"
									style={{
										color: "var(--ink)",
										fontSize: "var(--mono-size)",
										fontWeight: 600,
									}}
								>
									{hop}
								</div>
							</div>
							{hIdx < active.hops.length - 1 && (
								<span
									style={{
										color: "var(--accent)",
										fontSize: "var(--body-size)",
										fontFamily: "var(--font-mono)",
									}}
								>
									➔
								</span>
							)}
						</div>
					))}
				</div>

				<div
					style={{
						borderTopWidth: "var(--rule-width)",
						borderTopStyle: "solid",
						borderTopColor: "var(--rule)",
						paddingTop: "var(--space-base)",
						marginTop: "calc(var(--space-base) / 2)",
						display: "flex",
						flexDirection: "column",
						gap: "calc(var(--space-base) / 2)",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: "var(--space-base)",
							flexWrap: "wrap",
							alignItems: "center",
						}}
					>
						<span
							className="meta"
							style={{
								color: "var(--accent)",
								fontSize: "var(--mono-size)",
							}}
						>
							ENGINES EXECUTED:
						</span>
						{active.engines.map((eng) => (
							<span key={eng} className="m3-chip py-0.5 text-[11px]">
								{eng}
							</span>
						))}
					</div>
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: 0,
							lineHeight: 1.5,
						}}
					>
						{active.description}
					</p>
				</div>
			</div>
		</div>
	);
}
