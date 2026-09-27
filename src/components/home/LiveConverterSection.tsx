"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ToolsDualMarquee } from "@/components/home/ToolsDualMarquee";
import { toolsByCategory } from "@/core/registry/stats";
import { BarChart } from "@/design/families/BarChart";

const QUICK_ACTIONS = [
	{ label: "HEIC ➔ JPG", href: "/heic-to-jpg", category: "image" },
	{ label: "MP4 ➔ MP3", href: "/mp4-to-mp3", category: "audio" },
	{ label: "PDF ➔ PNG", href: "/pdf-to-png", category: "document" },
	{ label: "WEBP ➔ PNG", href: "/webp-to-png", category: "image" },
	{ label: "MKV ➔ MP4", href: "/mkv-to-mp4", category: "video" },
	{ label: "CSV ➔ PARQUET", href: "/csv-to-parquet", category: "data" },
];

// The warp is this section's background, not the panel's: it fills the
// whole band behind the instrument. Dynamic with no SSR so the 3D stack
// stays out of the server bundle.
const SectionWarp = dynamic(() => import("@/components/effects/Hyperspeed"), {
	ssr: false,
});

/**
 * Section 2: the live conversion showcase, directly under the hero.
 *
 * Section 1 (HeroBand) is the headline on the aurora; this band is the
 * instrument itself, running on the warp. The warp cruises until a
 * conversion surges it: pressing anywhere in the section throttles it up
 * while held, and an idle pulse surges it every few seconds so the speed
 * state reads without any input. The readout copy stays the state; the
 * canvas is only motion, hidden from assistive tech.
 */
