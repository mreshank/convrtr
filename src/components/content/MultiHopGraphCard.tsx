"use client";

import { useState } from "react";

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
		hops: ["XM (FastTracker II)", "PCM 16-bit Float Stream", "MP3 (320kbps CBR)"],
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
	const active = (ROUTING_PRESETS[activeIdx] ?? ROUTING_PRESETS[0])!;

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
						DYNAMIC ROUTING {"//"} MULTI-HOP GRAPH
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
						Intelligent path traversal.
					</h3>
				</div>
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
					147 WASM ENGINES ACTIVE
				</span>
			</div>

			<p
				style={{
					color: "var(--ink-muted)",
					fontSize: "var(--body-size)",
					lineHeight: 1.6,
					margin: 0,
					maxWidth: "65ch",
				}}
			>
				When you feed convrtr a file format that cannot be converted in a single
				hop, the graph engine automatically computes the shortest,
				highest-fidelity route across local decoders and encoders in real time.
			</p>

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
							style={{
								padding: "calc(var(--space-base) / 4) var(--space-base)",
								borderRadius: "var(--radius-pill)",
								borderWidth: "var(--rule-width)",
								borderStyle: "solid",
								borderColor: isSelected
									? "var(--rule-strong)"
									: "var(--rule)",
								backgroundColor: isSelected ? "var(--ink)" : "transparent",
								color: isSelected ? "var(--ground)" : "var(--ink-muted)",
								fontFamily: "var(--font-mono)",
								fontSize: "var(--mono-size)",
								fontWeight: 600,
								cursor: "pointer",
								letterSpacing: "0.06em",
								textTransform: "uppercase",
							}}
						>
							{preset.from} ➔ {preset.to}
						</button>
					);
				})}
			</div>

			{/* Interactive Flow Nodes */}
			<div
				style={{
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--ground)",
					padding: "var(--gap-md)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--gap-sm)",
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
								style={{
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor:
										hIdx === 0 || hIdx === active.hops.length - 1
											? "var(--accent)"
											: "var(--rule)",
									backgroundColor: "var(--surface)",
									padding: "var(--space-base) var(--gap-sm)",
									borderRadius: "var(--radius-control)",
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
							<span
								key={eng}
								className="mono"
								style={{
									fontSize: "var(--mono-size)",
									color: "var(--ink)",
									backgroundColor: "var(--surface)",
									padding:
										"calc(var(--space-base) / 4) calc(var(--space-base) / 2)",
									borderRadius: "var(--radius-control)",
									borderWidth: "var(--rule-width)",
									borderStyle: "solid",
									borderColor: "var(--rule)",
								}}
							>
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
