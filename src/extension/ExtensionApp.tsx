import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardShortcutsModal } from "@/components/instrument/KeyboardShortcutsModal";
import { MasterConverterClient } from "@/components/instrument/MasterConverterClient";
import {
	clearHistory,
	exportHistoryAsCsv,
	exportHistoryAsJson,
	getHistory,
} from "@/core/history/store";
import type { ConversionHistoryRecord } from "@/core/history/types";
import { formatBytes, formatDuration } from "@/lib/format";
import { SITE } from "@/lib/site";
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

export function ExtensionApp({ mode }: ExtensionAppProps) {
	const [statusNotice, setStatusNotice] = useState<string | null>(null);
	const [showHistory, setShowHistory] = useState(false);
	const [showPresets, setShowPresets] = useState(true);
	const [showShortcuts, setShowShortcuts] = useState(false);
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

	// Ingest single media URL (e.g. from context menu)
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

	// Ingest text snippet (e.g. from context menu)
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

	// Ingest media or text from session storage or message passing
	useEffect(() => {
		async function checkStagedMedia() {
			if (typeof chrome === "undefined" || !chrome.storage?.session) return;
			try {
				const sessionData = (await chrome.storage.session.get(
					"latestStagedMedia",
				)) as {
					latestStagedMedia?: {
						url?: string;
						text?: string;
						filename?: string;
					};
				};
				const staged = sessionData.latestStagedMedia;
				if (staged) {
					await chrome.storage.session.remove("latestStagedMedia");
					if (staged.url) {
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
					url?: string;
					text?: string;
					filename?: string;
				};
			};
			if (msg?.type === "CONVRTR_STAGE_MEDIA") {
				if (msg.data?.url) {
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
	}, [ingestMediaUrl, ingestText]);

	// Clipboard Paste integration (Cmd+V / Ctrl+V)
	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					(activeElement as HTMLElement).isContentEditable)
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

	/**
	 * Seamless view switcher:
	 * 1. Synchronously dispatches session flush event so active files and operations are saved to IndexedDB.
	 * 2. Launches the target view (Side Panel, Popup, or Full Studio Tab).
	 * 3. Autocloses the current view so only one active view is open at any time.
	 */
	const switchView = useCallback(
		async (targetMode: ExtensionMode) => {
			if (targetMode === mode) return;

			// Flush current active queue state to IndexedDB before closing
			window.dispatchEvent(new CustomEvent("convrtr:flush-session"));
			await new Promise((resolve) => setTimeout(resolve, 60));

			if (targetMode === "sidepanel") {
				try {
					if (typeof chrome !== "undefined" && chrome.sidePanel?.open) {
						const currentWindow = await chrome.windows.getCurrent();
						if (currentWindow?.id) {
							await chrome.sidePanel.open({ windowId: currentWindow.id });
						}
					} else if (
						typeof chrome !== "undefined" &&
						chrome.runtime?.sendMessage
					) {
						await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
					}
				} catch (err) {
					console.warn("[convrtr] Error switching to side panel:", err);
				}

				// Autoclose current view
				if (mode === "tab") {
					if (typeof chrome !== "undefined" && chrome.tabs?.getCurrent) {
						const currentTab = await chrome.tabs.getCurrent();
						if (currentTab?.id) {
							await chrome.tabs.remove(currentTab.id);
							return;
						}
					}
					window.close();
				} else if (mode === "popup") {
					window.close();
				}
				return;
			}

			if (targetMode === "popup") {
				try {
					if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
						const currentWindow = await chrome.windows.getCurrent();
						await chrome.runtime.sendMessage({
							type: "OPEN_POPUP",
							windowId: currentWindow?.id,
						});
					} else {
						window.open("/popup.html", "_blank", "width=580,height=640");
					}
				} catch (err) {
					console.warn("[convrtr] Error switching to popup:", err);
				}

				// Autoclose current view
				if (mode === "sidepanel") {
					try {
						if (typeof chrome !== "undefined" && chrome.sidePanel?.close) {
							const currentWindow = await chrome.windows.getCurrent();
							if (currentWindow?.id) {
								await chrome.sidePanel
									.close({ windowId: currentWindow.id })
									.catch(() => {});
							}
						}
					} catch {
						// Fallback to window.close
					}
					window.close();
				} else if (mode === "tab") {
					if (typeof chrome !== "undefined" && chrome.tabs?.getCurrent) {
						const currentTab = await chrome.tabs.getCurrent();
						if (currentTab?.id) {
							await chrome.tabs.remove(currentTab.id);
							return;
						}
					}
					window.close();
				}
				return;
			}

			if (targetMode === "tab") {
				try {
					if (typeof chrome !== "undefined") {
						if (chrome.tabs?.create) {
							await chrome.tabs.create({
								url: chrome.runtime.getURL("tab.html"),
							});
						} else if (chrome.runtime?.sendMessage) {
							await chrome.runtime.sendMessage({ type: "OPEN_FULL_TAB" });
						}
					}
				} catch (err) {
					console.warn("[convrtr] Error switching to studio tab:", err);
				}

				// Autoclose current view
				if (mode === "sidepanel") {
					try {
						if (typeof chrome !== "undefined" && chrome.sidePanel?.close) {
							const currentWindow = await chrome.windows.getCurrent();
							if (currentWindow?.id) {
								await chrome.sidePanel
									.close({ windowId: currentWindow.id })
									.catch(() => {});
							}
						}
					} catch {
						// Fallback to window.close
					}
					window.close();
				} else if (mode === "popup") {
					window.close();
				}
			}
		},
		[mode],
	);

	// Handle in-app keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT" ||
					target.isContentEditable)
			) {
				return;
			}

			// '?' or Shift+'/': Toggle shortcuts guide modal
			if (e.key === "?" || (e.shiftKey && e.key === "/")) {
				e.preventDefault();
				setShowShortcuts((prev) => !prev);
				return;
			}

			// '1': Switch to side panel
			if (e.key === "1") {
				e.preventDefault();
				void switchView("sidepanel");
				return;
			}

			// '2': Switch to quick popup
			if (e.key === "2") {
				e.preventDefault();
				void switchView("popup");
				return;
			}

			// '3': Switch to full tab studio
			if (e.key === "3") {
				e.preventDefault();
				void switchView("tab");
				return;
			}

			// 'p' or 'P': Toggle presets bar
			if (e.key.toLowerCase() === "p" && !e.metaKey && !e.ctrlKey) {
				e.preventDefault();
				setShowPresets((prev) => !prev);
				return;
			}

			// 'h' or 'H': Toggle history drawer
			if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey) {
				e.preventDefault();
				setShowHistory((prev) => !prev);
				return;
			}

			// 'Escape': Close open modal or drawer
			if (e.key === "Escape") {
				if (showShortcuts) {
					setShowShortcuts(false);
					return;
				}
				if (showHistory) {
					setShowHistory(false);
					return;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [switchView, showShortcuts, showHistory]);

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
			? "convrtr-popup-shell p-3 sm:p-4"
			: mode === "sidepanel"
				? "convrtr-sidepanel-shell p-3 sm:p-4"
				: "convrtr-tab-shell p-4 sm:p-8";

	return (
		<div className={containerClass}>
			{/* Top Extension Header */}
			<header
				className="flex items-center justify-between border-b pb-3 mb-3"
				style={{ borderColor: "var(--rule)" }}
			>
				{/* Brand Identity & Current Mode Badge */}
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
						<h1
							className="mono font-bold tracking-tight text-[13px] uppercase m-0 leading-none"
							style={{ color: "var(--ink)" }}
						>
							convrtr
						</h1>
						<span
							className="mono text-[9px] uppercase px-1.5 py-0.5 border font-semibold"
							style={{
								borderColor: "var(--rule)",
								color: "var(--accent)",
								background: "var(--surface)",
							}}
							title={
								mode === "sidepanel"
									? "Docked Side Panel (Shortcut: ⌘⇧C or 1)"
									: mode === "popup"
										? "Quick Popup (Shortcut: ⌘⇧, or 2)"
										: "Full Tab Studio (Shortcut: ⌘⇧O or 3)"
							}
						>
							{mode === "sidepanel"
								? "SIDE PANEL [⌘⇧C]"
								: mode === "popup"
									? "POPUP [⌘⇧,]"
									: "STUDIO [⌘⇧O]"}
						</span>
					</div>
				</div>

				{/* Navigation & Mode Switch Actions */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={() => setShowPresets((prev) => !prev)}
						aria-label="Toggle Quick Format Presets Bar (P)"
						className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
						style={{
							background: showPresets ? "var(--surface)" : "transparent",
							color: showPresets ? "var(--accent)" : "var(--ink-muted)",
							borderColor: showPresets ? "var(--accent)" : "var(--rule)",
						}}
						title="Toggle Quick Format Presets (P)"
					>
						PRESETS
					</button>

					<button
						type="button"
						onClick={() => setShowHistory((prev) => !prev)}
						aria-label="Toggle Conversion History Drawer (H)"
						className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
						style={{
							background: showHistory ? "var(--surface)" : "transparent",
							color: showHistory ? "var(--accent)" : "var(--ink-muted)",
							borderColor: showHistory ? "var(--accent)" : "var(--rule)",
						}}
						title="Toggle Conversion History (H)"
					>
						HISTORY
						{historyRecords.length > 0 ? ` (${historyRecords.length})` : ""}
					</button>

					<button
						type="button"
						onClick={() => setShowShortcuts((prev) => !prev)}
						aria-label="View Keyboard Shortcuts Guide (?)"
						className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
						style={{
							background: showShortcuts ? "var(--surface)" : "transparent",
							color: showShortcuts ? "var(--accent)" : "var(--ink-muted)",
							borderColor: showShortcuts ? "var(--accent)" : "var(--rule)",
						}}
						title="Keyboard Shortcuts Cheat Sheet (?)"
					>
						KEYS [?]
					</button>

					{/* Mutually Exclusive Mode Switches: only show alternatives to current view */}
					{mode !== "sidepanel" && (
						<button
							type="button"
							onClick={() => void switchView("sidepanel")}
							aria-label="Dock into Side Panel and close current view (1)"
							className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
							style={{
								background: "var(--surface)",
								color: "var(--accent)",
								borderColor: "var(--accent)",
							}}
							title="Dock into Side Panel (Autocloses current view & resumes operations) [1]"
						>
							SIDEBAR ↗
						</button>
					)}

					{mode !== "popup" && (
						<button
							type="button"
							onClick={() => void switchView("popup")}
							aria-label="Open Quick Popup and close current view (2)"
							className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
							style={{
								background: "transparent",
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
							title="Open Quick Popup (Autocloses current view & resumes operations) [2]"
						>
							POPUP ↗
						</button>
					)}

					{mode !== "tab" && (
						<button
							type="button"
							onClick={() => void switchView("tab")}
							aria-label="Open Full Studio Tab and close current view (3)"
							className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer"
							style={{
								background: "transparent",
								color: "var(--ink)",
								borderColor: "var(--rule)",
							}}
							title="Open Full Studio Tab (Autocloses current view & resumes operations) [3]"
						>
							STUDIO ↗
						</button>
					)}

					<a
						href={`${SITE}/support`}
						target="_blank"
						rel="noreferrer"
						aria-label="Open Live Diagnostics & Support Center"
						className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer inline-flex items-center"
						style={{
							background: "transparent",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
						title="Diagnostics & Troubleshooting Center"
					>
						SUPPORT ↗
					</a>

					<a
						href={`${SITE}/feedback`}
						target="_blank"
						rel="noreferrer"
						aria-label="Submit Feedback or Format Proposals"
						className="mono text-[10px] px-2 py-1 border transition-colors cursor-pointer inline-flex items-center"
						style={{
							background: "transparent",
							color: "var(--ink)",
							borderColor: "var(--rule)",
						}}
						title="Feedback & Proposals"
					>
						FEEDBACK ↗
					</a>
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
								setStatusNotice(`Preset selected: [${p.label}]`);
								setTimeout(() => setStatusNotice(null), 3000);
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
					aria-labelledby="history-heading"
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
								id="history-heading"
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
										aria-label="Export history as CSV"
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
										aria-label="Export history as JSON"
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
									aria-label="Clear all conversion history records"
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
								aria-label="Close history drawer"
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
							aria-label="Filter conversion history"
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

			{/* Status Banner */}
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
						aria-label="Dismiss status notification"
						className="cursor-pointer opacity-70 hover:opacity-100 ml-2"
					>
						✕
					</button>
				</div>
			)}

			{/* Accessible Live Region */}
			<div role="status" aria-live="polite" className="sr-only">
				{statusNotice}
			</div>

			{/* Main Universal Converter Engine & UI */}
			<main className="flex-1 flex flex-col min-w-0">
				<MasterConverterClient
					initialFrom={initialFrom}
					initialTo={initialTo}
					showExtensionCallout={false}
					persistSession={true}
				/>
			</main>

			{/* Keyboard Shortcuts Modal */}
			<KeyboardShortcutsModal
				isOpen={showShortcuts}
				onClose={() => setShowShortcuts(false)}
				isExtensionMode={true}
			/>
		</div>
	);
}