export function LiveConverterSection() {
	const [activeTab, setActiveTab] = useState<"instrument" | "registry">(
		"instrument",
	);
	const [boosted, setBoosted] = useState(false);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let surgeTimeout = 0;
		const pulse = window.setInterval(() => {
			setBoosted(true);
			surgeTimeout = window.setTimeout(() => setBoosted(false), 1600);
		}, 6000);
		return () => {
			window.clearInterval(pulse);
			window.clearTimeout(surgeTimeout);
		};
	}, []);

	return (
		<section
			aria-label="Live conversion"
			onPointerDown={() => setBoosted(true)}
			onPointerUp={() => setBoosted(false)}
			onPointerLeave={() => setBoosted(false)}
			onPointerCancel={() => setBoosted(false)}
			style={{
				position: "relative",
				overflow: "hidden",
				maxWidth: "var(--max-width)",
				margin: "0 auto",
				width: "100%",
				// Pulls the band up over the shell's own section rhythm so it
				// opens directly under the hero with no void between the two
				// canvases: the aurora above, the warp below, one ground.
				marginTop: "calc(var(--section-pad) * -1)",
				borderRadius: "var(--radius)",
			}}
		>
			<div
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					opacity: 0.5,
					pointerEvents: "none",
				}}
			>
				<SectionWarp boosted={boosted} />
			</div>
			<div style={{ position: "relative" }}>
				<div className="w-full max-w-4xl mx-auto mt-[var(--gap-md)] rounded-[var(--radius)] border border-rule bg-surface overflow-hidden">
					{/* Window Chrome Header Bar */}
					<div className="flex items-center justify-between px-[var(--gap-sm)] py-[var(--space-base)] border-b border-rule bg-ground">
						<div className="flex items-center gap-[var(--space-base)]">
							<div className="flex items-center gap-1.5">
								<span
									className="inline-block w-2.5 h-2.5 rounded-full"
									style={{ backgroundColor: "var(--rule-strong)" }}
									aria-hidden="true"
								/>
								<span
									className="inline-block w-2.5 h-2.5 rounded-full"
									style={{ backgroundColor: "var(--rule)" }}
									aria-hidden="true"
								/>
								<span
									className="inline-block w-2.5 h-2.5 rounded-full"
									style={{ backgroundColor: "var(--rule-subtle)" }}
									aria-hidden="true"
								/>
							</div>
							<span
								className="mono text-xs hidden sm:inline-block"
								style={{ color: "var(--ink-muted)", letterSpacing: "0.06em" }}
							>
								convrtr-core.wasm {"//"} v2.4.0 [CLIENT KERNEL]
							</span>
						</div>

						{/* Tab Selector */}
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setActiveTab("instrument")}
								className={`mono px-2 py-0.5 text-xs transition-colors cursor-pointer rounded-[var(--radius-control)] ${
									activeTab === "instrument"
										? "bg-surface text-ink border border-rule font-medium"
										: "text-ink-muted hover:text-ink"
								}`}
							>
								[ INSTRUMENT ]
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("registry")}
								className={`mono px-2 py-0.5 text-xs transition-colors cursor-pointer rounded-[var(--radius-control)] ${
									activeTab === "registry"
										? "bg-surface text-ink border border-rule font-medium"
										: "text-ink-muted hover:text-ink"
								}`}
							>
								[ REGISTRY ]
							</button>
						</div>

						<span
							className="mono text-xs hidden md:inline-flex items-center gap-1"
							style={{ color: "var(--accent)", letterSpacing: "0.06em" }}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
							AIR-GAPPED {"//"} ZERO UPLOADS
						</span>
					</div>

					{/* Tab Body */}
					<div
						style={{ display: activeTab === "instrument" ? "block" : "none" }}
						className="p-[var(--gap-md)] flex flex-col gap-[var(--gap-sm)]"
					>
						{/* Active On-Device Conversion Simulation Instrument */}
						<div className="w-full rounded-[var(--radius)] border border-rule bg-ground p-[var(--gap-sm)] flex flex-col gap-[var(--space-base)]">
							{/* Status Bar */}
							<div
								className="flex items-center justify-between border-b border-rule-subtle pb-[var(--space-base)] text-xs mono"
								style={{ position: "relative" }}
							>
								<div className="flex items-center gap-2">
									<span
										className="w-2 h-2 rounded-full animate-pulse"
										style={{ backgroundColor: "var(--accent)" }}
										aria-hidden="true"
									/>
									<span style={{ color: "var(--ink)", fontWeight: 600 }}>
										ACTIVE SESSION {"//"} INSTANT LOCAL PROCESSING
									</span>
								</div>
								<span
									style={{ color: "var(--ink-muted)" }}
									className="hidden sm:inline-block"
								>
									KERNEL: libvips-wasm-simd
								</span>
							</div>

							{/* File Pipeline Visualizer */}
							<div
								className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-base)] items-center p-[var(--space-base)] rounded-[var(--radius)] border border-rule-subtle bg-surface"
								style={{ position: "relative" }}
							>
								{/* Source Card */}
								<div className="flex items-center gap-[var(--space-base)]">
									<div
										className="w-10 h-10 rounded-[var(--radius-control)] border border-rule flex flex-col items-center justify-center shrink-0"
										style={{ backgroundColor: "var(--ground)" }}
									>
										<span
											className="mono text-[9px]"
											style={{ color: "var(--ink-muted)" }}
										>
											SRC
										</span>
										<span
											className="mono text-xs font-bold"
											style={{ color: "var(--ink)" }}
										>
											HEIC
										</span>
									</div>
									<div className="flex flex-col min-w-0">
										<span
											className="mono text-xs font-semibold truncate"
											style={{ color: "var(--ink)" }}
										>
											IMG_4092_RAW.HEIC
										</span>
										<span
											className="mono text-[11px]"
											style={{ color: "var(--ink-muted)" }}
										>
											48.2 MB · 4032×3024
										</span>
									</div>
								</div>

								{/* Transformation Gauge */}
								<div className="flex flex-col items-center justify-center text-center gap-1">
									<div
										className="flex items-center gap-1.5 mono text-[11px]"
										style={{ color: "var(--accent)" }}
									>
										<span>➔</span>
										<span>CONVERTED IN 0.14s</span>
										<span>➔</span>
									</div>
									<div className="w-full h-1.5 rounded-full border border-rule-subtle bg-ground overflow-hidden">
										<div
											className="h-full w-full"
											style={{ backgroundColor: "var(--accent)" }}
										/>
									</div>
									<span
										className="mono text-[10px]"
										style={{ color: "var(--ink-muted)" }}
									>
										344 MB/s · BIT-EXACT FIDELITY
									</span>
								</div>

								{/* Output Target Card */}
								<div className="flex items-center justify-between gap-[var(--space-base)]">
									<div className="flex items-center gap-[var(--space-base)]">
										<div
											className="w-10 h-10 rounded-[var(--radius-control)] border border-rule flex flex-col items-center justify-center shrink-0"
											style={{ backgroundColor: "var(--ground)" }}
										>
											<span
												className="mono text-[9px]"
												style={{ color: "var(--accent)" }}
											>
												OUT
											</span>
											<span
												className="mono text-xs font-bold"
												style={{ color: "var(--accent)" }}
											>
												JPG
											</span>
										</div>
										<div className="flex flex-col min-w-0">
											<span
												className="mono text-xs font-semibold truncate"
												style={{ color: "var(--ink)" }}
											>
												IMG_4092_RAW.jpg
											</span>
											<span
												className="mono text-[11px]"
												style={{ color: "var(--accent)" }}
											>
												3.8 MB (-92.1%)
											</span>
										</div>
									</div>

									<Link
										href="/heic-to-jpg"
										className="shrink-0 mono text-xs px-2.5 py-1.5 rounded-[var(--radius-control)] font-semibold transition-colors"
										style={{
											backgroundColor: "var(--ink)",
											color: "var(--ground)",
											textDecoration: "none",
										}}
									>
										TRY LIVE ➔
									</Link>
								</div>
							</div>

							{/* Dropfield Area */}
							<div
								className="w-full min-h-36 rounded-[var(--radius)] border border-dashed border-rule p-[var(--gap-sm)] flex flex-col items-center justify-center text-center gap-2 bg-ground/50 transition-colors hover:border-rule-strong"
								style={{ position: "relative" }}
							>
								<p
									className="mono text-xs font-medium"
									style={{
										color: "var(--ink)",
										margin: 0,
										letterSpacing: "0.04em",
									}}
								>
									DRAG & DROP ANY FILE TO CONVERT IN YOUR BROWSER
								</p>
								<p
									className="mono text-[11px]"
									style={{ color: "var(--ink-muted)", margin: 0 }}
								>
									100% Client-Side. No files uploaded. Works completely offline.
								</p>

								{/* Format Quick Triggers */}
								<div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
									{QUICK_ACTIONS.map((action) => (
										<Link
											key={action.label}
											href={action.href}
											className="mono text-xs px-2 py-0.5 rounded-[var(--radius-control)] border border-rule bg-surface text-ink-muted hover:text-ink hover:border-ink transition-colors"
											style={{ textDecoration: "none" }}
										>
											{action.label}
										</Link>
									))}
								</div>
							</div>

							{/* Live System Diagnostics Grid */}
							<div
								className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-base)] pt-[var(--space-base)] border-t border-rule-subtle text-xs mono"
								style={{ position: "relative" }}
							>
								<div className="flex flex-col">
									<span style={{ color: "var(--ink-muted)" }}>WASM ENGINE</span>
									<span style={{ color: "var(--accent)" }}>READY (ACTIVE)</span>
								</div>
								<div className="flex flex-col">
									<span style={{ color: "var(--ink-muted)" }}>
										STARTUP TIME
									</span>
									<span style={{ color: "var(--ink)" }}>0.18ms</span>
								</div>
								<div className="flex flex-col">
									<span style={{ color: "var(--ink-muted)" }}>MEMORY HEAP</span>
									<span style={{ color: "var(--ink)" }}>64MB LOCAL RAM</span>
								</div>
								<div className="flex flex-col">
									<span style={{ color: "var(--ink-muted)" }}>
										OUTBOUND HOPS
									</span>
									<span style={{ color: "var(--accent)" }}>
										0 BYTES (AIR-GAPPED)
									</span>
								</div>
							</div>
						</div>
					</div>

					<div
						style={{ display: activeTab === "registry" ? "block" : "none" }}
						className="p-[var(--gap-md)] flex flex-col gap-[var(--gap-md)]"
					>
						<div className="flex items-center justify-between">
							<span
								className="meta"
								style={{ color: "var(--accent)", fontSize: "var(--mono-size)" }}
							>
								REGISTRY DISTRIBUTION {"//"} 273 CONVERSION TOOLS
							</span>
							<Link
								href="/tools"
								className="mono text-xs"
								style={{ color: "var(--ink)", textDecoration: "underline" }}
							>
								VIEW ALL 273 TOOLS ➔
							</Link>
						</div>
						<BarChart data={toolsByCategory()} />
						<ToolsDualMarquee />
					</div>
				</div>
			</div>
		</section>
	);
}
