import { useCallback, useEffect, useMemo, useState } from "react";
import { MasterConverterClient } from "@/components/instrument/MasterConverterClient";
import {
	clearHistory,
	exportHistoryAsCsv,
	exportHistoryAsJson,
	getHistory,
} from "@/core/history/store";
import type { ConversionHistoryRecord } from "@/core/history/types";
import { formatBytes, formatDuration } from "@/lib/format";
import "./extension.css";

export type ExtensionMode = "sidepanel" | "popup" | "tab";

interface ExtensionAppProps {
	mode: ExtensionMode;
}

const QUICK_PRESETS = [
	{ id: "png-webp", label: "PNG➔WEBP", from: "png", to: "webp" },
	{ id: "webp-png", label: "WEBP➔PNG", from: "webp", to: "png" },
	{ id: "jpg-webp", label: "JPG➔WEBP", from: "jpg", to: "webp" },
	{ id: "raster-svg", label: "PNG➔SVG", from: "png", to: "svg" },
	{ id: "pdf-txt", label: "PDF➔TXT", from: "pdf", to: "txt" },
	{ id: "svg-png", label: "SVG➔PNG", from: "svg", to: "png" },
	{ id: "json-yaml", label: "JSON➔YAML", from: "json", to: "yaml" },
	{ id: "mp4-mp3", label: "MP4➔MP3", from: "mp4", to: "mp3" },
] as const;

/**
 * Converts a data URL into a native File object for local conversion.
 */
function dataUrlToFile(dataUrl: string, filename: string): File {
	const [header, base64] = dataUrl.split(",");
	const mime = header?.match(/:(.*?);/)?.[1] || "image/png";
	const binary = atob(base64 || "");
	const array = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		array[i] = binary.charCodeAt(i);
	}
	return new File([array], filename, {
		type: mime,
		lastModified: Date.now(),
	});
}

