"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { ErrorPanel } from "@/components/instrument/ErrorPanel";
import { HeavyDownloadGate } from "@/components/instrument/HeavyDownloadGate";
import {
	consumeStagedFiles,
	createOutputFile,
	outputFilename,
	readFile,
	type StagedConversion,
	saveOutput,
} from "@/core/io";
import { preflight } from "@/core/io/preflight";
import { type ZipEntry, zipOutputs } from "@/core/io/zip";
import { JobError, runJob } from "@/core/pipeline/client";
import { resolveConcurrency, runPool } from "@/core/pipeline/pool";
import type { ErrorCode } from "@/core/pipeline/protocol";
import { initialQuality, type QualityState } from "@/core/quality";
import {
	QUALITY_PRESETS,
	type QualityPreset,
	TOOLS,
	type Tool,
} from "@/core/registry";
import {
	detectFileExtension,
	findToolForConversion,
	getAllTargetFormats,
	getAvailableTargetFormatsForFile,
	getCommonTargetFormats,
} from "@/core/registry/converter-match";
import {
	formatBytes,
	formatDelta,
	formatDuration,
	formatPercent,
} from "@/lib/format";

const HEAVY_DOWNLOAD_KEY = "convrtr:heavy-download-allowed";

export type MasterItem = {
	id: string;
	file: File;
	ext: string;
	selected: boolean;
	targetExt: string;
	toolId?: string;
	tool?: Tool;
	status: "idle" | "queued" | "converting" | "done" | "error" | "cancelled";
	ratio: number;
	phase: string;
	output?: ArrayBuffer;
	outputSize?: number;
	outputName?: string;
	error?: { code: ErrorCode; message: string };
	lineage?: { parentName: string; step: number };
};

const ALL_ACCEPTS = {
	ext: Array.from(new Set(TOOLS.flatMap((t) => t.accept.ext))),
	mime: Array.from(new Set(TOOLS.flatMap((t) => t.accept.mime))),
};

const POPULAR_CATEGORIES = [
	{ label: "IMAGE", formats: ["PNG", "JPG", "WEBP", "AVIF", "HEIC", "SVG"] },
	{ label: "VIDEO", formats: ["MP4", "WEBM", "MOV", "AVI"] },
	{ label: "AUDIO", formats: ["MP3", "WAV", "FLAC", "AAC"] },
	{ label: "DOCS", formats: ["PDF"] },
];

export type FileCategory =
	| "all"
	| "image"
	| "video"
	| "audio"
	| "document"
	| "other";

function categorizeFile(ext: string): FileCategory {
	const e = ext.toLowerCase();
	if (
		[
			"png",
			"jpg",
			"jpeg",
			"webp",
			"avif",
			"heic",
			"svg",
			"gif",
			"jxl",
		].includes(e)
	)
		return "image";
	if (["mp4", "webm", "mov", "mkv", "avi"].includes(e)) return "video";
	if (["mp3", "wav", "flac", "aac", "opus", "m4a", "ogg"].includes(e))
		return "audio";
	if (["pdf"].includes(e)) return "document";
	return "other";
}

function CategoryGlyph({ category }: { category: FileCategory }) {
	switch (category) {
		case "image":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					style={{ color: "var(--accent)" }}
				>
					<rect x="3" y="3" width="18" height="18" rx="0" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<polyline points="21 15 16 10 5 21" />
				</svg>
			);
		case "video":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					style={{ color: "var(--accent)" }}
				>
					<rect x="2" y="2" width="20" height="20" rx="0" />
					<polygon points="10 8 16 12 10 16 10 8" />
				</svg>
			);
		case "audio":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					style={{ color: "var(--accent)" }}
				>
					<path d="M9 18V5l12-2v13" />
					<circle cx="6" cy="18" r="3" />
					<circle cx="18" cy="16" r="3" />
				</svg>
			);
		case "document":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					style={{ color: "var(--accent)" }}
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
				</svg>
			);
		default:
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					style={{ color: "var(--ink-muted)" }}
				>
					<polyline points="21 8 21 21 3 21 3 8" />
					<rect x="1" y="3" width="22" height="5" />
					<line x1="10" y1="12" x2="14" y2="12" />
				</svg>
			);
	}
}

/**
 * Encapsulated image micro-thumbnail with automatic URL cleanup
 */
function ImageMicroThumbnail({ file }: { file: File }) {
	const [thumbUrl, setThumbUrl] = useState<string | null>(null);

	useEffect(() => {
		const isImg =
			file.type.startsWith("image/") ||
			["png", "jpg", "jpeg", "webp", "avif", "gif", "svg"].some((e) =>
				file.name.toLowerCase().endsWith(`.${e}`),
			);
		if (!isImg) return;

		let url = "";
		try {
			url = URL.createObjectURL(file);
			setThumbUrl(url);
		} catch {
			// URL creation failed (e.g. invalid file buffer)
		}

		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	}, [file]);

	if (!thumbUrl) return null;

	return (
		// biome-ignore lint/performance/noImgElement: client-side blob object URL
		<img
			src={thumbUrl}
			alt=""
			className="h-5 w-5 object-cover shrink-0 border"
			style={{
				borderColor: "var(--rule)",
				borderRadius: "var(--radius)",
			}}
		/>
	);
}

/**
 * Preview modal for inspecting converted image output
 */
function ImagePreviewModal({
	item,
	onClose,
	onSave,
}: {
	item: MasterItem;
	onClose: () => void;
	onSave: () => void;
}) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!item.output || !item.tool) return;
		let url = "";
		try {
			const blob = new Blob([item.output], { type: item.tool.output.mime });
			url = URL.createObjectURL(blob);
			setPreviewUrl(url);
		} catch {
			// fallback
		}

		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	}, [item]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={`Preview converted ${item.file.name}`}
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
		>
			<div
				className="flex flex-col gap-4 border p-6 max-w-xl w-full"
				style={{
					background: "var(--ground)",
					borderColor: "var(--rule-strong)",
					borderRadius: "var(--radius)",
				}}
			>
				<div
					className="flex items-center justify-between border-b pb-3"
					style={{ borderColor: "var(--rule)" }}
				>
					<div className="flex items-center gap-2">
						<span
							className="mono text-[11px] font-medium"
							style={{ color: "var(--accent)" }}
						>
							[ OUTPUT PREVIEW ]
						</span>
						<span className="mono text-[12px] truncate max-w-xs">
							{item.file.name}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="mono text-[14px]"
						style={{ color: "var(--ink-muted)", cursor: "pointer" }}
					>
						✕
					</button>
				</div>

				{/* Preview Image Container */}
				<div
					className="flex items-center justify-center border p-4 max-h-80 overflow-hidden"
					style={{
						borderColor: "var(--rule)",
						background: "var(--surface)",
						borderRadius: "var(--radius)",
					}}
				>
					{previewUrl ? (
						// biome-ignore lint/performance/noImgElement: client-side blob object URL
						<img
							src={previewUrl}
							alt={`Converted output of ${item.file.name}`}
							className="max-h-72 object-contain"
						/>
					) : (
						<span
							className="mono text-[12px]"
							style={{ color: "var(--ink-muted)" }}
						>
							Preview not available for this binary format
						</span>
					)}
				</div>

				{/* Metrics readout */}
				<div
					className="flex flex-wrap items-center justify-between gap-2 border px-3 py-2"
					style={{
						borderColor: "var(--rule)",
						borderRadius: "var(--radius)",
						background: "var(--surface)",
					}}
				>
					<span
						className="mono text-[11px]"
						style={{ color: "var(--ink-muted)" }}
					>
						ORIGINAL: {formatBytes(item.file.size)} ({item.ext.toUpperCase()})
					</span>
					<span className="mono text-[11px]" style={{ color: "var(--accent)" }}>
						OUTPUT: {item.outputSize ? formatBytes(item.outputSize) : "—"} (
						{item.targetExt.toUpperCase()})
					</span>
					{item.outputSize && (
						<span
							className="mono text-[11px] font-medium px-1.5 py-0.5"
							style={{
								background: "var(--accent)",
								color: "var(--ground)",
								borderRadius: "var(--radius-pill)",
							}}
						>
							SAVED {formatDelta(item.file.size, item.outputSize)}
						</span>
					)}
				</div>

				{/* Action buttons */}
				<div className="flex items-center justify-end gap-3 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="mono border px-3 py-1.5 text-[12px]"
						style={{
							borderColor: "var(--rule-strong)",
							color: "var(--ink-muted)",
							borderRadius: "var(--radius-pill)",
							background: "transparent",
							cursor: "pointer",
						}}
					>
						CLOSE
					</button>
					<button
						type="button"
						onClick={() => {
							onSave();
							onClose();
						}}
						className="mono border px-4 py-1.5 text-[12px] font-medium"
						style={{
							borderColor: "var(--accent)",
							background: "var(--accent)",
							color: "var(--ground)",
							borderRadius: "var(--radius-pill)",
							cursor: "pointer",
						}}
					>
						DOWNLOAD FILE
					</button>
				</div>
			</div>
		</div>
	);
}

const cellStyle = {
	borderColor: "var(--rule)",
} as const;

export type ConfiguredPreset = {
	from: string;
	to: string;
};

