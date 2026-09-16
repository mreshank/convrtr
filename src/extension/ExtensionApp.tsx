import { useCallback, useEffect, useState } from "react";
import { MasterConverterClient } from "@/components/instrument/MasterConverterClient";
import "./extension.css";

export type ExtensionMode = "sidepanel" | "popup" | "tab";

interface ExtensionAppProps {
	mode: ExtensionMode;
}

export function ExtensionApp({ mode }: ExtensionAppProps) {
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

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
				setStatusNotice(`Failed to fetch media from web: ${String(err)}`);
				setTimeout(() => setStatusNotice(null), 5000);
			}
		},
		[],
	);

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
						await ingestMediaUrl(staged.url, staged.filename);
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
				data?: { url?: string; text?: string; filename?: string };
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

	const handleOpenSidePanel = async () => {
		if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
			await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
			window.close(); // Close popup once side panel opens
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

	const containerClass =
		mode === "popup"
			? "convrtr-popup-shell p-4"
			: mode === "sidepanel"
				? "convrtr-sidepanel-shell p-3 sm:p-4"
				: "convrtr-tab-shell p-4 sm:p-8";

	return (
		<div className={containerClass}>
			{/* Top Extension Header */}
			<header
				className="flex items-center justify-between border-b pb-3 mb-4 gap-2"
				style={{ borderColor: "var(--rule)" }}
			>
				<div className="flex items-center gap-2.5">
					{/* Logo Mark Chevron */}
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

					<div className="flex items-baseline gap-2">
						<span
							className="mono font-semibold tracking-tight text-[13px] uppercase"
							style={{ color: "var(--ink)" }}
						>
							convrtr
						</span>
						<span
							className="mono text-[10px] uppercase px-1.5 py-0.5 border"
							style={{
								borderColor: "var(--rule)",
								color: "var(--accent)",
								background: "var(--surface)",
							}}
						>
							[{mode.toUpperCase()}]
						</span>
					</div>
				</div>

				{/* Header Actions */}
				<div className="flex items-center gap-2">
					{mode === "popup" && (
						<>
							<button
								type="button"
								onClick={handleOpenSidePanel}
								className="mono text-[11px] px-2.5 py-1 border transition-colors cursor-pointer"
								style={{
									background: "var(--ink)",
									color: "var(--ground)",
									borderColor: "var(--ink)",
								}}
								title="Dock in Chrome Side Panel (Command+Shift+C)"
							>
								SIDE PANEL ↗
							</button>
							<button
								type="button"
								onClick={handleOpenFullTab}
								className="mono text-[11px] px-2.5 py-1 border transition-colors cursor-pointer"
								style={{
									background: "transparent",
									color: "var(--ink-muted)",
									borderColor: "var(--rule)",
								}}
								title="Open in Full Tab Studio"
							>
								FULL TAB ↗
							</button>
						</>
					)}

					{mode === "sidepanel" && (
						<button
							type="button"
							onClick={handleOpenFullTab}
							className="mono text-[11px] px-2.5 py-1 border transition-colors cursor-pointer"
							style={{
								background: "transparent",
								color: "var(--ink-muted)",
								borderColor: "var(--rule)",
							}}
							title="Expand to Full Tab Studio"
						>
							FULL STUDIO ↗
						</button>
					)}

					{mode === "tab" && (
						<span
							className="mono text-[11px]"
							style={{ color: "var(--ink-muted)" }}
						>
							100% IN-BROWSER · LOCAL ENGINE
						</span>
					)}
				</div>
			</header>

			{/* Notification bar for context menu / staging actions */}
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
				<MasterConverterClient />
			</main>
		</div>
	);
}