export function ExtensionApp({ mode }: ExtensionAppProps) {
	const [statusNotice, setStatusNotice] = useState<string | null>(null);
	const [showHistory, setShowHistory] = useState(false);
	const [showPresets, setShowPresets] = useState(true);
	const [historyQuery, setHistoryQuery] = useState("");
	const [historyRecords, setHistoryRecords] = useState<
		ConversionHistoryRecord[]
	>([]);

	// Read initial preset from URL query params (e.g. from omnibox)
	const { initialFrom, initialTo } = useMemo(() => {
		if (typeof window === "undefined") return {};
		const params = new URLSearchParams(window.location.search);
		return {
			initialFrom: params.get("from") || undefined,
			initialTo: params.get("to") || undefined,
		};
	}, []);

	// Ingest single media URL
	const ingestMediaUrl = useCallback(
		async (url: string, suggestedName?: string) => {
			try {
				setStatusNotice(`Fetching media: ${suggestedName || url}...`);
				const response = await fetch(url);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const blob = await response.blob();
				const filename = suggestedName || "media-download";
				const file = new File([blob], filename, {
					type: blob.type || "application/octet-stream",
					lastModified: Date.now(),
				});

				window.dispatchEvent(
					new CustomEvent("convrtr:ingest", {
						detail: { files: [file] },
					}),
				);
				setStatusNotice(`Staged "${filename}" for conversion`);
				setTimeout(() => setStatusNotice(null), 4000);
			} catch (err) {
				console.error("[convrtr] Failed to fetch context menu media:", err);
				setStatusNotice(`Failed to fetch media: ${String(err)}`);
				setTimeout(() => setStatusNotice(null), 5000);
			}
		},
		[],
	);

	// Ingest multiple media URLs (from "Extract all media on page")
	const ingestMultipleUrls = useCallback(async (urls: string[]) => {
		setStatusNotice(`Extracting ${urls.length} media items from page...`);
		const files: File[] = [];

		for (let i = 0; i < urls.length; i++) {
			const url = urls[i];
			if (!url) continue;
			try {
				const res = await fetch(url);
				if (!res.ok) continue;
				const blob = await res.blob();
				let filename = `extracted-media-${i + 1}`;
				try {
					const pathname = new URL(url).pathname;
					const last = pathname.split("/").filter(Boolean).pop();
					if (last) filename = decodeURIComponent(last);
				} catch {
					// Fallback filename
				}
				files.push(
					new File([blob], filename, {
						type: blob.type || "application/octet-stream",
						lastModified: Date.now(),
					}),
				);
			} catch {
				// Continue with other URLs
			}
		}

		if (files.length > 0) {
			window.dispatchEvent(
				new CustomEvent("convrtr:ingest", {
					detail: { files },
				}),
			);
			setStatusNotice(
				`Successfully extracted and queued ${files.length} items`,
			);
			setTimeout(() => setStatusNotice(null), 4000);
		} else {
			setStatusNotice("No accessible media could be extracted from page");
			setTimeout(() => setStatusNotice(null), 4000);
		}
	}, []);

	// Ingest text snippet
	const ingestText = useCallback((text: string, suggestedName?: string) => {
		const filename = suggestedName || "snippet.txt";
		const file = new File([text], filename, {
			type: "text/plain;charset=utf-8",
			lastModified: Date.now(),
		});

		window.dispatchEvent(
			new CustomEvent("convrtr:ingest", {
				detail: { files: [file] },
			}),
		);
		setStatusNotice(`Staged text snippet "${filename}" for conversion`);
		setTimeout(() => setStatusNotice(null), 4000);
	}, []);

	// Ingest Data URL screenshot
	const ingestDataUrl = useCallback((dataUrl: string, filename?: string) => {
		const fname = filename || `capture-${Date.now()}.png`;
		const file = dataUrlToFile(dataUrl, fname);
		window.dispatchEvent(
			new CustomEvent("convrtr:ingest", {
				detail: { files: [file] },
			}),
		);
		setStatusNotice(`Staged page capture "${fname}" for conversion`);
		setTimeout(() => setStatusNotice(null), 4000);
	}, []);

	// Listen for drag-and-drop URL fetch events from MasterConverterClient
	useEffect(() => {
		const onFetchUrl = (e: CustomEvent<{ url: string }>) => {
			if (e.detail?.url) {
				void ingestMediaUrl(e.detail.url);
			}
		};
		window.addEventListener(
			"convrtr:fetch-url" as never,
			onFetchUrl as EventListener,
		);
		return () => {
			window.removeEventListener(
				"convrtr:fetch-url" as never,
				onFetchUrl as EventListener,
			);
		};
	}, [ingestMediaUrl]);

	// Ingest media, text, screenshots, or multiple URLs from session storage or message passing
	useEffect(() => {
		async function checkStagedMedia() {
			if (typeof chrome === "undefined" || !chrome.storage?.session) return;
			try {
				const sessionData = (await chrome.storage.session.get(
					"latestStagedMedia",
				)) as {
					latestStagedMedia?: {
						dataUrl?: string;
						url?: string;
						urls?: string[];
						text?: string;
						textAssets?: Array<{ text: string; filename: string }>;
						filename?: string;
					};
				};
				const staged = sessionData.latestStagedMedia;
				if (staged) {
					await chrome.storage.session.remove("latestStagedMedia");
					if (staged.dataUrl) {
						ingestDataUrl(staged.dataUrl, staged.filename);
					} else if (staged.textAssets && staged.textAssets.length > 0) {
						const files = staged.textAssets.map((asset) => {
							if (asset.text.startsWith("data:")) {
								return dataUrlToFile(asset.text, asset.filename);
							}
							return new File([asset.text], asset.filename, {
								type: asset.filename.endsWith(".svg")
									? "image/svg+xml"
									: "text/plain",
								lastModified: Date.now(),
							});
						});
						window.dispatchEvent(
							new CustomEvent("convrtr:ingest", { detail: { files } }),
						);
						setStatusNotice(
							`Staged ${files.length} vector and page assets for conversion`,
						);
						setTimeout(() => setStatusNotice(null), 4000);
					} else if (staged.urls && staged.urls.length > 0) {
						void ingestMultipleUrls(staged.urls);
					} else if (staged.url) {
						void ingestMediaUrl(staged.url, staged.filename);
					} else if (staged.text) {
						ingestText(staged.text, staged.filename);
					}
				}
			} catch (err) {
				console.error("[convrtr] Error reading staged media:", err);
			}
		}

		checkStagedMedia();

		const messageListener = (message: unknown) => {
			const msg = message as {
				type?: string;
				data?: {
					dataUrl?: string;
					url?: string;
					urls?: string[];
					text?: string;
					textAssets?: Array<{ text: string; filename: string }>;
					filename?: string;
				};
			};
			if (msg?.type === "CONVRTR_STAGE_MEDIA") {
				if (msg.data?.dataUrl) {
					ingestDataUrl(msg.data.dataUrl, msg.data.filename);
				} else if (msg.data?.textAssets && msg.data.textAssets.length > 0) {
					const files = msg.data.textAssets.map((asset) => {
						if (asset.text.startsWith("data:")) {
							return dataUrlToFile(asset.text, asset.filename);
						}
						return new File([asset.text], asset.filename, {
							type: asset.filename.endsWith(".svg")
								? "image/svg+xml"
								: "text/plain",
							lastModified: Date.now(),
						});
					});
					window.dispatchEvent(
						new CustomEvent("convrtr:ingest", { detail: { files } }),
					);
					setStatusNotice(
						`Staged ${files.length} vector and page assets for conversion`,
					);
					setTimeout(() => setStatusNotice(null), 4000);
				} else if (msg.data?.urls && msg.data.urls.length > 0) {
					void ingestMultipleUrls(msg.data.urls);
				} else if (msg.data?.url) {
					void ingestMediaUrl(msg.data.url, msg.data.filename);
				} else if (msg.data?.text) {
					ingestText(msg.data.text, msg.data.filename);
				}
			}
		};

		if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
			chrome.runtime.onMessage.addListener(messageListener);
			return () => {
				chrome.runtime.onMessage.removeListener(messageListener);
			};
		}
	}, [ingestDataUrl, ingestMediaUrl, ingestMultipleUrls, ingestText]);

	// Clipboard Paste integration (Cmd+V / Ctrl+V)
	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA")
			) {
				return;
			}

			const items = e.clipboardData?.items;
			if (!items) return;

			const files: File[] = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item && item.kind === "file") {
					const file = item.getAsFile();
					if (file) files.push(file);
				}
			}

			if (files.length > 0) {
				e.preventDefault();
				window.dispatchEvent(
					new CustomEvent("convrtr:ingest", {
						detail: { files },
					}),
				);
				setStatusNotice(
					`Pasted ${files.length} file${files.length === 1 ? "" : "s"} from clipboard`,
				);
				setTimeout(() => setStatusNotice(null), 4000);
			}
		};

		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, []);

	// Refresh history records on mount and when updated; update extension badge
	useEffect(() => {
		const loadHistory = () => {
			setHistoryRecords(getHistory());
			if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
				chrome.runtime
					.sendMessage({
						type: "SET_CONVERSION_BADGE",
						status: "done",
					})
					.catch(() => {});
			}
		};
		loadHistory();
		window.addEventListener("convrtr-history-updated", loadHistory);
		return () => {
			window.removeEventListener("convrtr-history-updated", loadHistory);
		};
	}, []);

	const handleOpenSidePanel = async () => {
		try {
			if (typeof chrome !== "undefined" && chrome.sidePanel?.open) {
				const currentWindow = await chrome.windows.getCurrent();
				if (currentWindow?.id) {
					await chrome.sidePanel.open({ windowId: currentWindow.id });
					window.close();
					return;
				}
			}
		} catch (err) {
			console.warn("[convrtr] Direct side panel open warning:", err);
		}
		if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
			await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
			window.close();
		}
	};

	const handleOpenPopup = async () => {
		if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
			await chrome.runtime.sendMessage({ type: "OPEN_POPUP" }).catch(() => {});
		} else {
			window.open("/popup.html", "_blank", "width=580,height=640");
		}
	};

	const handleOpenFullTab = async () => {
		if (typeof chrome !== "undefined") {
			if (chrome.tabs?.create) {
				await chrome.tabs.create({ url: chrome.runtime.getURL("tab.html") });
			} else if (chrome.runtime?.sendMessage) {
				await chrome.runtime.sendMessage({ type: "OPEN_FULL_TAB" });
			}
		}
	};

	const handleCaptureVisibleTab = async () => {
		if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
			setStatusNotice("Capturing visible page...");
			await chrome.runtime.sendMessage({ type: "CAPTURE_TAB" });
		}
	};

	const handleExtractAllPageAssets = async () => {
		if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
			setStatusNotice("Scanning page for media and vector assets...");
			await chrome.runtime.sendMessage({ type: "EXTRACT_PAGE_ASSETS" });
		}
	};

	const handlePasteFromClipboardButton = async () => {
		if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
			setStatusNotice(
				"Press ⌘V (or Ctrl+V) to paste files from your clipboard",
			);
			setTimeout(() => setStatusNotice(null), 3000);
			return;
		}

		try {
			const clipboardItems = await navigator.clipboard.read();
			const files: File[] = [];
			for (const item of clipboardItems) {
				for (const type of item.types) {
					if (type.startsWith("image/") || type === "application/pdf") {
						const blob = await item.getType(type);
						const ext = type.split("/")[1] || "png";
						files.push(
							new File([blob], `pasted-${Date.now()}.${ext}`, {
								type,
								lastModified: Date.now(),
							}),
						);
					}
				}
			}

			if (files.length > 0) {
				window.dispatchEvent(
					new CustomEvent("convrtr:ingest", {
						detail: { files },
					}),
				);
				setStatusNotice(`Pasted ${files.length} file(s) from clipboard`);
				setTimeout(() => setStatusNotice(null), 4000);
			} else {
				setStatusNotice("No image or document detected in clipboard");
				setTimeout(() => setStatusNotice(null), 3000);
			}
		} catch {
			setStatusNotice("Press ⌘V (or Ctrl+V) to paste directly");
			setTimeout(() => setStatusNotice(null), 3000);
		}
	};

	// Filtered history records
	const filteredHistory = useMemo(() => {
		if (!historyQuery.trim()) return historyRecords;
		const q = historyQuery.toLowerCase();
		return historyRecords.filter(
			(r) =>
				r.inputName.toLowerCase().includes(q) ||
				r.outputName.toLowerCase().includes(q) ||
				r.toolId.toLowerCase().includes(q) ||
				r.status.toLowerCase().includes(q),
		);
	}, [historyRecords, historyQuery]);

	const handleExportCsv = () => {
		const csv = exportHistoryAsCsv(filteredHistory);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `convrtr-history-${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportJson = () => {
		const json = exportHistoryAsJson(filteredHistory);
		const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `convrtr-history-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const containerClass =
		mode === "popup"
			? "convrtr-popup-shell p-4"
			: mode === "sidepanel"
				? "convrtr-sidepanel-shell p-3 sm:p-4"
				: "convrtr-tab-shell p-4 sm:p-8";

	return (
		<div className={containerClass}>
			{/* Popup Mode Helper Banner */}
			{mode === "popup" && (
				<div
					className="mono text-[11px] px-3 py-2 border mb-3 flex items-center justify-between gap-2"
					style={{
						borderColor: "var(--rule-subtle)",
						background: "var(--surface)",
						color: "var(--ink)",
					}}
				>
					<span className="truncate">Quick Popup [⌘⇧,]. Dock alongside tabs:</span>
					<button
						type="button"
						onClick={handleOpenSidePanel}
						className="mono text-[10px] px-2.5 py-1 border font-semibold shrink-0 cursor-pointer"
						style={{
							background: "var(--accent)",
							color: "var(--ground)",
							borderColor: "var(--accent)",
						}}
						title="Dock in Chrome Side Panel (⌘⇧C)"
					>
						DOCK IN SIDE PANEL ↗
					</button>
				</div>
			)}

			{/* Top Extension Header */}
			<header
				className="flex flex-col gap-2.5 border-b pb-3 mb-3"
				style={{ borderColor: "var(--rule)" }}
			>
				{/* Row 1: Brand identity, mode, history, and studio expand */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div
							className="flex items-center justify-center w-6 h-6 border shrink-0"
							style={{
								background: "var(--surface)",
								borderColor: "var(--rule-strong)",
							}}
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 32 32"
								fill="none"
								stroke="currentColor"
								strokeWidth="4"
								strokeLinecap="square"
								strokeLinejoin="miter"
								aria-hidden="true"
							>
								<path d="M11 7 L23 16 L11 25" />
							</svg>
						</div>

						<div className="flex items-baseline gap-1.5">
							<span
								className="mono font-bold tracking-tight text-[13px] uppercase"
								style={{ color: "var(--ink)" }}
							>
								convrtr
							</span>
							<span
								className="mono text-[9px] uppercase px-1.5 py-0.5 border font-semibold"
								style={{
									borderColor: "var(--rule)",
									color: "var(--accent)",
									background: "var(--surface)",
								}}
								title={
									mode === "sidepanel"
										? "Docked Side Panel (Shortcut: ⌘⇧C or Ctrl+Shift+C)"
										: mode === "popup"
											? "Quick Popup (Shortcut: ⌘⇧, or Ctrl+Shift+,)"
											: "Full Tab Studio"
								}
							>
								{mode === "sidepanel"
									? "SIDE PANEL [⌘⇧C]"
									: mode === "popup"
										? "POPUP [⌘⇧,]"
										: "STUDIO"}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => setShowPresets((prev) => !prev)}
							className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
							style={{
								background: showPresets ? "var(--surface)" : "transparent",
								color: showPresets ? "var(--accent)" : "var(--ink-muted)",
								borderColor: showPresets ? "var(--accent)" : "var(--rule)",
							}}
							title="Toggle Quick Format Presets"
						>
							PRESETS
						</button>

						<button
							type="button"
							onClick={() => setShowHistory((prev) => !prev)}
							className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
							style={{
								background: showHistory ? "var(--surface)" : "transparent",
								color: showHistory ? "var(--accent)" : "var(--ink-muted)",
								borderColor: showHistory ? "var(--accent)" : "var(--rule)",
							}}
							title="Toggle Conversion History"
						>
							HISTORY
							{historyRecords.length > 0 ? ` (${historyRecords.length})` : ""}
						</button>

						{mode === "sidepanel" && (
							<button
								type="button"
								onClick={handleOpenPopup}
								className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
								style={{
									background: "transparent",
									color: "var(--ink)",
									borderColor: "var(--rule)",
								}}
								title="Open Quick Popup (⌘⇧, or Ctrl+Shift+,)"
							>
								POPUP ↗
							</button>
						)}

						{mode === "popup" && (
							<button
								type="button"
								onClick={handleOpenSidePanel}
								className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
								style={{
									background: "var(--surface)",
									color: "var(--accent)",
									borderColor: "var(--accent)",
								}}
								title="Dock in Chrome Side Panel (⌘⇧C or Ctrl+Shift+C)"
							>
								SIDE PANEL ↗
							</button>
						)}

						<button
							type="button"
							onClick={handleOpenFullTab}
							className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
							style={{
								background: "transparent",
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
							title="Expand to Full Tab Studio"
						>
							STUDIO ↗
						</button>
					</div>
				</div>

				{/* Row 2: 3-column utility grid */}
				<div className="grid grid-cols-3 gap-1.5">
					<button
						type="button"
						onClick={handleCaptureVisibleTab}
						className="mono text-[10px] py-1.5 px-2 border flex items-center justify-center transition-colors cursor-pointer text-center"
						style={{
							background: "var(--surface)",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
						title="Capture visible tab viewport screenshot (⌘⇧S)"
					>
						<span className="truncate">CAPTURE</span>
					</button>

					<button
						type="button"
						onClick={handleExtractAllPageAssets}
						className="mono text-[10px] py-1.5 px-2 border flex items-center justify-center transition-colors cursor-pointer text-center"
						style={{
							background: "var(--surface)",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
						title="Extract all media & SVGs from current webpage"
					>
						<span className="truncate">EXTRACT</span>
					</button>

					<button
						type="button"
						onClick={handlePasteFromClipboardButton}
						className="mono text-[10px] py-1.5 px-2 border flex items-center justify-center transition-colors cursor-pointer text-center"
						style={{
							background: "var(--surface)",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
						title="Paste image/document from clipboard (⌘V)"
					>
						<span className="truncate">PASTE ⌘V</span>
					</button>
				</div>
			</header>

			{/* Quick Workflow Presets Bar */}
			{showPresets && (
				<nav
					aria-label="Quick format presets"
					className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 border-b no-scrollbar"
					style={{ borderColor: "var(--rule-subtle)" }}
				>
					<span
						className="mono text-[10px] uppercase shrink-0 font-medium mr-1"
						style={{ color: "var(--ink-muted)" }}
					>
						PRESETS:
					</span>
					{QUICK_PRESETS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => {
								setStatusNotice(`Preset active: [${p.label}]`);
								setTimeout(() => setStatusNotice(null), 3500);
							}}
							className="mono text-[10px] px-2 py-0.5 border shrink-0 transition-colors cursor-pointer whitespace-nowrap"
							style={{
								borderColor: "var(--rule)",
								background: "var(--surface)",
								color: "var(--ink)",
							}}
						>
							{p.label}
						</button>
					))}
				</nav>
			)}

			{/* History Drawer with Search & Export */}
			{showHistory && (
				<section
					className="border p-4 mb-4 flex flex-col gap-3"
					style={{
						borderColor: "var(--rule-strong)",
						background: "var(--surface)",
						borderRadius: "var(--radius)",
					}}
				>
					<div
						className="flex items-center justify-between border-b pb-2 flex-wrap gap-2"
						style={{ borderColor: "var(--rule)" }}
					>
						<div className="flex items-center gap-2">
							<span
								className="mono text-[11px] font-semibold"
								style={{ color: "var(--accent)" }}
							>
								[ CONVERSION HISTORY ]
							</span>
							<span
								className="mono text-[11px]"
								style={{ color: "var(--ink-muted)" }}
							>
								{filteredHistory.length} of {historyRecords.length} records
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							{filteredHistory.length > 0 && (
								<>
									<button
										type="button"
										onClick={handleExportCsv}
										className="mono text-[10px] px-2 py-0.5 border cursor-pointer"
										style={{
											borderColor: "var(--rule)",
											color: "var(--ink)",
											background: "var(--ground)",
										}}
										title="Export filtered records as CSV"
									>
										CSV
									</button>
									<button
										type="button"
										onClick={handleExportJson}
										className="mono text-[10px] px-2 py-0.5 border cursor-pointer"
										style={{
											borderColor: "var(--rule)",
											color: "var(--ink)",
											background: "var(--ground)",
										}}
										title="Export filtered records as JSON"
									>
										JSON
									</button>
								</>
							)}
							{historyRecords.length > 0 && (
								<button
									type="button"
									onClick={() => {
										clearHistory();
										setHistoryRecords([]);
									}}
									className="mono text-[10px] px-2 py-0.5 border cursor-pointer"
									style={{
										borderColor: "var(--rule)",
										color: "var(--ink-muted)",
										background: "transparent",
									}}
								>
									CLEAR
								</button>
							)}
							<button
								type="button"
								onClick={() => setShowHistory(false)}
								className="mono text-[11px] cursor-pointer ml-1"
								style={{ color: "var(--ink-muted)" }}
							>
								✕
							</button>
						</div>
					</div>

					{/* Search Filter Input */}
					{historyRecords.length > 0 && (
						<input
							type="text"
							value={historyQuery}
							onChange={(e) => setHistoryQuery(e.target.value)}
							placeholder="Filter history by file name, format, or status..."
							className="mono text-[11px] px-2.5 py-1.5 border w-full outline-none"
							style={{
								background: "var(--ground)",
								borderColor: "var(--rule)",
								color: "var(--ink)",
							}}
						/>
					)}

					{filteredHistory.length === 0 ? (
						<p
							className="mono text-[11px] m-0 py-2 text-center"
							style={{ color: "var(--ink-muted)" }}
						>
							{historyRecords.length === 0
								? "No conversions recorded yet."
								: "No matching history records found."}
						</p>
					) : (
						<div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
							{filteredHistory.slice(0, 15).map((record) => (
								<div
									key={record.id}
									className="flex items-center justify-between border p-2 text-[11px] mono"
									style={{
										borderColor: "var(--rule)",
										background: "var(--ground)",
									}}
								>
									<div className="flex flex-col truncate max-w-[65%]">
										<span
											className="truncate font-medium"
											style={{ color: "var(--ink)" }}
										>
											{record.inputName}
										</span>
										<span
											className="text-[10px]"
											style={{ color: "var(--ink-muted)" }}
										>
											➔ {record.outputName} (
											{formatBytes(record.outputSize || 0)})
										</span>
									</div>
									<div className="flex flex-col items-end shrink-0">
										<span
											className="text-[10px] px-1 py-0.5 border"
											style={{
												borderColor:
													record.status === "success"
														? "var(--accent)"
														: "var(--rule)",
												color:
													record.status === "success"
														? "var(--accent)"
														: "var(--ink-muted)",
											}}
										>
											{record.status.toUpperCase()}
										</span>
										<span
											className="text-[9px]"
											style={{ color: "var(--ink-muted)" }}
										>
											{formatDuration(record.durationMs / 1000)}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			)}

			{/* Notification bar for context menu / staging / paste actions */}
			{statusNotice && (
				<div
					className="mono text-[11px] px-3 py-1.5 border mb-3 flex items-center justify-between"
					style={{
						borderColor: "var(--accent)",
						background: "var(--surface)",
						color: "var(--ink)",
					}}
				>
					<span>{statusNotice}</span>
					<button
						type="button"
						onClick={() => setStatusNotice(null)}
						className="cursor-pointer opacity-70 hover:opacity-100 ml-2"
					>
						✕
					</button>
				</div>
			)}

			{/* Main Universal Converter Engine & UI */}
			<main className="flex-1 flex flex-col min-w-0">
				<MasterConverterClient
					initialFrom={initialFrom}
					initialTo={initialTo}
				/>
			</main>
		</div>
	);
}
