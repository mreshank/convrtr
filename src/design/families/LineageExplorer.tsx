"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTool } from "@/core/registry";
import type { Tool } from "@/core/registry";
import {
	buildConversionGraph,
	canonicalExt,
	fitTransform,
	graphNeighbors,
	hitTestNode,
	layoutConversionGraph,
} from "@/core/registry/conversion-graph";
import { CardHeader } from "@/design/families/CardHeader";

type Props = {
	/** Input extensions worth exploring, richest lineage first. */
	sources: string[];
};

type Transform = { x: number; y: number; k: number };

const CANVAS_H = 440;
const MAX_NODES = 140;

/** Operation colors, resolved from design tokens at draw time. */
const KIND_TOKENS: Record<Tool["kind"], string> = {
	convert: "--accent",
	extract: "--ink",
	edit: "--ink-muted",
	compress: "--rule-strong",
	resize: "--rule-strong",
	inspect: "--ink-muted",
	generate: "--accent",
};

function token(name: string): string {
	if (typeof window === "undefined") return "";
	const value = window
		.getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return value;
}

function box(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
) {
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, 5);
	else ctx.rect(x, y, w, h);
}

/**
 * The graph chapter's instrument: the registry drawn as a walkable 2D
 * conversion graph on canvas. Formats and operations are both nodes --
 * convert, extract, edit, compress, resize and generate all appear -- so a
 * chain like JPEG to AVIF to PDF to ZIP reads as one continuous walk with
 * detours through real operations.
 *
 * Canvas, not SVG: a rich source fans out past a hundred nodes and edges,
 * and the DOM cost of that many elements hurts exactly the low-end devices
 * this product respects. Layout is precomputed (`layoutConversionGraph`),
 * drawing happens on demand (pan, zoom, select, resize -- never an idle
 * loop), and every color resolves from design tokens at draw time, so no
 * hex literal lives in this file. The canvas carries a text summary for
 * assistive technology; the details panel beside it is the fully operable,
 * fully readable equivalent -- every node reachable by button, every tool
 * linked to its page.
 */