export function MasterConverterClient({
	initialFrom,
	initialTo,
}: {
	initialFrom?: string;
	initialTo?: string;
} = {}) {
	const fileInputId = useId();
	const addMoreInputId = useId();
	const secondaryDropInputId = useId();
	const [items, setItems] = useState<MasterItem[]>([]);
	const [configuredPreset, setConfiguredPreset] =
		useState<ConfiguredPreset | null>(() => {
			const f = (initialFrom ?? "").trim().toUpperCase();
			const t = (initialTo ?? "").trim().toUpperCase();
			if (f && t) return { from: f, to: t };
			return null;
		});
	const [globalTarget, setGlobalTarget] = useState<string>(() => {
		if (initialTo) return initialTo.trim().toLowerCase();
		return "";
	});
	const [qualityPreset, setQualityPreset] = useState<QualityPreset>("balanced");
	const [isConverting, setIsConverting] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [dropActive, setDropActive] = useState(false);
	const [showHeavyGate, setShowHeavyGate] = useState(false);
	const [heavyTool, setHeavyTool] = useState<Tool | null>(null);
	const [topError, setTopError] = useState<{
		code: ErrorCode;
		detail: string;
	} | null>(null);

	// Table search, category filtering and sorting state
	const [tableSearch, setTableSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "ready" | "done" | "error"
	>("all");
	const [categoryFilter, setCategoryFilter] = useState<FileCategory>("all");
	const [sortColumn, setSortColumn] = useState<
		"name" | "size" | "status" | "default"
	>("default");
	const [sortAsc, setSortAsc] = useState(true);

	// Preview modal state
	const [activePreviewItem, setActivePreviewItem] = useState<MasterItem | null>(
		null,
	);

	// Copy report state
	const [copiedReport, setCopiedReport] = useState(false);

	// Chained conversion notice banner
	const [chainedNotice, setChainedNotice] = useState<string | null>(null);

	const controllerRef = useRef<AbortController | null>(null);
	const startedAtRef = useRef<number>(0);
	const addMoreInputRef = useRef<HTMLInputElement>(null);

	// Read URL query parameters on mount
	useEffect(() => {
		if (typeof window !== "undefined") {
			const sp = new URLSearchParams(window.location.search);
			const f = (sp.get("from") ?? "").trim().toUpperCase();
			const t = (sp.get("to") ?? "").trim().toUpperCase();
			if (f && t) {
				setConfiguredPreset({ from: f, to: t });
				setGlobalTarget(t.toLowerCase());
			} else if (t) {
				setGlobalTarget(t.toLowerCase());
			}
		}
	}, []);

	const canReverse = useMemo(() => {
		if (!configuredPreset) return false;
		const rev = findToolForConversion(
			configuredPreset.to,
			configuredPreset.from,
		);
		return !!rev;
	}, [configuredPreset]);

	const handleSwapPreset = () => {
		if (!configuredPreset) return;
		const swapped = { from: configuredPreset.to, to: configuredPreset.from };
		setConfiguredPreset(swapped);
		setGlobalTarget(swapped.to.toLowerCase());
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.set("from", swapped.from.toLowerCase());
			url.searchParams.set("to", swapped.to.toLowerCase());
			window.history.replaceState({}, "", url.toString());
		}
		setItems((prev) =>
			prev.map((item) => {
				if (item.status === "idle" && item.ext.toUpperCase() === swapped.from) {
					const tool = findToolForConversion(
						item.ext,
						swapped.to.toLowerCase(),
					);
					return {
						...item,
						targetExt: swapped.to.toLowerCase(),
						toolId: tool?.id,
						tool,
					};
				}
				return item;
			}),
		);
	};

	const handleResetPreset = () => {
		setConfiguredPreset(null);
		setGlobalTarget("");
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("from");
			url.searchParams.delete("to");
			window.history.replaceState({}, "", url.pathname);
		}
	};

	// Track elapsed time during conversion
	useEffect(() => {
		if (!isConverting) return;
		const timer = window.setInterval(() => {
			setElapsedSeconds((Date.now() - startedAtRef.current) / 1000);
		}, 100);
		return () => window.clearInterval(timer);
	}, [isConverting]);

	// Ingest dropped or picked files
	const handleFiles = (newFiles: (File | StagedConversion)[]) => {
		if (newFiles.length === 0) return;

		const files = newFiles.map((item) =>
			item instanceof File ? item : item.file,
		);
		const largest = files.reduce(
			(worst, candidate) => (candidate.size > worst.size ? candidate : worst),
			files[0] ?? new File([], ""),
		);
		const verdict = preflight(largest.size);
		if (!verdict.ok) {
			setTopError({
				code: "OUT_OF_MEMORY",
				detail: `${verdict.reason} ${verdict.suggestion}`,
			});
			return;
		}

		setTopError(null);

		const createdItems: MasterItem[] = newFiles.map((item, index) => {
			const file = item instanceof File ? item : item.file;
			const stagedTarget = !(item instanceof File) ? item.targetExt : undefined;
			const parentName = !(item instanceof File) ? item.parentName : undefined;
			const step = !(item instanceof File) ? item.step : undefined;
			const ext = detectFileExtension(file);
			const availableTargets = getAvailableTargetFormatsForFile(file);

			// Choose default target: use stagedTarget if valid, else preset if file matches, else globalTarget, else first available
			let defaultTarget = "";
			if (
				stagedTarget &&
				availableTargets.some((t) => t.ext === stagedTarget)
			) {
				defaultTarget = stagedTarget;
			} else if (
				configuredPreset &&
				ext.toUpperCase() === configuredPreset.from &&
				availableTargets.some(
					(t) => t.ext.toUpperCase() === configuredPreset.to,
				)
			) {
				defaultTarget = configuredPreset.to.toLowerCase();
			} else if (
				globalTarget &&
				availableTargets.some((t) => t.ext === globalTarget)
			) {
				defaultTarget = globalTarget;
			} else if (availableTargets.length > 0) {
				defaultTarget = availableTargets[0]?.ext ?? "";
			}

			const tool = defaultTarget
				? findToolForConversion(ext, defaultTarget)
				: undefined;

			return {
				id: `${file.name}-${file.size}-${Date.now()}-${index}`,
				file,
				ext,
				selected: true,
				targetExt: defaultTarget,
				toolId: tool?.id,
				tool,
				status: "idle",
				ratio: 0,
				phase: "",
				lineage: parentName ? { parentName, step: step ?? 2 } : undefined,
			};
		});

		setItems((prev) => {
			const merged = [...prev, ...createdItems];
			// If all newly added files share a common target and no global target is set, initialize it
			const common = getCommonTargetFormats(merged.map((m) => m.file));
			if (!globalTarget && common.length > 0) {
				const chosen = configuredPreset?.to.toLowerCase() ?? common[0];
				if (chosen) setGlobalTarget(chosen);
			}
			return merged;
		});
	};

	// Ingest any staged files waiting from another converter session
	// biome-ignore lint/correctness/useExhaustiveDependencies: Ingest staged files once on mount
	useEffect(() => {
		const staged = consumeStagedFiles();
		if (staged.length > 0) {
			handleFiles(staged);
		}
	}, []);

	const selectedItems = items.filter((item) => item.selected);
	const selectedCount = selectedItems.length;
	const totalCount = items.length;
	const selectedBytes = selectedItems.reduce(
		(sum, item) => sum + item.file.size,
		0,
	);

	// Compute shared and all target formats across selected items
	const selectedFiles = selectedItems.map((item) => item.file);
	const commonTargets = getCommonTargetFormats(selectedFiles);
	const allAvailableTargets = getAllTargetFormats(selectedFiles);

	// Detected format breakdown (e.g. PNG: 3, PDF: 1)
	const formatBreakdown = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const item of items) {
			const tag = item.ext.toUpperCase() || "UNKNOWN";
			counts[tag] = (counts[tag] ?? 0) + 1;
		}
		return Object.entries(counts).sort((a, b) => b[1] - a[1]);
	}, [items]);

	// Detected available categories in current queue
	const availableCategories = useMemo(() => {
		const set = new Set<FileCategory>();
		for (const item of items) {
			set.add(categorizeFile(item.ext));
		}
		return Array.from(set);
	}, [items]);

	// Apply a global target format across all compatible selected items
	const applyGlobalTarget = (target: string) => {
		setGlobalTarget(target);
		setItems((prev) =>
			prev.map((item) => {
				if (!item.selected) return item;
				const available = getAvailableTargetFormatsForFile(item.file);
				const isCompatible = available.some((t) => t.ext === target);
				if (!isCompatible) return item;

				const tool = findToolForConversion(item.ext, target);
				return {
					...item,
					targetExt: target,
					toolId: tool?.id,
					tool,
				};
			}),
		);
	};

	// Toggle individual item selection
	const toggleItemSelection = (id: string) => {
		setItems((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, selected: !item.selected } : item,
			),
		);
	};

	// Select / Deselect all
	const setAllSelection = (selected: boolean) => {
		setItems((prev) => prev.map((item) => ({ ...item, selected })));
	};

	const invertSelection = () => {
		setItems((prev) =>
			prev.map((item) => ({ ...item, selected: !item.selected })),
		);
	};

	const removeUnselected = () => {
		setItems((prev) => prev.filter((item) => item.selected));
	};

	const pruneCompleted = () => {
		setItems((prev) => prev.filter((item) => item.status !== "done"));
	};

	const removeItem = (id: string) => {
		setItems((prev) => prev.filter((item) => item.id !== id));
	};

	const clearAll = () => {
		if (isConverting && controllerRef.current) {
			controllerRef.current.abort();
		}
		setItems([]);
		setTopError(null);
		setIsConverting(false);
	};

	// Change target for a single item
	const changeItemTarget = (id: string, targetExt: string) => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== id) return item;
				const tool = findToolForConversion(item.ext, targetExt);
				return {
					...item,
					targetExt,
					toolId: tool?.id,
					tool,
				};
			}),
		);
	};

	// Download individual item output
	const handleSaveRow = async (item: MasterItem) => {
		if (!item.output || !item.tool) return;
		const filename = outputFilename(item.file.name, item.tool.output.ext);
		await saveOutput(item.output, filename, item.tool.output.mime);
	};

	// Download all completed items as ZIP
	const handleDownloadAllZip = async () => {
		const doneItems = items.filter(
			(item) => item.status === "done" && item.output,
		);
		if (doneItems.length === 0) return;

		const entries: ZipEntry[] = doneItems.map((item) => {
			const ext = item.tool?.output.ext ?? item.targetExt;
			return {
				name: outputFilename(item.file.name, ext),
				data: item.output as ArrayBuffer,
			};
		});

		const zipBlob = await zipOutputs(entries);
		const arrayBuffer = await zipBlob.arrayBuffer();
		await saveOutput(arrayBuffer, "convrtr-converted.zip", "application/zip");
	};

	// Continue a single completed item's output into the queue for next conversion
	const handleContinueRow = (item: MasterItem, targetExt?: string) => {
		if (!item.output) return;
		const ext = item.tool?.output.ext ?? item.targetExt;
		const filename = item.outputName ?? outputFilename(item.file.name, ext);
		const mime = item.tool?.output.mime ?? "application/octet-stream";
		const nextFile = createOutputFile(item.output, filename, mime);

		// Unselect the finished item so only the new item will be queued
		setItems((prev) =>
			prev.map((m) => (m.id === item.id ? { ...m, selected: false } : m)),
		);

		const step = (item.lineage?.step ?? 1) + 1;
		handleFiles([
			{
				file: nextFile,
				targetExt,
				parentName: item.file.name,
				step,
			},
		]);
		setChainedNotice(
			targetExt
				? `Loaded "${filename}" targeting → ${targetExt.toUpperCase()} (Step ${step}).`
				: `Loaded "${filename}" for next conversion (Step ${step}).`,
		);
	};

	// Continue selected (or all) completed outputs into the queue
	const handleContinueOutputs = (
		targetItems?: MasterItem[],
		targetExt?: string,
	) => {
		const done = items.filter((item) => item.status === "done" && item.output);
		const selectedDone = items.filter(
			(item) => item.selected && item.status === "done" && item.output,
		);
		const toContinue =
			targetItems ?? (selectedDone.length > 0 ? selectedDone : done);
		if (toContinue.length === 0) return;

		const nextStaged: StagedConversion[] = [];
		const continueIds = new Set(toContinue.map((m) => m.id));

		for (const item of toContinue) {
			if (!item.output) continue;
			const ext = item.tool?.output.ext ?? item.targetExt;
			const filename = item.outputName ?? outputFilename(item.file.name, ext);
			const mime = item.tool?.output.mime ?? "application/octet-stream";
			const nextFile = createOutputFile(item.output, filename, mime);
			const step = (item.lineage?.step ?? 1) + 1;
			nextStaged.push({
				file: nextFile,
				targetExt,
				parentName: item.file.name,
				step,
			});
		}

		if (nextStaged.length === 0) return;

		// Unselect continued items
		setItems((prev) =>
			prev.map((m) => (continueIds.has(m.id) ? { ...m, selected: false } : m)),
		);

		handleFiles(nextStaged);
		setChainedNotice(
			`Loaded ${nextStaged.length} output file${nextStaged.length === 1 ? "" : "s"} for next conversion.`,
		);
	};

	// Initiate conversion
	const startConversion = async () => {
		const toConvert = items.filter(
			(item) => item.selected && item.targetExt && item.tool,
		);
		if (toConvert.length === 0) return;

		// Heavy download check
		const heavy = toConvert.find(
			(item) => item.tool?.heavyDownloadMb && item.tool.heavyDownloadMb > 0,
		);
		if (heavy?.tool) {
			try {
				if (localStorage.getItem(HEAVY_DOWNLOAD_KEY) !== "yes") {
					setHeavyTool(heavy.tool);
					setShowHeavyGate(true);
					return;
				}
			} catch {
				// Storage unreadable, show gate
				setHeavyTool(heavy.tool);
				setShowHeavyGate(true);
				return;
			}
		}

		runConversionBatch(toConvert);
	};

	const acceptHeavyDownload = () => {
		try {
			localStorage.setItem(HEAVY_DOWNLOAD_KEY, "yes");
		} catch {
			// Storage error, proceed regardless
		}
		setShowHeavyGate(false);
		setHeavyTool(null);
		const toConvert = items.filter(
			(item) => item.selected && item.targetExt && item.tool,
		);
		runConversionBatch(toConvert);
	};

	const retryItem = (id: string) => {
		const item = items.find((i) => i.id === id);
		if (!item?.tool) return;
		runConversionBatch([item]);
	};

	const retryAllFailed = () => {
		const failed = items.filter((i) => i.status === "error" && i.tool);
		if (failed.length === 0) return;
		runConversionBatch(failed);
	};

	const runConversionBatch = async (toConvert: MasterItem[]) => {
		const controller = new AbortController();
		controllerRef.current = controller;
		startedAtRef.current = Date.now();
		setIsConverting(true);
		setTopError(null);

		// Initialize selected items as queued
		setItems((prev) =>
			prev.map((item) => {
				if (toConvert.some((t) => t.id === item.id)) {
					return {
						...item,
						status: "queued",
						ratio: 0,
						phase: "QUEUED",
						error: undefined,
					};
				}
				return item;
			}),
		);

		const concurrency = resolveConcurrency(
			typeof navigator !== "undefined"
				? navigator.hardwareConcurrency
				: undefined,
		);

		const tasks = toConvert.map((item) => async () => {
			if (controller.signal.aborted) {
				setItems((prev) =>
					prev.map((m) =>
						m.id === item.id ? { ...m, status: "cancelled" } : m,
					),
				);
				return;
			}

			const tool = item.tool ?? findToolForConversion(item.ext, item.targetExt);
			if (!tool) {
				setItems((prev) =>
					prev.map((m) =>
						m.id === item.id
							? {
									...m,
									status: "error",
									error: {
										code: "UNSUPPORTED_INPUT",
										message: "No conversion path found",
									},
								}
							: m,
					),
				);
				return;
			}

			// Update status to converting
			setItems((prev) =>
				prev.map((m) =>
					m.id === item.id
						? { ...m, status: "converting", ratio: 0, phase: "STARTING" }
						: m,
				),
			);

			try {
				const input = await readFile(item.file);
				const qualityState: QualityState = initialQuality(tool);
				// Override with chosen quality preset params if available
				const preset = tool.quality.presets.find((p) => p.id === qualityPreset);
				const params = preset
					? { ...preset.params }
					: { ...qualityState.params };

				const output = await runJob(
					{
						id: item.id,
						engines: tool.engines,
						params,
						input,
					},
					(event) => {
						if (event.type === "progress") {
							setItems((prev) =>
								prev.map((m) =>
									m.id === item.id
										? { ...m, ratio: event.ratio, phase: event.phase }
										: m,
								),
							);
						}
					},
					controller.signal,
				);

				setItems((prev) =>
					prev.map((m) =>
						m.id === item.id
							? {
									...m,
									status: "done",
									ratio: 1,
									phase: "DONE",
									output,
									outputSize: output.byteLength,
									outputName: outputFilename(m.file.name, tool.output.ext),
								}
							: m,
					),
				);
			} catch (err) {
				if (controller.signal.aborted) {
					setItems((prev) =>
						prev.map((m) =>
							m.id === item.id ? { ...m, status: "cancelled" } : m,
						),
					);
					return;
				}

				const code: ErrorCode =
					err instanceof JobError ? err.code : "ENGINE_FAILURE";
				const message =
					err instanceof Error ? err.message : "Conversion processing failed";

				setItems((prev) =>
					prev.map((m) =>
						m.id === item.id
							? {
									...m,
									status: "error",
									error: { code, message },
								}
							: m,
					),
				);
			}
		});

		await runPool(tasks, concurrency);
		setIsConverting(false);
	};

	const cancelConversion = () => {
		if (controllerRef.current) {
			controllerRef.current.abort();
		}
		setIsConverting(false);
	};

	const doneCount = items.filter((item) => item.status === "done").length;
	const errorCount = items.filter((item) => item.status === "error").length;
	const readyCount = items.filter(
		(item) => item.status === "idle" || item.status === "queued",
	).length;
	const doneItems = items.filter(
		(item) => item.status === "done" && item.output,
	);
	const selectedDoneItems = items.filter(
		(item) => item.selected && item.status === "done" && item.output,
	);

	const chainedItems = items.filter((item) => item.lineage !== undefined);
	const chainedCount = chainedItems.length;
	const maxChainStep = items.reduce(
		(max, item) => Math.max(max, item.lineage?.step ?? 1),
		1,
	);

	// Keyboard shortcuts: Cmd+Enter (Convert), Shift+Cmd+C (Continue Outputs), Shift+Cmd+S (Download ZIP)
	// biome-ignore lint/correctness/useExhaustiveDependencies: Handlers are invoked via keyboard shortcut based on isConverting/selectedCount/doneCount
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT")
			) {
				return;
			}

			const isMod = e.metaKey || e.ctrlKey;
			if (isMod && !e.shiftKey && e.key === "Enter") {
				e.preventDefault();
				if (!isConverting && selectedCount > 0) {
					void startConversion();
				}
			} else if (isMod && e.shiftKey && (e.key === "C" || e.key === "c")) {
				e.preventDefault();
				if (doneCount > 0) {
					handleContinueOutputs();
				}
			} else if (isMod && e.shiftKey && (e.key === "S" || e.key === "s")) {
				e.preventDefault();
				if (doneCount > 0) {
					void handleDownloadAllZip();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isConverting, selectedCount, doneCount]);

	// Compute overall conversion progress percentage across active batch
	const activeConvertingItems = items.filter(
		(item) =>
			item.status === "converting" ||
			item.status === "queued" ||
			item.status === "done",
	);
	const overallProgressRatio =
		activeConvertingItems.length > 0
			? activeConvertingItems.reduce(
					(acc, item) => acc + (item.status === "done" ? 1 : item.ratio),
					0,
				) / activeConvertingItems.length
			: 0;

	// Total saved bytes calculation across completed items
	const doneItemsWithOutput = items.filter(
		(item) => item.status === "done" && item.outputSize !== undefined,
	);
	const totalInputBytes = doneItemsWithOutput.reduce(
		(acc, item) => acc + item.file.size,
		0,
	);
	const totalOutputBytes = doneItemsWithOutput.reduce(
		(acc, item) => acc + (item.outputSize ?? 0),
		0,
	);
	const hasSavings =
		doneItemsWithOutput.length > 0 && totalInputBytes > totalOutputBytes;

	// Copy summary report to clipboard
	const copySummaryReport = async () => {
		const lines = [
			"CONVRTR STUDIO BATCH REPORT",
			"===========================",
			`Total Files: ${items.length}`,
			`Completed: ${doneCount}`,
			`Failed: ${errorCount}`,
			`Input Volume: ${formatBytes(totalInputBytes)}`,
			`Output Volume: ${formatBytes(totalOutputBytes)}`,
			hasSavings
				? `Total Saved: ${formatDelta(totalInputBytes, totalOutputBytes)}`
				: "",
			"",
			"Files:",
			...doneItemsWithOutput.map(
				(item) =>
					`• ${item.file.name} (${item.ext.toUpperCase()}) → ${item.targetExt.toUpperCase()}: ${formatBytes(item.file.size)} → ${formatBytes(item.outputSize ?? 0)}`,
			),
		]
			.filter(Boolean)
			.join("\n");

		try {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(lines);
				setCopiedReport(true);
				setTimeout(() => setCopiedReport(false), 2000);
			}
		} catch {
			// Clipboard API write fallback
		}
	};

	// Displayed items considering search filter, category filter, and sorting
	const displayedItems = useMemo(() => {
		let result = items;

		// Filter by search query
		if (tableSearch.trim()) {
			const q = tableSearch.trim().toLowerCase();
			result = result.filter(
				(item) =>
					item.file.name.toLowerCase().includes(q) ||
					item.ext.toLowerCase().includes(q) ||
					item.targetExt.toLowerCase().includes(q),
			);
		}

		// Filter by status tab
		if (statusFilter === "ready") {
			result = result.filter(
				(item) =>
					item.status === "idle" ||
					item.status === "queued" ||
					item.status === "converting",
			);
		} else if (statusFilter === "done") {
			result = result.filter((item) => item.status === "done");
		} else if (statusFilter === "error") {
			result = result.filter((item) => item.status === "error");
		}

		// Filter by category
		if (categoryFilter !== "all") {
			result = result.filter(
				(item) => categorizeFile(item.ext) === categoryFilter,
			);
		}

		// Sort
		if (sortColumn === "name") {
			result = result.slice().sort((a, b) => {
				const cmp = a.file.name.localeCompare(b.file.name);
				return sortAsc ? cmp : -cmp;
			});
		} else if (sortColumn === "size") {
			result = result.slice().sort((a, b) => {
				const cmp = a.file.size - b.file.size;
				return sortAsc ? cmp : -cmp;
			});
		} else if (sortColumn === "status") {
			result = result.slice().sort((a, b) => {
				const cmp = a.status.localeCompare(b.status);
				return sortAsc ? cmp : -cmp;
			});
		}

		return result;
	}, [items, tableSearch, statusFilter, categoryFilter, sortColumn, sortAsc]);

	const toggleSort = (col: "name" | "size" | "status") => {
		if (sortColumn === col) {
			if (!sortAsc) {
				setSortColumn("default");
				setSortAsc(true);
			} else {
				setSortAsc(false);
			}
		} else {
			setSortColumn(col);
			setSortAsc(true);
		}
	};

	const detectedHardwareCores =
		typeof navigator !== "undefined" && navigator.hardwareConcurrency
			? navigator.hardwareConcurrency
			: 4;

	return (
		<div className="flex flex-col gap-6" data-testid="master-converter">
			{/* Preview Modal */}
			{activePreviewItem && (
				<ImagePreviewModal
					item={activePreviewItem}
					onClose={() => setActivePreviewItem(null)}
					onSave={() => handleSaveRow(activePreviewItem)}
				/>
			)}

			{/* Top Error Alert */}
			{topError && <ErrorPanel code={topError.code} detail={topError.detail} />}

			{/* Configured Instant Preset Banner */}
			{configuredPreset && (
				<section
					data-testid="configured-preset-banner"
					className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border p-4 transition-all"
					style={{
						borderColor: "var(--accent)",
						borderRadius: "var(--radius)",
						background: "var(--surface)",
					}}
				>
					<div className="flex items-center gap-3">
						<div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
							<span
								className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
								style={{ background: "var(--accent)" }}
							/>
							<span
								className="relative inline-flex h-2 w-2 rounded-full"
								style={{ background: "var(--accent)" }}
							/>
						</div>

						<div className="flex flex-col gap-1">
							<div className="flex flex-wrap items-center gap-2">
								<span
									className="mono text-[10px] tracking-[0.08em]"
									style={{ color: "var(--accent)" }}
								>
									[ INSTANT STUDIO CONFIGURATION ]
								</span>
								<div
									className="mono inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] font-semibold"
									style={{
										background: "var(--ground)",
										border: "1px solid var(--rule-strong)",
										borderRadius: "var(--radius)",
										color: "var(--ink)",
									}}
								>
									<span>{configuredPreset.from}</span>
									<span style={{ color: "var(--accent)" }}>➔</span>
									<span>{configuredPreset.to}</span>
								</div>
							</div>
							<p
								className="text-[12px] m-0"
								style={{ color: "var(--ink-muted)" }}
							>
								Preset active from individual converter. Dropped files matching{" "}
								<strong className="text-[var(--ink)] font-semibold">
									{configuredPreset.from}
								</strong>{" "}
								will automatically default to{" "}
								<strong className="text-[var(--accent)] font-semibold">
									{configuredPreset.to}
								</strong>
								.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 self-end md:self-center shrink-0">
						{canReverse && (
							<button
								type="button"
								onClick={handleSwapPreset}
								className="mono inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] transition-colors hover:border-[var(--ink)]"
								style={{
									borderColor: "var(--rule)",
									borderRadius: "var(--radius)",
									background: "var(--ground)",
									color: "var(--ink)",
									cursor: "pointer",
								}}
								title={`Swap conversion to ${configuredPreset.to} → ${configuredPreset.from}`}
							>
								<span>⇄</span>
								<span>
									REVERSE ({configuredPreset.to} → {configuredPreset.from})
								</span>
							</button>
						)}
						<button
							type="button"
							onClick={handleResetPreset}
							className="mono inline-flex items-center gap-1 border px-2.5 py-1 text-[11px] transition-colors hover:border-[var(--ink)]"
							style={{
								borderColor: "var(--rule)",
								borderRadius: "var(--radius)",
								background: "transparent",
								color: "var(--ink-muted)",
								cursor: "pointer",
							}}
						>
							<span>✕</span>
							<span>RESET TO UNIVERSAL</span>
						</button>
					</div>
				</section>
			)}

			{/* Heavy Download Gate */}
			{showHeavyGate && heavyTool && (
				<HeavyDownloadGate
					megabytes={heavyTool.heavyDownloadMb ?? 31}
					formatLabel={heavyTool.accept.ext.join(", ").toUpperCase()}
					onAccept={acceptHeavyDownload}
				/>
			)}

			{/* Empty State / Initial Drop Zone with Blueprint Aesthetics */}
			{items.length === 0 && (
				// biome-ignore lint/a11y/useSemanticElements: drop zone needs drag-and-drop handlers and a nested file input, which a native <button> can't host.
				<div
					data-testid="drop-field"
					data-active={dropActive}
					role="button"
					tabIndex={0}
					onDragOver={(e) => {
						e.preventDefault();
						setDropActive(true);
					}}
					onDragLeave={() => setDropActive(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDropActive(false);
						if (e.dataTransfer.files) {
							handleFiles(Array.from(e.dataTransfer.files));
						}
					}}
					onClick={() => {
						document.getElementById(fileInputId)?.click();
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							document.getElementById(fileInputId)?.click();
						}
					}}
					className="mono relative flex flex-col items-center gap-4 border border-dashed p-12 text-center transition-all"
					style={{
						borderColor: dropActive ? "var(--accent)" : "var(--rule-strong)",
						background: dropActive ? "var(--surface)" : "transparent",
						borderRadius: "var(--radius)",
						cursor: "pointer",
					}}
				>
					{/* Blueprint technical corner markers */}
					<span
						className="absolute top-2 left-2 text-[10px]"
						style={{ color: "var(--rule-strong)" }}
					>
						┌
					</span>
					<span
						className="absolute top-2 right-2 text-[10px]"
						style={{ color: "var(--rule-strong)" }}
					>
						┐
					</span>
					<span
						className="absolute bottom-2 left-2 text-[10px]"
						style={{ color: "var(--rule-strong)" }}
					>
						└
					</span>
					<span
						className="absolute bottom-2 right-2 text-[10px]"
						style={{ color: "var(--rule-strong)" }}
					>
						┘
					</span>

					{/* Terminal header bracket */}
					<span
						className="mono text-[11px] tracking-[0.08em]"
						style={{ color: "var(--accent)" }}
					>
						[ UNIVERSAL MULTI-FORMAT PROCESSING ENGINE ]
					</span>

					{configuredPreset && (
						<div
							className="mono inline-flex items-center gap-2 px-3 py-1 text-[11px] border"
							style={{
								borderColor: "var(--accent)",
								borderRadius: "var(--radius)",
								background: "var(--surface)",
								color: "var(--accent)",
							}}
						>
							<span>● INSTANT DEFAULT:</span>
							<span className="font-bold text-[var(--ink)]">
								{configuredPreset.from} → {configuredPreset.to}
							</span>
						</div>
					)}

					<span className="text-[14px] font-medium tracking-[0.06em]">
						DROP FILES HERE TO CONVERT
					</span>
					<span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
						{configuredPreset
							? `Drop your ${configuredPreset.from} files to convert instantly to ${configuredPreset.to}, or drop any files to batch convert`
							: "Drop multiple files of any type, or click to browse"}
					</span>

					{/* Supported Category Chips */}
					<div className="flex flex-col gap-2 pt-2">
						<div className="flex flex-wrap justify-center gap-3">
							{POPULAR_CATEGORIES.map((cat) => (
								<div
									key={cat.label}
									className="flex items-center gap-1 border px-2 py-1"
									style={{
										borderColor: "var(--rule)",
										borderRadius: "var(--radius)",
										background: "var(--surface)",
									}}
								>
									<span
										className="mono text-[10px]"
										style={{ color: "var(--accent)" }}
									>
										{cat.label}:
									</span>
									<span
										className="mono text-[10px]"
										style={{ color: "var(--ink-muted)" }}
									>
										{cat.formats.join(" · ")}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Security & Architecture Badge */}
					<div
						className="flex items-center gap-2 border px-3 py-1 mt-2"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius-pill)",
							background: "var(--surface)",
						}}
					>
						<span
							style={{
								width: "var(--space-base)",
								height: "var(--space-base)",
								borderRadius: "50%",
								background: "var(--accent)",
								display: "inline-block",
							}}
						/>
						<span
							className="mono text-[11px]"
							style={{ color: "var(--ink-muted)" }}
						>
							100% PRIVATE · CLIENT-SIDE WASM · ZERO SERVER UPLOADS
						</span>
					</div>

					<input
						id={fileInputId}
						type="file"
						multiple
						hidden
						accept={[
							...ALL_ACCEPTS.mime,
							...ALL_ACCEPTS.ext.map((e) => `.${e}`),
						].join(",")}
						onChange={(e) => {
							if (e.target.files) {
								handleFiles(Array.from(e.target.files));
							}
						}}
					/>
				</div>
			)}

			{/* Active Studio Workspace */}
			{items.length > 0 && (
				<div className="flex flex-col gap-4">
					{/* High-Density Cockpit Telemetry Strip */}
					<div
						className="relative flex flex-wrap items-center justify-between gap-3 border px-4 py-2.5"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
							background: "var(--surface)",
						}}
					>
						{/* Corner ticks */}
						<span
							className="absolute top-1 left-1 text-[9px]"
							style={{ color: "var(--rule)" }}
						>
							┌
						</span>
						<span
							className="absolute top-1 right-1 text-[9px]"
							style={{ color: "var(--rule)" }}
						>
							┐
						</span>

						{/* Left telemetry items */}
						<div className="flex flex-wrap items-center gap-3">
							<div className="flex items-center gap-1.5">
								<span
									style={{
										width: "var(--space-base)",
										height: "var(--space-base)",
										borderRadius: "50%",
										background: "var(--accent)",
										display: "inline-block",
									}}
								/>
								<span
									className="mono text-[11px] font-medium"
									style={{ color: "var(--ink)" }}
								>
									STUDIO QUEUE: {totalCount}{" "}
									{totalCount === 1 ? "FILE" : "FILES"}
								</span>
							</div>

							<div className="h-3 w-px" style={{ background: "var(--rule)" }} />

							<span
								className="mono text-[11px]"
								style={{ color: "var(--ink-muted)" }}
							>
								{formatBytes(items.reduce((s, i) => s + i.file.size, 0))}{" "}
								PAYLOAD
							</span>

							<div className="h-3 w-px" style={{ background: "var(--rule)" }} />

							{/* Formats distribution pills */}
							<div className="flex flex-wrap items-center gap-1">
								{formatBreakdown.slice(0, 4).map(([fmt, count]) => (
									<span
										key={fmt}
										className="mono border px-1.5 py-0.2 text-[10px]"
										style={{
											borderColor: "var(--rule)",
											borderRadius: "var(--radius)",
											color: "var(--ink)",
											background: "var(--ground)",
										}}
									>
										{fmt} × {count}
									</span>
								))}
								{formatBreakdown.length > 4 && (
									<span
										className="mono text-[10px]"
										style={{ color: "var(--ink-muted)" }}
									>
										+{formatBreakdown.length - 4} more
									</span>
								)}
							</div>
						</div>

						{/* Right telemetry: Concurrency & privacy */}
						<div className="flex items-center gap-2">
							<span
								className="mono text-[10px]"
								style={{ color: "var(--ink-muted)" }}
							>
								PARALLEL WORKERS: {detectedHardwareCores} CORES · 100%
								IN-BROWSER
							</span>
						</div>
					</div>

					{/* Overall Batch Progress Indicator during conversion */}
					{isConverting && (
						<div
							className="flex flex-col gap-2 border p-4"
							style={{
								borderColor: "var(--accent)",
								borderRadius: "var(--radius)",
								background: "var(--surface)",
							}}
						>
							<div className="flex justify-between items-center">
								<div className="flex items-center gap-2">
									<span
										style={{
											width: "var(--space-base)",
											height: "var(--space-base)",
											borderRadius: "50%",
											background: "var(--accent)",
											display: "inline-block",
										}}
									/>
									<span
										className="mono text-[12px] font-medium"
										style={{ color: "var(--accent)" }}
									>
										BATCH CONVERSION IN PROGRESS
									</span>
								</div>
								<span
									className="mono text-[12px]"
									style={{ color: "var(--ink)" }}
								>
									{formatPercent(overallProgressRatio)} ·{" "}
									{formatDuration(elapsedSeconds)} ELAPSED
								</span>
							</div>

							<div
								className="h-1.5 w-full overflow-hidden"
								style={{ background: "var(--ground)" }}
							>
								<div
									className="h-full transition-all duration-150"
									style={{
										width: `${overallProgressRatio * 100}%`,
										background: "var(--accent)",
									}}
								/>
							</div>
						</div>
					)}

					{/* Chained continuation notice banner */}
					{chainedNotice && (
						<div
							className="flex flex-wrap items-center justify-between gap-3 border px-4 py-3"
							style={{
								borderColor: "var(--accent)",
								borderRadius: "var(--radius)",
								background: "var(--surface)",
							}}
						>
							<div className="flex items-center gap-2">
								<span
									className="mono text-[12px] font-medium"
									style={{ color: "var(--accent)" }}
								>
									✓ CONTINUATION READY
								</span>
								<span
									className="mono text-[12px]"
									style={{ color: "var(--ink-muted)" }}
								>
									· {chainedNotice}
								</span>
							</div>

							<div className="flex items-center gap-2">
								{doneCount > 0 && (
									<button
										type="button"
										onClick={pruneCompleted}
										className="mono border px-2.5 py-0.5 text-[11px]"
										style={{
											borderColor: "var(--rule-strong)",
											borderRadius: "var(--radius-pill)",
											background: "var(--ground)",
											color: "var(--ink)",
											cursor: "pointer",
										}}
									>
										PRUNE COMPLETED ({doneCount})
									</button>
								)}
								<button
									type="button"
									onClick={() => setChainedNotice(null)}
									className="mono px-1.5 py-0.5 text-[11px]"
									style={{
										color: "var(--ink-muted)",
										background: "transparent",
										cursor: "pointer",
									}}
								>
									✕
								</button>
							</div>
						</div>
					)}

					{/* Total Savings Callout Banner when finished */}
					{!isConverting && doneCount > 0 && (
						<div
							className="flex flex-wrap items-center justify-between gap-3 border px-4 py-3"
							style={{
								borderColor: "var(--accent)",
								borderRadius: "var(--radius)",
								background: "var(--surface)",
							}}
						>
							<div className="flex items-center gap-2">
								<span
									className="mono text-[12px] font-medium"
									style={{ color: "var(--accent)" }}
								>
									✓ BATCH OPTIMIZATION COMPLETE
								</span>
								<span
									className="mono text-[12px]"
									style={{ color: "var(--ink-muted)" }}
								>
									· Processed {formatBytes(totalInputBytes)} down to{" "}
									{formatBytes(totalOutputBytes)}
								</span>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={copySummaryReport}
									className="mono border px-2.5 py-0.5 text-[11px]"
									style={{
										borderColor: "var(--rule-strong)",
										borderRadius: "var(--radius-pill)",
										background: "var(--ground)",
										color: copiedReport ? "var(--accent)" : "var(--ink)",
										cursor: "pointer",
									}}
								>
									{copiedReport ? "COPIED ✓" : "COPY REPORT"}
								</button>
								{hasSavings && (
									<span
										className="mono text-[12px] font-medium px-2 py-0.5"
										style={{
											background: "var(--accent)",
											color: "var(--ground)",
											borderRadius: "var(--radius-pill)",
										}}
									>
										SAVED {formatDelta(totalInputBytes, totalOutputBytes)}
									</span>
								)}
							</div>
						</div>
					)}

					{/* Controls & Customization Bar */}
					<div
						className="flex flex-col gap-3 border p-4"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
							background: "var(--surface)",
						}}
					>
						{/* Top row: Selection count and quick selection actions */}
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-3">
								<span className="mono text-[13px] font-medium">
									{selectedCount} of {totalCount} selected
								</span>
								{selectedCount > 0 && (
									<span
										className="mono text-[12px]"
										style={{ color: "var(--ink-muted)" }}
									>
										({formatBytes(selectedBytes)})
									</span>
								)}
								<div
									className="h-3 w-px"
									style={{ background: "var(--rule)" }}
								/>
								<div className="flex flex-wrap gap-1">
									<button
										type="button"
										onClick={() => setAllSelection(true)}
										className="mono border px-2 py-0.5 text-[11px]"
										style={{
											borderColor: "var(--rule-strong)",
											borderRadius: "var(--radius)",
											color: "var(--ink)",
											background: "transparent",
											cursor: "pointer",
										}}
									>
										SELECT ALL
									</button>
									<button
										type="button"
										onClick={() => setAllSelection(false)}
										className="mono border px-2 py-0.5 text-[11px]"
										style={{
											borderColor: "var(--rule-strong)",
											borderRadius: "var(--radius)",
											color: "var(--ink-muted)",
											background: "transparent",
											cursor: "pointer",
										}}
									>
										DESELECT
									</button>
									<button
										type="button"
										onClick={invertSelection}
										className="mono border px-2 py-0.5 text-[11px]"
										style={{
											borderColor: "var(--rule-strong)",
											borderRadius: "var(--radius)",
											color: "var(--ink-muted)",
											background: "transparent",
											cursor: "pointer",
										}}
									>
										INVERT
									</button>
									{totalCount > selectedCount && (
										<button
											type="button"
											onClick={removeUnselected}
											className="mono border px-2 py-0.5 text-[11px]"
											style={{
												borderColor: "var(--rule)",
												borderRadius: "var(--radius)",
												color: "var(--ink-muted)",
												background: "transparent",
												cursor: "pointer",
											}}
										>
											PRUNE UNCHECKED
										</button>
									)}
									{doneCount > 0 && (
										<button
											type="button"
											onClick={() => {
												setItems((prev) =>
													prev.map((item) => ({
														...item,
														selected: item.status === "done",
													})),
												);
											}}
											className="mono border px-2 py-0.5 text-[11px]"
											style={{
												borderColor: "var(--rule)",
												borderRadius: "var(--radius)",
												color: "var(--ink)",
												background: "transparent",
												cursor: "pointer",
											}}
											title="Select only completed files"
										>
											DONE ({doneCount})
										</button>
									)}
									{doneCount > 0 && (
										<button
											type="button"
											onClick={pruneCompleted}
											className="mono border px-2 py-0.5 text-[11px]"
											style={{
												borderColor: "var(--rule)",
												borderRadius: "var(--radius)",
												color: "var(--accent)",
												background: "transparent",
												cursor: "pointer",
											}}
										>
											PRUNE COMPLETED
										</button>
									)}
									{doneCount > 0 && (
										<button
											type="button"
											onClick={() => handleContinueOutputs()}
											className="mono border px-2.5 py-0.5 text-[11px] font-medium transition-all hover:bg-[var(--accent)] hover:text-[var(--ground)] inline-flex items-center gap-1"
											style={{
												borderColor: "var(--accent)",
												borderRadius: "var(--radius)",
												color: "var(--accent)",
												background: "transparent",
												cursor: "pointer",
											}}
											title="Stage completed outputs for another conversion (Shift+Cmd+C)"
										>
											<span>
												CONTINUE WITH OUTPUTS (
												{selectedDoneItems.length > 0
													? selectedDoneItems.length
													: doneItems.length}
												) →
											</span>
											<span className="opacity-75 text-[9px] tracking-wider font-sans">
												⇧⌘C
											</span>
										</button>
									)}
								</div>
							</div>

							{/* Add More Files Button */}
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => addMoreInputRef.current?.click()}
									className="mono border px-3 py-1 text-[12px] font-medium"
									style={{
										borderColor: "var(--rule-strong)",
										borderRadius: "var(--radius)",
										color: "var(--ink)",
										background: "var(--ground)",
										cursor: "pointer",
									}}
								>
									+ ADD FILES
								</button>
								<input
									ref={addMoreInputRef}
									id={addMoreInputId}
									type="file"
									multiple
									hidden
									accept={[
										...ALL_ACCEPTS.mime,
										...ALL_ACCEPTS.ext.map((e) => `.${e}`),
									].join(",")}
									onChange={(e) => {
										if (e.target.files) {
											handleFiles(Array.from(e.target.files));
										}
									}}
								/>
							</div>
						</div>

						{/* Bottom row: Global Target Selector, Quick Target Shortcuts & Quality Preset */}
						<div
							className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t"
							style={{ borderColor: "var(--rule)" }}
						>
							<div className="flex flex-wrap items-center gap-3">
								<div className="flex items-center gap-2">
									<label
										htmlFor="global-target-select"
										className="mono text-[12px]"
										style={{ color: "var(--ink-muted)" }}
									>
										CONVERT SELECTED TO:
									</label>
									{configuredPreset && (
										<span
											data-testid="controls-preset-pill"
											className="mono border px-2 py-0.5 text-[10px]"
											style={{
												borderColor: "var(--accent)",
												borderRadius: "var(--radius)",
												color: "var(--accent)",
												background: "var(--ground)",
											}}
										>
											PRESET: {configuredPreset.from} → {configuredPreset.to}
										</span>
									)}
									<select
										id="global-target-select"
										value={globalTarget}
										onChange={(e) => applyGlobalTarget(e.target.value)}
										className="mono border px-2 py-1 text-[12px]"
										style={{
											borderColor: "var(--ink)",
											borderRadius: "var(--radius)",
											background: "var(--ground)",
											color: "var(--ink)",
											cursor: "pointer",
										}}
									>
										<option value="">Choose target...</option>
										{commonTargets.length > 0 && (
											<optgroup label="Compatible with all selected">
												{commonTargets.map((ext) => (
													<option key={ext} value={ext}>
														{ext.toUpperCase()} (all {selectedCount})
													</option>
												))}
											</optgroup>
										)}
										{allAvailableTargets.length > commonTargets.length && (
											<optgroup label="Other available formats">
												{allAvailableTargets
													.filter((ext) => !commonTargets.includes(ext))
													.map((ext) => (
														<option key={ext} value={ext}>
															{ext.toUpperCase()}
														</option>
													))}
											</optgroup>
										)}
									</select>
								</div>

								{/* One-click common target shortcuts */}
								{commonTargets.length > 0 && (
									<div className="flex flex-wrap items-center gap-1.5">
										<span
											className="mono text-[11px]"
											style={{ color: "var(--ink-muted)" }}
										>
											QUICK:
										</span>
										{commonTargets.slice(0, 5).map((target) => (
											<button
												key={target}
												type="button"
												onClick={() => applyGlobalTarget(target)}
												className="mono border px-2 py-0.5 text-[11px]"
												style={{
													borderColor:
														globalTarget === target
															? "var(--accent)"
															: "var(--rule-strong)",
													background:
														globalTarget === target
															? "var(--accent)"
															: "var(--ground)",
													color:
														globalTarget === target
															? "var(--ground)"
															: "var(--ink)",
													borderRadius: "var(--radius)",
													cursor: "pointer",
												}}
											>
												→ {target.toUpperCase()}
											</button>
										))}
									</div>
								)}
							</div>

							{/* Quality Preset */}
							<div className="flex items-center gap-2">
								<label
									htmlFor="quality-preset-select"
									className="mono text-[12px]"
									style={{ color: "var(--ink-muted)" }}
								>
									PRESET:
								</label>
								<select
									id="quality-preset-select"
									value={qualityPreset}
									onChange={(e) =>
										setQualityPreset(e.target.value as QualityPreset)
									}
									className="mono border px-2 py-1 text-[12px]"
									style={{
										borderColor: "var(--rule-strong)",
										borderRadius: "var(--radius)",
										background: "var(--ground)",
										color: "var(--ink)",
										cursor: "pointer",
									}}
								>
									{QUALITY_PRESETS.map((preset) => (
										<option key={preset} value={preset}>
											{preset.toUpperCase()}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* Search, Status Tabs & Category Filter Bar */}
					<div
						className="flex flex-col gap-2 border p-3"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
							background: "var(--surface)",
						}}
					>
						{/* Top row: Status Tabs & Search Input */}
						<div className="flex flex-wrap items-center justify-between gap-3">
							{/* Status Filter Tabs */}
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setStatusFilter("all")}
									className="mono px-2 py-1 text-[11px]"
									style={{
										background:
											statusFilter === "all" ? "var(--ground)" : "transparent",
										color:
											statusFilter === "all"
												? "var(--ink)"
												: "var(--ink-muted)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor:
											statusFilter === "all"
												? "var(--rule-strong)"
												: "transparent",
										borderRadius: "var(--radius)",
										cursor: "pointer",
									}}
								>
									ALL ({items.length})
								</button>
								<button
									type="button"
									onClick={() => setStatusFilter("ready")}
									className="mono px-2 py-1 text-[11px]"
									style={{
										background:
											statusFilter === "ready"
												? "var(--ground)"
												: "transparent",
										color:
											statusFilter === "ready"
												? "var(--ink)"
												: "var(--ink-muted)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor:
											statusFilter === "ready"
												? "var(--rule-strong)"
												: "transparent",
										borderRadius: "var(--radius)",
										cursor: "pointer",
									}}
								>
									READY ({readyCount})
								</button>
								{doneCount > 0 && (
									<button
										type="button"
										onClick={() => setStatusFilter("done")}
										className="mono px-2 py-1 text-[11px]"
										style={{
											background:
												statusFilter === "done"
													? "var(--ground)"
													: "transparent",
											color:
												statusFilter === "done"
													? "var(--accent)"
													: "var(--ink-muted)",
											borderWidth: "var(--rule-width)",
											borderStyle: "solid",
											borderColor:
												statusFilter === "done"
													? "var(--accent)"
													: "transparent",
											borderRadius: "var(--radius)",
											cursor: "pointer",
										}}
									>
										DONE ({doneCount})
									</button>
								)}
								{errorCount > 0 && (
									<button
										type="button"
										onClick={() => setStatusFilter("error")}
										className="mono px-2 py-1 text-[11px]"
										style={{
											background:
												statusFilter === "error"
													? "var(--ground)"
													: "transparent",
											color:
												statusFilter === "error"
													? "var(--rule-strong)"
													: "var(--ink-muted)",
											borderWidth: "var(--rule-width)",
											borderStyle: "solid",
											borderColor:
												statusFilter === "error"
													? "var(--rule-strong)"
													: "transparent",
											borderRadius: "var(--radius)",
											cursor: "pointer",
										}}
									>
										ERRORS ({errorCount})
									</button>
								)}
							</div>

							{/* Search Input & Pipeline Telemetry */}
							<div className="flex items-center gap-2">
								{chainedCount > 0 && (
									<span
										data-testid="pipeline-telemetry-badge"
										className="mono border px-2 py-0.5 text-[10px] tracking-[0.04em]"
										title="Chained transformation workflow active"
										style={{
											borderColor: "var(--accent)",
											borderRadius: "var(--radius)",
											color: "var(--accent)",
											background: "var(--surface)",
										}}
									>
										PIPELINE: {chainedCount} CHAINED · DEPTH: {maxChainStep}{" "}
										{maxChainStep === 1 ? "STEP" : "STEPS"}
									</span>
								)}
								<input
									type="search"
									placeholder="Filter files..."
									value={tableSearch}
									onChange={(e) => setTableSearch(e.target.value)}
									aria-label="Filter batch files table"
									className="mono border px-2 py-1 text-[12px]"
									style={{
										borderColor: "var(--rule)",
										borderRadius: "var(--radius)",
										background: "var(--ground)",
										color: "var(--ink)",
										outline: "none",
									}}
								/>
								{tableSearch && (
									<button
										type="button"
										onClick={() => setTableSearch("")}
										className="mono text-[11px]"
										style={{ color: "var(--accent)", cursor: "pointer" }}
									>
										CLEAR
									</button>
								)}
							</div>
						</div>

						{/* Bottom row: Category Filter Pills if more than 1 category exists */}
						{availableCategories.length > 1 && (
							<div
								className="flex flex-wrap items-center gap-1.5 pt-2 border-t"
								style={{ borderColor: "var(--rule)" }}
							>
								<span
									className="mono text-[10px]"
									style={{ color: "var(--ink-muted)" }}
								>
									KIND:
								</span>
								<button
									type="button"
									onClick={() => setCategoryFilter("all")}
									className="mono px-2 py-0.5 text-[10px]"
									style={{
										background:
											categoryFilter === "all"
												? "var(--ground)"
												: "transparent",
										color:
											categoryFilter === "all"
												? "var(--ink)"
												: "var(--ink-muted)",
										borderWidth: "var(--rule-width)",
										borderStyle: "solid",
										borderColor:
											categoryFilter === "all"
												? "var(--rule-strong)"
												: "transparent",
										borderRadius: "var(--radius-pill)",
										cursor: "pointer",
									}}
								>
									ALL TYPES
								</button>
								{availableCategories.map((cat) => (
									<button
										key={cat}
										type="button"
										onClick={() => setCategoryFilter(cat)}
										className="mono px-2 py-0.5 text-[10px]"
										style={{
											background:
												categoryFilter === cat
													? "var(--ground)"
													: "transparent",
											color:
												categoryFilter === cat
													? "var(--accent)"
													: "var(--ink-muted)",
											borderWidth: "var(--rule-width)",
											borderStyle: "solid",
											borderColor:
												categoryFilter === cat
													? "var(--accent)"
													: "transparent",
											borderRadius: "var(--radius-pill)",
											cursor: "pointer",
										}}
									>
										{cat.toUpperCase()} (
										{items.filter((i) => categorizeFile(i.ext) === cat).length})
									</button>
								))}
							</div>
						)}
					</div>

					{/* File List Table */}
					<div
						className="overflow-x-auto border"
						style={{ borderColor: "var(--rule)" }}
					>
						<table
							className="mono w-full border-collapse text-[12px]"
							style={{ borderColor: "var(--rule)" }}
						>
							<caption className="sr-only">
								Master conversion file table
							</caption>
							<thead>
								<tr>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-center font-normal"
										style={cellStyle}
									>
										<input
											type="checkbox"
											checked={totalCount > 0 && selectedCount === totalCount}
											aria-label="Select or deselect all files"
											onChange={(e) => setAllSelection(e.target.checked)}
											className="cursor-pointer"
										/>
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-left font-normal cursor-pointer"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
										onClick={() => toggleSort("name")}
									>
										FILE {sortColumn === "name" ? (sortAsc ? "↑" : "↓") : ""}
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-right font-normal cursor-pointer"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
										onClick={() => toggleSort("size")}
									>
										IN {sortColumn === "size" ? (sortAsc ? "↑" : "↓") : ""}
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-center font-normal"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
									>
										CONVERT TO
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-right font-normal"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
									>
										OUT
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-right font-normal"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
									>
										DELTA
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-left font-normal cursor-pointer"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
										onClick={() => toggleSort("status")}
									>
										STATUS{" "}
										{sortColumn === "status" ? (sortAsc ? "↑" : "↓") : ""}
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-right font-normal"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
									>
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{displayedItems.map((item) => {
									const availableTargets = getAvailableTargetFormatsForFile(
										item.file,
									);
									const isConvertingRow = item.status === "converting";
									const isDoneRow = item.status === "done";
									const isErrorRow = item.status === "error";
									const category = categorizeFile(item.ext);

									return (
										<Fragment key={item.id}>
											<tr
												data-testid="converter-item-row"
												data-selected={item.selected}
												data-status={item.status}
												style={{
													background: item.selected
														? "transparent"
														: "var(--surface)",
													opacity: item.selected ? 1 : 0.6,
												}}
											>
												{/* Selection Checkbox */}
												<td
													className="border-b px-3 py-2 text-center"
													style={cellStyle}
												>
													<input
														type="checkbox"
														checked={item.selected}
														aria-label={`Select ${item.file.name}`}
														onChange={() => toggleItemSelection(item.id)}
														className="cursor-pointer"
													/>
												</td>

												{/* File Name, Category Glyph & Micro-Thumbnail */}
												<td
													className="border-b px-3 py-2 text-left"
													style={cellStyle}
												>
													<div className="flex items-center gap-2">
														<CategoryGlyph category={category} />
														<ImageMicroThumbnail file={item.file} />
														<span className="truncate max-w-xs">
															{item.file.name}
														</span>
														<span
															className="border px-1.5 py-0.5 text-[10px]"
															style={{
																borderColor: "var(--rule-strong)",
																borderRadius: "var(--radius)",
																color: "var(--ink-muted)",
															}}
														>
															{item.ext ? item.ext.toUpperCase() : "UNKNOWN"}
														</span>
														{item.lineage && (
															<span
																data-testid={`lineage-badge-${item.id}`}
																className="mono border px-1.5 py-0.5 text-[9px] tracking-[0.03em] whitespace-nowrap"
																title={`Chained from ${item.lineage.parentName}`}
																style={{
																	borderColor: "var(--accent)",
																	borderRadius: "var(--radius)",
																	color: "var(--accent)",
																	background: "var(--surface)",
																}}
															>
																STEP {item.lineage.step} · FROM{" "}
																{item.lineage.parentName}
															</span>
														)}
													</div>
												</td>

												{/* Input File Size */}
												<td
													className="border-b px-3 py-2 text-right"
													style={cellStyle}
												>
													{formatBytes(item.file.size)}
												</td>

												{/* Target Format Selector Per File */}
												<td
													className="border-b px-3 py-2 text-center"
													style={cellStyle}
												>
													{availableTargets.length > 0 ? (
														<select
															value={item.targetExt}
															disabled={isConverting}
															aria-label={`Target format for ${item.file.name}`}
															onChange={(e) =>
																changeItemTarget(item.id, e.target.value)
															}
															className="mono border px-2 py-0.5 text-[11px]"
															style={{
																borderColor: "var(--rule-strong)",
																borderRadius: "var(--radius)",
																background: "var(--ground)",
																color: "var(--ink)",
															}}
														>
															{availableTargets.map((t) => (
																<option key={t.ext} value={t.ext}>
																	→ {t.label}
																</option>
															))}
														</select>
													) : (
														<span
															className="text-[11px]"
															style={{ color: "var(--ink-muted)" }}
														>
															NO CONVERSION
														</span>
													)}
												</td>

												{/* Output Size */}
												<td
													className="border-b px-3 py-2 text-right"
													style={cellStyle}
												>
													{isDoneRow && item.outputSize !== undefined
														? formatBytes(item.outputSize)
														: "—"}
												</td>

												{/* Delta */}
												<td
													className="border-b px-3 py-2 text-right"
													style={cellStyle}
												>
													{isDoneRow && item.outputSize !== undefined ? (
														<span
															style={{
																color:
																	item.file.size > item.outputSize
																		? "var(--accent)"
																		: "var(--ink-muted)",
															}}
														>
															{formatDelta(item.file.size, item.outputSize)}
														</span>
													) : (
														"—"
													)}
												</td>

												{/* Status / Live Progress */}
												<td
													className="border-b px-3 py-2 text-left"
													style={cellStyle}
												>
													{isConvertingRow ? (
														<div className="flex flex-col gap-1">
															<div
																className="h-1 w-24 overflow-hidden"
																style={{ background: "var(--rule)" }}
															>
																<div
																	className="h-full transition-all"
																	style={{
																		width: `${item.ratio * 100}%`,
																		background: "var(--accent)",
																	}}
																/>
															</div>
															<span className="text-[10px]">
																{formatPercent(item.ratio)} ·{" "}
																{item.phase || "CONVERTING"}
															</span>
														</div>
													) : isDoneRow ? (
														<span
															className="mono border px-1.5 py-0.5 text-[10px]"
															style={{
																color: "var(--accent)",
																borderColor: "var(--accent)",
																borderRadius: "var(--radius)",
																background: "var(--surface)",
															}}
														>
															✓ DONE
														</span>
													) : isErrorRow ? (
														<div className="flex items-center gap-1.5">
															<span
																className="mono border px-1.5 py-0.5 text-[10px]"
																style={{
																	color: "var(--rule-strong)",
																	borderColor: "var(--rule-strong)",
																	borderRadius: "var(--radius)",
																}}
															>
																ERROR
															</span>
															<button
																type="button"
																onClick={() => retryItem(item.id)}
																className="mono text-[10px]"
																style={{
																	color: "var(--accent)",
																	cursor: "pointer",
																	textDecoration: "underline",
																}}
															>
																RETRY
															</button>
														</div>
													) : (
														<span
															style={{
																color: "var(--ink-muted)",
															}}
														>
															{item.status.toUpperCase()}
														</span>
													)}
												</td>

												{/* Actions: Save / Preview / Remove */}
												<td
													className="border-b px-3 py-2 text-right"
													style={cellStyle}
												>
													{isDoneRow ? (
														<div className="flex items-center justify-end gap-1.5">
															{category === "image" && item.output && (
																<button
																	type="button"
																	onClick={() => setActivePreviewItem(item)}
																	aria-label={`Preview ${item.file.name}`}
																	className="mono border px-1.5 py-0.5 text-[10px]"
																	style={{
																		color: "var(--ink-muted)",
																		borderColor: "var(--rule-strong)",
																		borderRadius: "var(--radius)",
																		background: "transparent",
																		cursor: "pointer",
																	}}
																>
																	VIEW
																</button>
															)}
															{item.output &&
																getAvailableTargetFormatsForFile(
																	item.tool?.output.ext ?? item.targetExt,
																).length > 0 && (
																	<div className="inline-flex items-center gap-1">
																		<button
																			type="button"
																			data-testid="row-continue-btn"
																			onClick={() => handleContinueRow(item)}
																			aria-label={`Continue conversion for ${item.file.name}`}
																			title={`Continue conversion from ${(item.tool?.output.ext ?? item.targetExt).toUpperCase()} output`}
																			className="mono border px-2 py-0.5 text-[11px] font-medium transition-all hover:bg-[var(--accent)] hover:text-[var(--ground)]"
																			style={{
																				color: "var(--accent)",
																				borderColor: "var(--accent)",
																				borderRadius: "var(--radius)",
																				background: "transparent",
																				cursor: "pointer",
																			}}
																		>
																			CONTINUE →
																		</button>
																		{getAvailableTargetFormatsForFile(
																			item.tool?.output.ext ?? item.targetExt,
																		)
																			.slice(0, 2)
																			.map((opt) => (
																				<button
																					key={opt.ext}
																					type="button"
																					data-testid={`row-continue-target-${opt.ext}`}
																					onClick={() =>
																						handleContinueRow(item, opt.ext)
																					}
																					aria-label={`Continue conversion to ${opt.label}`}
																					title={`Continue directly to ${opt.label}`}
																					className="mono border px-1.5 py-0.5 text-[10px] opacity-80 hover:opacity-100 hover:border-[var(--accent)] hover:text-[var(--accent)]"
																					style={{
																						borderColor: "var(--rule-strong)",
																						borderRadius: "var(--radius)",
																						color: "var(--ink)",
																						background: "var(--surface)",
																						cursor: "pointer",
																					}}
																				>
																					→ {opt.label}
																				</button>
																			))}
																	</div>
																)}
															<button
																type="button"
																onClick={() => handleSaveRow(item)}
																aria-label={`Save ${item.file.name}`}
																className="mono border px-2 py-0.5 text-[11px]"
																style={{
																	color: "var(--ground)",
																	borderColor: "var(--accent)",
																	borderRadius: "var(--radius)",
																	background: "var(--accent)",
																	cursor: "pointer",
																}}
															>
																SAVE
															</button>
														</div>
													) : (
														<button
															type="button"
															disabled={isConverting}
															onClick={() => removeItem(item.id)}
															aria-label={`Remove ${item.file.name}`}
															className="mono px-1.5 py-0.5 text-[12px]"
															style={{
																color: "var(--ink-muted)",
																background: "transparent",
																cursor: "pointer",
															}}
														>
															✕
														</button>
													)}
												</td>
											</tr>

											{/* Inline Error Panel Row */}
											{isErrorRow && item.error && (
												<tr data-testid="item-error-row">
													<td colSpan={8} className="border-b p-0">
														<ErrorPanel
															code={item.error.code}
															detail={item.error.message}
															inputFormat={item.ext}
														/>
													</td>
												</tr>
											)}
										</Fragment>
									);
								})}

								{displayedItems.length === 0 && (
									<tr>
										<td
											colSpan={8}
											className="border-b px-3 py-6 text-center text-[12px]"
											style={{ ...cellStyle, color: "var(--ink-muted)" }}
										>
											No files match &ldquo;{tableSearch}&rdquo; in current
											filter
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					{/* Secondary Dropzone Strip: Allows fast ingestion without leaving table view */}
					{/* biome-ignore lint/a11y/useSemanticElements: drop zone needs drag-and-drop handlers and a nested file input, which a native <button> can't host. */}
					<div
						role="button"
						tabIndex={0}
						onDragOver={(e) => {
							e.preventDefault();
							setDropActive(true);
						}}
						onDragLeave={() => setDropActive(false)}
						onDrop={(e) => {
							e.preventDefault();
							setDropActive(false);
							if (e.dataTransfer.files) {
								handleFiles(Array.from(e.dataTransfer.files));
							}
						}}
						onClick={() =>
							document.getElementById(secondaryDropInputId)?.click()
						}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								document.getElementById(secondaryDropInputId)?.click();
							}
						}}
						className="mono flex items-center justify-center border border-dashed py-3 text-center transition-all"
						style={{
							borderColor: dropActive ? "var(--accent)" : "var(--rule)",
							background: dropActive ? "var(--surface)" : "transparent",
							borderRadius: "var(--radius)",
							cursor: "pointer",
						}}
					>
						<span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
							+ DROP MORE FILES HERE OR CLICK TO BROWSE
						</span>
						<input
							id={secondaryDropInputId}
							type="file"
							multiple
							hidden
							accept={[
								...ALL_ACCEPTS.mime,
								...ALL_ACCEPTS.ext.map((e) => `.${e}`),
							].join(",")}
							onChange={(e) => {
								if (e.target.files) {
									handleFiles(Array.from(e.target.files));
								}
							}}
						/>
					</div>

					{/* Action & Status Footer */}
					<div
						className="flex flex-wrap items-center justify-between gap-4 border p-4"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
							background: "var(--surface)",
						}}
					>
						{/* Left status overview */}
						<div className="flex items-center gap-3">
							<span
								className="mono text-[13px]"
								style={{ color: "var(--ink-muted)" }}
							>
								{isConverting
									? `CONVERTING · ELAPSED ${formatDuration(elapsedSeconds)}`
									: doneCount > 0
										? `${doneCount} of ${selectedCount} files converted`
										: `${selectedCount} files ready to convert`}
							</span>

							{errorCount > 0 && !isConverting && (
								<button
									type="button"
									onClick={retryAllFailed}
									className="mono border px-2 py-1 text-[11px]"
									style={{
										color: "var(--accent)",
										borderColor: "var(--accent)",
										borderRadius: "var(--radius)",
										background: "var(--ground)",
										cursor: "pointer",
									}}
								>
									RETRY FAILED ({errorCount})
								</button>
							)}
						</div>

						{/* Right action buttons */}
						<div className="flex items-center gap-3">
							{isConverting ? (
								<button
									type="button"
									onClick={cancelConversion}
									className="mono border px-4 py-2 text-[12px]"
									style={{
										color: "var(--ink)",
										borderColor: "var(--ink)",
										borderRadius: "var(--radius-pill)",
										background: "transparent",
										cursor: "pointer",
									}}
								>
									CANCEL
								</button>
							) : (
								<>
									<button
										type="button"
										onClick={clearAll}
										className="mono border px-3 py-2 text-[12px]"
										style={{
											color: "var(--ink-muted)",
											borderColor: "var(--rule-strong)",
											borderRadius: "var(--radius-pill)",
											background: "transparent",
											cursor: "pointer",
										}}
									>
										CLEAR ALL
									</button>

									{doneCount > 0 && (
										<button
											type="button"
											onClick={handleDownloadAllZip}
											className="mono border px-4 py-2 text-[12px] font-medium inline-flex items-center gap-1.5"
											style={{
												color: "var(--ground)",
												background: "var(--ink)",
												borderColor: "var(--ink)",
												borderRadius: "var(--radius-pill)",
												cursor: "pointer",
											}}
										>
											<span>DOWNLOAD ALL (ZIP)</span>
											<span className="opacity-70 text-[10px] tracking-wider font-sans">
												⇧⌘S
											</span>
										</button>
									)}

									{doneCount > 0 && (
										<button
											type="button"
											data-testid="continue-outputs-btn"
											onClick={() => handleContinueOutputs()}
											className="mono border px-4 py-2 text-[12px] font-medium transition-all hover:bg-[var(--accent)] hover:text-[var(--ground)] inline-flex items-center gap-1.5"
											style={{
												color: "var(--accent)",
												borderColor: "var(--accent)",
												borderRadius: "var(--radius-pill)",
												background: "transparent",
												cursor: "pointer",
											}}
											title="Continue conversion with output files (Shift+Cmd+C)"
										>
											<span>
												CONTINUE WITH OUTPUTS (
												{selectedDoneItems.length > 0
													? selectedDoneItems.length
													: doneItems.length}
												) →
											</span>
											<span className="opacity-75 text-[10px] tracking-wider font-sans">
												⇧⌘C
											</span>
										</button>
									)}

									<button
										type="button"
										disabled={selectedCount === 0}
										onClick={startConversion}
										className="mono border px-6 py-2 text-[13px] font-medium transition-opacity inline-flex items-center gap-2"
										style={{
											color: "var(--ground)",
											background: "var(--ink)",
											borderColor: "var(--ink)",
											borderRadius: "var(--radius-pill)",
											opacity: selectedCount === 0 ? 0.4 : 1,
											cursor: selectedCount === 0 ? "not-allowed" : "pointer",
										}}
									>
										<span>
											CONVERT {selectedCount > 0 ? `${selectedCount} ` : ""}
											{selectedCount === 1 ? "FILE" : "FILES"}
										</span>
										<span className="opacity-70 text-[10px] tracking-wider font-sans">
											⌘↵
										</span>
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
