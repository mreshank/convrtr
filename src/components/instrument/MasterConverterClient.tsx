"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { ErrorPanel } from "@/components/instrument/ErrorPanel";
import { HeavyDownloadGate } from "@/components/instrument/HeavyDownloadGate";
import { outputFilename, readFile, saveOutput } from "@/core/io";
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
};

const ALL_ACCEPTS = {
	ext: Array.from(new Set(TOOLS.flatMap((t) => t.accept.ext))),
	mime: Array.from(new Set(TOOLS.flatMap((t) => t.accept.mime))),
};

const POPULAR_FORMATS = [
	"PNG",
	"JPG",
	"WEBP",
	"HEIC",
	"MP4",
	"MOV",
	"WAV",
	"MP3",
	"PDF",
];

const cellStyle = {
	borderColor: "var(--rule)",
} as const;

export function MasterConverterClient() {
	const fileInputId = useId();
	const addMoreInputId = useId();
	const [items, setItems] = useState<MasterItem[]>([]);
	const [globalTarget, setGlobalTarget] = useState<string>("");
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

	const controllerRef = useRef<AbortController | null>(null);
	const startedAtRef = useRef<number>(0);
	const addMoreInputRef = useRef<HTMLInputElement>(null);

	// Track elapsed time during conversion
	useEffect(() => {
		if (!isConverting) return;
		const timer = window.setInterval(() => {
			setElapsedSeconds((Date.now() - startedAtRef.current) / 1000);
		}, 100);
		return () => window.clearInterval(timer);
	}, [isConverting]);

	// Ingest dropped or picked files
	const handleFiles = (newFiles: File[]) => {
		if (newFiles.length === 0) return;

		const largest = newFiles.reduce(
			(worst, candidate) => (candidate.size > worst.size ? candidate : worst),
			newFiles[0] ?? new File([], ""),
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

		const createdItems: MasterItem[] = newFiles.map((file, index) => {
			const ext = detectFileExtension(file);
			const availableTargets = getAvailableTargetFormatsForFile(file);

			// Choose default target: use globalTarget if compatible, else first available
			let defaultTarget = "";
			if (
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
			};
		});

		setItems((prev) => {
			const merged = [...prev, ...createdItems];
			// If all newly added files share a common target and no global target is set, initialize it
			const common = getCommonTargetFormats(merged.map((m) => m.file));
			if (!globalTarget && common.length > 0) {
				const chosen = common[0];
				if (chosen) setGlobalTarget(chosen);
			}
			return merged;
		});
	};

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

	// Apply a global target format across all compatible selected items.
	// Same reset as `changeItemTarget`, for the same reason -- a bulk
	// re-target must not leave a previously "done" row's stale output
	// reachable through its Save button.
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
					status: "idle",
					ratio: 0,
					phase: "",
					output: undefined,
					outputSize: undefined,
					outputName: undefined,
					error: undefined,
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

	// Change target for a single item. Resets any prior conversion result --
	// otherwise a row that already converted keeps showing "done" with a
	// Save button that would download the OLD target's bytes under the
	// NEW target's filename.
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
					status: "idle",
					ratio: 0,
					phase: "",
					output: undefined,
					outputSize: undefined,
					outputName: undefined,
					error: undefined,
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

	return (
		<div className="flex flex-col gap-6" data-testid="master-converter">
			{/* Top Error Alert */}
			{topError && <ErrorPanel code={topError.code} detail={topError.detail} />}

			{/* Heavy Download Gate */}
			{showHeavyGate && heavyTool && (
				<HeavyDownloadGate
					megabytes={heavyTool.heavyDownloadMb ?? 31}
					formatLabel={heavyTool.accept.ext.join(", ").toUpperCase()}
					onAccept={acceptHeavyDownload}
				/>
			)}

			{/* Empty State / Initial Drop Zone */}
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
					className="mono flex flex-col items-center gap-4 border p-12 text-center transition-colors"
					style={{
						borderColor: dropActive ? "var(--ink)" : "var(--rule-strong)",
						borderRadius: "var(--radius)",
						cursor: "pointer",
					}}
				>
					<span className="text-[14px] font-medium tracking-[0.06em]">
						DROP FILES HERE TO CONVERT
					</span>
					<span className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
						Drop multiple files of any type, or click to browse
					</span>
					<div className="flex flex-wrap justify-center gap-2 pt-2">
						{POPULAR_FORMATS.map((fmt) => (
							<span
								key={fmt}
								className="border px-2 py-1 text-[11px] tracking-[0.08em]"
								style={{
									borderColor: "var(--rule-strong)",
									borderRadius: "var(--radius)",
									color: "var(--ink-muted)",
								}}
							>
								{fmt}
							</span>
						))}
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
					{/* Controls & Customization Bar */}
					<div
						className="flex flex-wrap items-center justify-between gap-4 border p-4"
						style={{
							borderColor: "var(--rule)",
							borderRadius: "var(--radius)",
							background: "var(--surface)",
						}}
					>
						{/* Left: Selection count and quick actions */}
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
							<div className="h-3 w-px" style={{ background: "var(--rule)" }} />
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
										}}
									>
										PRUNE UNCHECKED
									</button>
								)}
							</div>
						</div>

						{/* Right: Global Target, Quality, Add more */}
						<div className="flex flex-wrap items-center gap-3">
							<div className="flex items-center gap-2">
								<label
									htmlFor="global-target-select"
									className="mono text-[12px]"
									style={{ color: "var(--ink-muted)" }}
								>
									CONVERT SELECTED TO:
								</label>
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
									}}
								>
									{QUALITY_PRESETS.map((preset) => (
										<option key={preset} value={preset}>
											{preset.toUpperCase()}
										</option>
									))}
								</select>
							</div>

							<button
								type="button"
								onClick={() => addMoreInputRef.current?.click()}
								className="mono border px-3 py-1 text-[12px]"
								style={{
									borderColor: "var(--rule-strong)",
									borderRadius: "var(--radius)",
									color: "var(--ink)",
									background: "transparent",
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
										className="border-b px-3 py-2.5 text-left font-normal"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
									>
										FILE
									</th>
									<th
										scope="col"
										className="border-b px-3 py-2.5 text-right font-normal"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
									>
										IN
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
										className="border-b px-3 py-2.5 text-left font-normal"
										style={{ ...cellStyle, color: "var(--ink-muted)" }}
									>
										STATUS
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
								{items.map((item) => {
									const availableTargets = getAvailableTargetFormatsForFile(
										item.file,
									);
									const isConvertingRow = item.status === "converting";
									const isDoneRow = item.status === "done";
									const isErrorRow = item.status === "error";

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

												{/* File Name & Input Badge */}
												<td
													className="border-b px-3 py-2 text-left"
													style={cellStyle}
												>
													<div className="flex items-center gap-2">
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
													{isDoneRow && item.outputSize !== undefined
														? formatDelta(item.file.size, item.outputSize)
														: "—"}
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
																	className="h-full"
																	style={{
																		width: `${item.ratio * 100}%`,
																		background: "var(--ink)",
																	}}
																/>
															</div>
															<span className="text-[10px]">
																{formatPercent(item.ratio)} ·{" "}
																{item.phase || "CONVERTING"}
															</span>
														</div>
													) : (
														<span
															style={{
																color:
																	isDoneRow || isErrorRow
																		? "var(--ink)"
																		: "var(--ink-muted)",
															}}
														>
															{item.status.toUpperCase()}
														</span>
													)}
												</td>

												{/* Actions: Remove or Save */}
												<td
													className="border-b px-3 py-2 text-right"
													style={cellStyle}
												>
													{isDoneRow ? (
														<button
															type="button"
															onClick={() => handleSaveRow(item)}
															aria-label={`Save ${item.file.name}`}
															className="mono border px-2 py-0.5 text-[11px]"
															style={{
																color: "var(--ink)",
																borderColor: "var(--ink)",
																borderRadius: "var(--radius)",
																background: "transparent",
															}}
														>
															SAVE
														</button>
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
															}}
														>
															✕
														</button>
													)}
												</td>
											</tr>

											{/* Error Panel Row */}
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
							</tbody>
						</table>
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
										}}
									>
										CLEAR ALL
									</button>

									{doneCount > 0 && (
										<button
											type="button"
											onClick={handleDownloadAllZip}
											className="mono border px-4 py-2 text-[12px] font-medium"
											style={{
												color: "var(--ground)",
												background: "var(--ink)",
												borderColor: "var(--ink)",
												borderRadius: "var(--radius-pill)",
											}}
										>
											DOWNLOAD ALL (ZIP)
										</button>
									)}

									<button
										type="button"
										disabled={selectedCount === 0}
										onClick={startConversion}
										className="mono border px-6 py-2 text-[13px] font-medium transition-opacity"
										style={{
											color: "var(--ground)",
											background: "var(--ink)",
											borderColor: "var(--ink)",
											borderRadius: "var(--radius-pill)",
											opacity: selectedCount === 0 ? 0.4 : 1,
											cursor: selectedCount === 0 ? "not-allowed" : "pointer",
										}}
									>
										CONVERT {selectedCount > 0 ? `${selectedCount} ` : ""}
										{selectedCount === 1 ? "FILE" : "FILES"}
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