export function LineageExplorer({ sources }: Props) {
	const [active, setActive] = useState(canonicalExt(sources[0] ?? "jpg"));
	const [hops, setHops] = useState(2);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [hoverId, setHoverId] = useState<string | null>(null);
	const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
	const [size, setSize] = useState({ w: 0, h: CANVAS_H });

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const pointersRef = useRef(new Map<number, { x: number; y: number }>());
	const gestureRef = useRef<{ sx: number; sy: number; moved: boolean } | null>(
		null,
	);
	const pinchRef = useRef<{ dist: number; mx: number; my: number } | null>(
		null,
	);

	const graph = useMemo(
		() => buildConversionGraph(active, hops, MAX_NODES),
		[active, hops],
	);
	const placed = useMemo(() => layoutConversionGraph(graph), [graph]);
	const byId = useMemo(() => new Map(placed.map((n) => [n.id, n])), [placed]);
	const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

	const formats = graph.nodes.filter((n) => n.type === "format").length;
	const operations = graph.nodes.filter((n) => n.type === "tool").length;
	const kindCounts = useMemo(() => {
		const counts = new Map<Tool["kind"], number>();
		for (const node of graph.nodes) {
			if (node.type === "tool" && node.kind) {
				counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
			}
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [graph]);

	// Re-center and fit whenever the graph itself changes.
	useEffect(() => {
		setSelectedId(null);
		setHoverId(null);
		setTransform(fitTransform(placed, size.w, size.h));
	}, [placed, size.w, size.h]);

	// Track the canvas box; drawing scales for devicePixelRatio.
	useEffect(() => {
		const wrap = wrapRef.current;
		const canvas = canvasRef.current;
		if (!wrap || !canvas || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver((entries) => {
			const rect = entries[0]?.contentRect;
			if (rect) setSize({ w: Math.max(0, rect.width), h: CANVAS_H });
		});
		observer.observe(wrap);
		return () => observer.disconnect();
	}, []);

	// The draw pass: edges, then nodes. Runs only when inputs change.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || size.w === 0) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const dpr =
			typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;
		canvas.width = Math.max(1, Math.round(size.w * dpr));
		canvas.height = Math.max(1, Math.round(size.h * dpr));
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, size.w, size.h);

		const ground = token("--ground");
		const surface = token("--surface");
		const rule = token("--rule");
		const ruleSubtle = token("--rule-subtle");
		const ruleStrong = token("--rule-strong");
		const ink = token("--ink");
		const inkMuted = token("--ink-muted");
		const accent = token("--accent");
		const kindColor = (kind: Tool["kind"]) => token(KIND_TOKENS[kind]);

		ctx.save();
		ctx.translate(transform.x, transform.y);
		ctx.scale(transform.k, transform.k);

		const selectedEdges = new Set<string>();
		if (selected) {
			for (const edge of graph.edges) {
				if (edge.from === selected.id || edge.to === selected.id) {
					selectedEdges.add(`${edge.from}>${edge.to}`);
				}
			}
		}

		for (const edge of graph.edges) {
			const from = byId.get(edge.from);
			const to = byId.get(edge.to);
			if (!from || !to) continue;
			const hot = selectedEdges.has(`${edge.from}>${edge.to}`);
			ctx.beginPath();
			ctx.moveTo(from.x + from.w, from.y + from.h / 2);
			ctx.lineTo(to.x, to.y + to.h / 2);
			ctx.strokeStyle = hot ? accent : rule;
			ctx.globalAlpha = hot ? 1 : edge.kind === "convert" ? 0.8 : 0.45;
			ctx.lineWidth = hot ? 1.5 : 1;
			ctx.stroke();
		}
		ctx.globalAlpha = 1;

		ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
		ctx.textBaseline = "middle";
		for (const node of placed) {
			const isSelected = node.id === selectedId;
			const isHover = node.id === hoverId;
			box(ctx, node.x, node.y, node.w, node.h);
			if (node.type === "format") {
				if (ground) ctx.fillStyle = ground;
				ctx.fill();
				ctx.strokeStyle = isSelected
					? accent
					: isHover
						? ruleStrong
						: rule;
				ctx.lineWidth = isSelected ? 1.5 : 1;
				ctx.stroke();
				if (ink) ctx.fillStyle = ink;
				ctx.textAlign = "center";
				ctx.fillText(node.label, node.x + node.w / 2, node.y + node.h / 2 + 0.5);
			} else {
				if (surface) ctx.fillStyle = surface;
				ctx.fill();
				ctx.strokeStyle = isSelected
					? accent
					: isHover
						? ruleStrong
						: ruleSubtle;
				ctx.lineWidth = isSelected ? 1.5 : 1;
				ctx.stroke();
				const dotColor = node.kind ? kindColor(node.kind) : rule;
				if (dotColor) ctx.fillStyle = dotColor;
				ctx.beginPath();
				ctx.arc(node.x + 12, node.y + node.h / 2, 3, 0, Math.PI * 2);
				ctx.fill();
				if (inkMuted) ctx.fillStyle = inkMuted;
				ctx.textAlign = "left";
				ctx.fillText(node.label, node.x + 20, node.y + node.h / 2 + 0.5);
			}
		}
		ctx.restore();
	}, [placed, byId, graph.edges, selectedId, selected, hoverId, transform, size]);

	const toWorld = (clientX: number, clientY: number) => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		return {
			x: (clientX - rect.left - transform.x) / transform.k,
			y: (clientY - rect.top - transform.y) / transform.k,
		};
	};

	// Wheel zoom needs a non-passive listener to prevent page scroll.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const rect = canvas.getBoundingClientRect();
			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;
			setTransform((t) => {
				const k = Math.min(
					2.5,
					Math.max(0.3, t.k * (e.deltaY < 0 ? 1.12 : 0.89)),
				);
				// Keep the world point under the cursor fixed.
				const wx = (cx - t.x) / t.k;
				const wy = (cy - t.y) / t.k;
				return { k, x: cx - wx * k, y: cy - wy * k };
			});
		};
		canvas.addEventListener("wheel", onWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", onWheel);
	}, []);

	const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (canvas && typeof canvas.setPointerCapture === "function") {
			try {
				canvas.setPointerCapture(e.pointerId);
			} catch {
				// Capture unavailable (test DOMs): dragging still works
				// while the pointer stays over the canvas.
			}
		}
		pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointersRef.current.size === 2) {
			const [a, b] = [...pointersRef.current.values()];
			if (a && b) {
				pinchRef.current = {
					dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
					mx: (a.x + b.x) / 2,
					my: (a.y + b.y) / 2,
				};
			}
			gestureRef.current = null;
		} else {
			gestureRef.current = { sx: e.clientX, sy: e.clientY, moved: false };
		}
	};

	const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const pointers = pointersRef.current;
		if (!pointers.has(e.pointerId)) {
			// Hover pass for a buttonless mouse; touch has no hover.
			if (e.pointerType === "mouse") {
				const point = toWorld(e.clientX, e.clientY);
				if (!point) return;
				const hit = hitTestNode(placed, point.x, point.y);
				setHoverId(hit?.id ?? null);
				if (canvasRef.current) {
					canvasRef.current.style.cursor = hit ? "pointer" : "grab";
				}
			}
			return;
		}
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const canvas = canvasRef.current;
			const pinch = pinchRef.current;
			if (!a || !b || !canvas || !pinch) return;
			const rect = canvas.getBoundingClientRect();
			const mx = (a.x + b.x) / 2;
			const my = (a.y + b.y) / 2;
			const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
			setTransform((t) => {
				const k = Math.min(2.5, Math.max(0.3, t.k * (dist / pinch.dist)));
				const wx = (mx - rect.left - t.x) / t.k;
				const wy = (my - rect.top - t.y) / t.k;
				return { k, x: mx - rect.left - wx * k + (mx - pinch.mx), y: my - rect.top - wy * k + (my - pinch.my) };
			});
			pinchRef.current = { dist, mx, my };
			return;
		}
		const gesture = gestureRef.current;
		if (!gesture) return;
		const dx = e.clientX - gesture.sx;
		const dy = e.clientY - gesture.sy;
		if (Math.abs(dx) + Math.abs(dy) > 4) {
			gesture.moved = true;
			gesture.sx = e.clientX;
			gesture.sy = e.clientY;
			setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
		}
	};

	const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const pointers = pointersRef.current;
		const wasSingle = pointers.size === 1 && pointers.has(e.pointerId);
		pointers.delete(e.pointerId);
		pinchRef.current = null;
		if (wasSingle) {
			const gesture = gestureRef.current;
			gestureRef.current = null;
			if (gesture && !gesture.moved) {
				const point = toWorld(e.clientX, e.clientY);
				if (!point) return;
				const hit = hitTestNode(placed, point.x, point.y);
				setSelectedId(hit?.id ?? null);
			}
		} else if (pointers.size === 1) {
			// Dropping from a pinch back to one finger restarts the drag
			// from the remaining fingertip instead of jumping.
			const remaining = [...pointers.values()][0];
			if (remaining) {
				gestureRef.current = {
					sx: remaining.x,
					sy: remaining.y,
					moved: false,
				};
			}
		}
	};

	const walkFrom = (ext: string) => {
		// Re-root the search: any format in the graph becomes explorable,
		// which is what makes the walk continuous instead of one hop deep.
		setActive(canonicalExt(ext));
	};

	const selectedTool = selected?.toolId ? getTool(selected.toolId) : undefined;
	const neighbors = selected ? graphNeighbors(graph, selected.id) : null;

	return (
		<div
			className="m3-surface-card flex w-full flex-col gap-[var(--gap-md)] p-[var(--gap-md)]"
			style={{ maxWidth: "var(--max-width)", margin: "0 auto" }}
		>
			<CardHeader
				eyebrow="LINEAGE GRAPH // LIVE REGISTRY CANVAS"
				title="Pick a format. Watch it branch."
			/>

			<div
				style={{
					display: "flex",
					gap: "calc(var(--space-base) / 2)",
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				<fieldset
					style={{
						display: "flex",
						gap: "calc(var(--space-base) / 2)",
						flexWrap: "wrap",
						border: "none",
						margin: 0,
						padding: 0,
					}}
				>
					<legend
						className="meta"
						style={{
							color: "var(--rule-strong)",
							fontSize: "var(--mono-size)",
							padding: 0,
							marginBottom: "calc(var(--space-base) / 2)",
						}}
					>
						SOURCE FORMAT
					</legend>
					{sources.map((source) => {
						const isSelected = source === active;
						return (
							<button
								key={source}
								type="button"
								onClick={() => setActive(source)}
								aria-pressed={isSelected}
								className={`m3-chip ${isSelected ? "m3-chip-active" : ""}`}
							>
								{source.toUpperCase()}
							</button>
						);
					})}
				</fieldset>
				<fieldset
					style={{
						display: "flex",
						gap: "calc(var(--space-base) / 2)",
						flexWrap: "wrap",
						border: "none",
						margin: 0,
						padding: 0,
					}}
				>
					<legend
						className="meta"
						style={{
							color: "var(--rule-strong)",
							fontSize: "var(--mono-size)",
							padding: 0,
							marginBottom: "calc(var(--space-base) / 2)",
						}}
					>
						WALK DEPTH
					</legend>
					{[1, 2, 3].map((depth) => (
						<button
							key={depth}
							type="button"
							onClick={() => setHops(depth)}
							aria-pressed={hops === depth}
							className={`m3-chip ${hops === depth ? "m3-chip-active" : ""}`}
						>
							{depth} {depth === 1 ? "HOP" : "HOPS"}
						</button>
					))}
				</fieldset>
			</div>

			<div
				ref={wrapRef}
				style={{
					position: "relative",
					width: "100%",
					height: `${CANVAS_H}px`,
					borderWidth: "var(--rule-width)",
					borderStyle: "solid",
					borderColor: "var(--rule)",
					backgroundColor: "var(--ground)",
					overflow: "hidden",
				}}
			>
				<canvas
					ref={canvasRef}
					role="img"
					aria-label={`Conversion graph for ${active.toUpperCase()}: ${formats} formats connected through ${operations} operations.`}
					style={{ display: "block", width: "100%", height: `${CANVAS_H}px` }}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={endPointer}
					onPointerCancel={endPointer}
					onPointerLeave={() => {
						setHoverId(null);
					}}
				/>
				<span
					className="mono"
					style={{
						position: "absolute",
						left: "var(--space-base)",
						bottom: "var(--space-base)",
						fontSize: "var(--mono-size)",
						color: "var(--rule-strong)",
						pointerEvents: "none",
					}}
				>
					DRAG TO PAN · SCROLL TO ZOOM · CLICK A NODE
				</span>
			</div>

			<div
				aria-hidden="true"
				style={{
					display: "flex",
					gap: "var(--gap-sm)",
					flexWrap: "wrap",
				}}
			>
				{kindCounts.map(([kind, count]) => (
					<span
						key={kind}
						className="mono"
						style={{ fontSize: "var(--mono-size)", color: "var(--ink-muted)" }}
					>
						<span style={{ color: `var(${KIND_TOKENS[kind]})` }}>●</span>{" "}
						{kind.toUpperCase()} · {count}
					</span>
				))}
			</div>

			<div
				style={{
					borderTopWidth: "var(--rule-width)",
					borderTopStyle: "solid",
					borderTopColor: "var(--rule)",
					paddingTop: "var(--space-base)",
					display: "flex",
					flexDirection: "column",
					gap: "calc(var(--space-base) / 2)",
				}}
			>
				{!selected && (
					<p
						style={{
							fontSize: "var(--mono-size)",
							color: "var(--ink-muted)",
							margin: 0,
						}}
					>
						{formats} FORMATS · {operations} OPERATIONS · {graph.edges.length}{" "}
						EDGES
						{graph.truncated
							? ` · SHOWING FIRST ${MAX_NODES} NODES — NARROW THE DEPTH TO SEE MORE`
							: ""}
						. CLICK ANY NODE TO INSPECT IT.
					</p>
				)}
				{selected && neighbors && (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "calc(var(--space-base) / 2)",
						}}
					>
						<div
							className="mono"
							style={{
								fontSize: "var(--mono-size)",
								color: "var(--ink)",
								display: "flex",
								gap: "var(--space-base)",
								flexWrap: "wrap",
								alignItems: "baseline",
							}}
						>
							<span>
								{selected.type === "format" ? "FORMAT" : "OPERATION"} ·{" "}
								{selected.label.toUpperCase()}
								{selected.kind ? ` · ${selected.kind.toUpperCase()}` : ""}
							</span>
							<button
								type="button"
								onClick={() => setSelectedId(null)}
								style={{
									background: "transparent",
									border: "none",
									color: "var(--ink-muted)",
									cursor: "pointer",
									fontFamily: "var(--font-mono)",
									fontSize: "var(--mono-size)",
								}}
							>
								[close]
							</button>
						</div>
						{selectedTool && (
							<div
								style={{
									display: "flex",
									gap: "var(--space-base)",
									flexWrap: "wrap",
									alignItems: "center",
								}}
							>
								<span
									className="mono"
									style={{
										fontSize: "var(--mono-size)",
										color: "var(--rule-strong)",
									}}
								>
									ENGINES: {selectedTool.engines.join(" + ")}
								</span>
								<Link
									href={`/${selectedTool.id}`}
									className="mono"
									style={{
										fontSize: "var(--mono-size)",
										color: "var(--accent)",
										textDecoration: "underline",
										textUnderlineOffset: "3px",
									}}
								>
									OPEN TOOL PAGE ➔
								</Link>
							</div>
						)}
						{neighbors.outgoing.length > 0 && (
							<div
								style={{
									display: "flex",
									gap: "calc(var(--space-base) / 2)",
									flexWrap: "wrap",
									alignItems: "center",
								}}
							>
								<span
									className="meta"
									style={{
										color: "var(--rule-strong)",
										fontSize: "var(--mono-size)",
									}}
								>
									LEADS TO
								</span>
								{neighbors.outgoing.slice(0, 12).map((node) => (
									<button
										key={node.id}
										type="button"
										onClick={() =>
											node.type === "format"
												? walkFrom(node.label)
												: setSelectedId(node.id)
										}
										className="m3-chip"
									>
										{node.type === "format" ? "Walk " : ""}
										{node.label.toUpperCase()} ➔
									</button>
								))}
							</div>
						)}
						{selected.type === "format" && (
							<div
								style={{
									display: "flex",
									gap: "calc(var(--space-base) / 2)",
									flexWrap: "wrap",
									alignItems: "center",
								}}
							>
								<span
									className="meta"
									style={{
										color: "var(--rule-strong)",
										fontSize: "var(--mono-size)",
									}}
								>
									KEEP WALKING
								</span>
								{[
									...new Map(
										neighbors.outgoing
											.flatMap(
												(tool) =>
													graphNeighbors(graph, tool.id).outgoing,
											)
											.filter(
												(format) =>
													format.type === "format" &&
													format.id !== selected.id,
											)
											.map((format) => [format.id, format] as const),
									).values(),
								]
									.slice(0, 12)
									.map((format) => (
										<button
											key={format.id}
											type="button"
											onClick={() => walkFrom(format.label)}
											className="m3-chip"
										>
											Walk {format.label.toUpperCase()} ➔
										</button>
									))}
							</div>
						)}
						{neighbors.incoming.length > 0 && (
							<div
								style={{
									display: "flex",
									gap: "calc(var(--space-base) / 2)",
									flexWrap: "wrap",
									alignItems: "center",
								}}
							>
								<span
									className="meta"
									style={{
										color: "var(--rule-strong)",
										fontSize: "var(--mono-size)",
									}}
								>
									ARRIVES FROM
								</span>
								{neighbors.incoming.slice(0, 12).map((node) => (
									<button
										key={node.id}
										type="button"
										onClick={() =>
											node.type === "format"
												? walkFrom(node.label)
												: setSelectedId(node.id)
										}
										className="m3-chip"
									>
										{node.label.toUpperCase()}
									</button>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
