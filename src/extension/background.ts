/**
 * convrtr — Background Service Worker (Manifest V3)
 *
 * Manages context menus, side panel triggers, keyboard shortcuts,
 * viewport screenshot capture, webpage asset extraction, dynamic
 * icon badging, and Omnibox search.
 */

import { TOOLS } from "@/core/registry";

// Ensure clicking the extension icon opens the native Side Panel directly
if (chrome.sidePanel?.setPanelBehavior) {
	chrome.sidePanel
		.setPanelBehavior({
			openPanelOnActionClick: true,
		})
		.catch((err) => {
			console.warn("[convrtr:bg] setPanelBehavior warning:", err);
		});
}

// Fallback action click listener ensuring side panel opens on icon click
chrome.action?.onClicked?.addListener(async (tab) => {
	try {
		if (tab?.windowId) {
			await chrome.sidePanel.open({ windowId: tab.windowId });
		} else {
			const win = await chrome.windows.getLastFocused();
			if (win?.id) {
				await chrome.sidePanel.open({ windowId: win.id });
			}
		}
	} catch (err) {
		console.error(
			"[convrtr:bg] Error opening side panel on action click:",
			err,
		);
	}
});

let badgeClearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Updates the extension toolbar icon badge to reflect active conversion state.
 * Uses RGBA arrays to stay within design system monochrome and accent palette.
 */
function updateExtensionBadge(
	status: "running" | "done" | "error" | "clear",
	count?: number,
) {
	if (!chrome.action?.setBadgeText) return;

	if (badgeClearTimer) {
		clearTimeout(badgeClearTimer);
		badgeClearTimer = null;
	}

	if (status === "running") {
		chrome.action.setBadgeText({ text: count ? String(count) : "..." });
		// Rule dark grey [48, 50, 54, 255]
		chrome.action.setBadgeBackgroundColor({ color: [48, 50, 54, 255] });
	} else if (status === "done") {
		chrome.action.setBadgeText({ text: "DONE" });
		// Accent green [52, 213, 154, 255]
		chrome.action.setBadgeBackgroundColor({ color: [52, 213, 154, 255] });
		badgeClearTimer = setTimeout(() => {
			chrome.action.setBadgeText({ text: "" }).catch(() => {});
		}, 3500);
	} else if (status === "error") {
		chrome.action.setBadgeText({ text: "ERR" });
		chrome.action.setBadgeBackgroundColor({ color: [220, 38, 38, 255] });
		badgeClearTimer = setTimeout(() => {
			chrome.action.setBadgeText({ text: "" }).catch(() => {});
		}, 4000);
	} else {
		chrome.action.setBadgeText({ text: "" }).catch(() => {});
	}
}

/**
 * Captures the current visible tab viewport as a high-resolution PNG
 * and stages it into the converter in the Side Panel.
 */
async function captureTabToConvrtr(windowId?: number) {
	try {
		let winId = windowId;
		if (!winId) {
			const win = await chrome.windows.getLastFocused();
			winId = win.id;
		}
		if (!winId) return;

		const dataUrl = await chrome.tabs.captureVisibleTab(winId, {
			format: "png",
		});
		if (!dataUrl) return;

		const filename = `capture-${Date.now()}.png`;
		const stagedItem = {
			dataUrl,
			filename,
			timestamp: Date.now(),
		};

		await chrome.storage.session.set({ latestStagedMedia: stagedItem });
		await chrome.sidePanel.open({ windowId: winId });

		chrome.runtime
			.sendMessage({
				type: "CONVRTR_STAGE_MEDIA",
				data: stagedItem,
			})
			.catch(() => {});
	} catch (err) {
		console.error("[convrtr:bg] Failed to capture tab:", err);
	}
}

/**
 * Extracts images, audio/video sources, canvases, inline SVGs, and linked documents
 * from the active webpage and stages them into convrtr.
 */
async function extractPageAssets(tabId: number, windowId?: number) {
	try {
		if (windowId) {
			await chrome.sidePanel.open({ windowId });
		}

		const results = await chrome.scripting.executeScript({
			target: { tabId },
			func: () => {
				const urls = new Set<string>();
				const textAssets: Array<{ text: string; filename: string }> = [];

				// 1. Responsive & Standard Images
				for (const img of Array.from(document.images)) {
					const src = img.currentSrc || img.src;
					if (src && !src.startsWith("data:")) urls.add(src);
				}

				// 2. Picture source tags
				for (const source of Array.from(
					document.querySelectorAll<HTMLSourceElement>("picture > source"),
				)) {
					if (source.srcset) {
						const first = source.srcset.split(",")[0]?.trim().split(/\s+/)[0];
						if (first && !first.startsWith("data:")) urls.add(first);
					}
				}

				// 3. Audio & Video
				for (const media of Array.from(
					document.querySelectorAll<HTMLMediaElement>("video, audio"),
				)) {
					if (media.src && !media.src.startsWith("data:")) {
						urls.add(media.src);
					}
					if (media instanceof HTMLVideoElement && media.poster) {
						if (!media.poster.startsWith("data:")) urls.add(media.poster);
					}
					for (const src of Array.from(
						media.querySelectorAll<HTMLSourceElement>("source"),
					)) {
						if (src.src && !src.src.startsWith("data:")) urls.add(src.src);
					}
				}

				// 4. Inline SVGs (serialize top icons/illustrations)
				let svgCount = 0;
				for (const svg of Array.from(
					document.querySelectorAll<SVGSVGElement>("svg"),
				)) {
					if (svgCount >= 10) break;
					const rect = svg.getBoundingClientRect();
					if (rect.width >= 16 && rect.height >= 16) {
						try {
							const serializer = new XMLSerializer();
							const xml = serializer.serializeToString(svg);
							if (xml.length > 50 && xml.length < 500000) {
								svgCount++;
								textAssets.push({
									text: xml,
									filename: `extracted-icon-${svgCount}.svg`,
								});
							}
						} catch {
							// ignore
						}
					}
				}

				// 5. Canvas elements
				let canvasCount = 0;
				for (const canvas of Array.from(
					document.querySelectorAll<HTMLCanvasElement>("canvas"),
				)) {
					if (canvasCount >= 5) break;
					if (canvas.width >= 16 && canvas.height >= 16) {
						try {
							const dataUrl = canvas.toDataURL("image/png");
							canvasCount++;
							textAssets.push({
								text: dataUrl,
								filename: `canvas-render-${canvasCount}.png`,
							});
						} catch {
							// ignore
						}
					}
				}

				// 6. Linked media & document assets
				const docExts = [
					".pdf",
					".svg",
					".docx",
					".xlsx",
					".csv",
					".json",
					".md",
					".zip",
					".mp3",
					".mp4",
					".webp",
					".heic",
				];
				for (const anchor of Array.from(
					document.querySelectorAll<HTMLAnchorElement>("a[href]"),
				)) {
					const href = anchor.href;
					if (!href || href.startsWith("javascript:") || href.startsWith("#")) {
						continue;
					}
					try {
						const pathname = new URL(href).pathname.toLowerCase();
						if (docExts.some((ext) => pathname.endsWith(ext))) {
							urls.add(href);
						}
					} catch {
						// ignore
					}
				}

				return {
					urls: Array.from(urls).slice(0, 40),
					textAssets,
				};
			},
		});

		const extracted = results[0]?.result as
			| {
					urls: string[];
					textAssets: Array<{ text: string; filename: string }>;
			  }
			| undefined;

		if (
			extracted &&
			(extracted.urls.length > 0 || extracted.textAssets.length > 0)
		) {
			const stagedItem = {
				urls: extracted.urls,
				textAssets: extracted.textAssets,
				timestamp: Date.now(),
			};
			await chrome.storage.session.set({ latestStagedMedia: stagedItem });
			chrome.runtime
				.sendMessage({
					type: "CONVRTR_STAGE_MEDIA",
					data: stagedItem,
				})
				.catch(() => {});
		}
	} catch (scriptErr) {
		console.error("[convrtr:bg] Error extracting page assets:", scriptErr);
	}
}

// Setup context menus on installation or update
chrome.runtime.onInstalled.addListener(async () => {
	try {
		chrome.contextMenus.create({
			id: "convrtr_convert_image",
			title: "Convert image with convrtr",
			contexts: ["image"],
		});

		chrome.contextMenus.create({
			id: "convrtr_convert_video",
			title: "Convert video with convrtr",
			contexts: ["video"],
		});

		chrome.contextMenus.create({
			id: "convrtr_convert_audio",
			title: "Convert audio with convrtr",
			contexts: ["audio"],
		});

		chrome.contextMenus.create({
			id: "convrtr_convert_link",
			title: "Convert target link with convrtr",
			contexts: ["link"],
		});

		chrome.contextMenus.create({
			id: "convrtr_convert_selection",
			title: "Convert selected text / code with convrtr",
			contexts: ["selection"],
		});

		chrome.contextMenus.create({
			id: "convrtr_capture_tab",
			title: "Capture visible page to convrtr",
			contexts: ["page"],
		});

		chrome.contextMenus.create({
			id: "convrtr_extract_page_media",
			title: "Extract all media & assets on page with convrtr",
			contexts: ["page"],
		});

		chrome.contextMenus.create({
			id: "convrtr_open_popup",
			title: "Open Quick Popup (⌘⇧,)",
			contexts: ["page"],
		});

		chrome.contextMenus.create({
			id: "convrtr_open_sidepanel",
			title: "Open convrtr Side Panel (⌘⇧C)",
			contexts: ["page"],
		});

		// Configure side panel behavior: clicking action icon opens the native Side Panel
		if (chrome.sidePanel?.setPanelBehavior) {
			await chrome.sidePanel.setPanelBehavior({
				openPanelOnActionClick: true,
			});
		}
	} catch (err) {
		console.error(
			"[convrtr:bg] Failed to initialize menus or panel behavior:",
			err,
		);
	}
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (!tab?.windowId) return;

	try {
		// 1. Viewport Screenshot capture
		if (info.menuItemId === "convrtr_capture_tab") {
			await captureTabToConvrtr(tab.windowId);
			return;
		}

		// 2. Open Quick Popup explicitly
		if (info.menuItemId === "convrtr_open_popup") {
			await openQuickPopup();
			return;
		}

		// 3. Open Side Panel explicitly
		if (info.menuItemId === "convrtr_open_sidepanel") {
			await chrome.sidePanel.open({ windowId: tab.windowId });
			return;
		}

		// Open Side Panel immediately for other contextual staging actions
		await chrome.sidePanel.open({ windowId: tab.windowId });

		// 4. Handle extracting all media & vector assets
		if (info.menuItemId === "convrtr_extract_page_media" && tab.id) {
			await extractPageAssets(tab.id, tab.windowId);
			return;
		}

		// 4. Handle selected text/code
		if (info.selectionText) {
			const text = info.selectionText.trim();
			let ext = "txt";
			if (text.startsWith("<svg") && text.endsWith("</svg>")) {
				ext = "svg";
			} else if (
				(text.startsWith("{") && text.endsWith("}")) ||
				(text.startsWith("[") && text.endsWith("]"))
			) {
				try {
					JSON.parse(text);
					ext = "json";
				} catch {
					// Fall back to txt
				}
			} else if (text.startsWith("# ") || text.startsWith("## ")) {
				ext = "md";
			} else if (
				text.includes("\\documentclass") ||
				text.includes("\\begin{")
			) {
				ext = "tex";
			}

			const filename = `snippet.${ext}`;
			const stagedItem = {
				text: info.selectionText,
				filename,
				timestamp: Date.now(),
			};

			await chrome.storage.session.set({ latestStagedMedia: stagedItem });
			chrome.runtime
				.sendMessage({
					type: "CONVRTR_STAGE_MEDIA",
					data: stagedItem,
				})
				.catch(() => {});
			return;
		}

		// 5. Handle media URL or link URL
		const mediaUrl = info.srcUrl || info.linkUrl;
		if (mediaUrl) {
			let filename = "downloaded-file";
			try {
				const parsed = new URL(mediaUrl);
				const pathname = parsed.pathname;
				const last = pathname.split("/").filter(Boolean).pop();
				if (last) filename = decodeURIComponent(last);
			} catch {
				// URL parsing failed, use default
			}

			const stagedItem = {
				url: mediaUrl,
				filename,
				timestamp: Date.now(),
			};

			await chrome.storage.session.set({ latestStagedMedia: stagedItem });
			chrome.runtime
				.sendMessage({
					type: "CONVRTR_STAGE_MEDIA",
					data: stagedItem,
				})
				.catch(() => {});
		}
	} catch (err) {
		console.error("[convrtr:bg] Error handling context menu action:", err);
	}
});

// Omnibox Quick Format Routing (e.g. typing "cv png to webp" or "cv pdf")
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
	const query = text.trim().toLowerCase();
	if (!query) return;

	const matches = TOOLS.filter((tool) => {
		const matchId = tool.id.toLowerCase().includes(query);
		const matchAccept = tool.accept.ext.some((e) =>
			e.toLowerCase().includes(query),
		);
		const matchOutput = tool.output.ext.toLowerCase().includes(query);
		const matchQueryPair = query.includes("to")
			? (() => {
					const parts = query.split(/\s+to\s+/);
					const from = parts[0]?.trim();
					const to = parts[1]?.trim();
					return (
						from &&
						to &&
						tool.accept.ext.map((e) => e.toLowerCase()).includes(from) &&
						tool.output.ext.toLowerCase() === to
					);
				})()
			: false;

		return matchId || matchAccept || matchOutput || matchQueryPair;
	}).slice(0, 6);

	const suggestions = matches.map((tool) => ({
		content: `${tool.accept.ext[0]} to ${tool.output.ext}`,
		description: `<match>convrtr:</match> Convert ${tool.accept.ext.join(", ").toUpperCase()} to <match>${tool.output.ext.toUpperCase()}</match> — ${tool.kind}`,
	}));

	suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
	let from = "";
	let to = "";
	if (text.includes(" to ")) {
		const parts = text.split(" to ");
		from = parts[0]?.trim().toLowerCase() ?? "";
		to = parts[1]?.trim().toLowerCase() ?? "";
	} else if (text.includes(" ")) {
		const parts = text.split(" ");
		from = parts[0]?.trim().toLowerCase() ?? "";
		to = parts[1]?.trim().toLowerCase() ?? "";
	} else {
		from = text.trim().toLowerCase();
	}

	const params = new URLSearchParams();
	if (from) params.set("from", from);
	if (to) params.set("to", to);

	const tabUrl = chrome.runtime.getURL(`tab.html?${params.toString()}`);
	await chrome.tabs.create({ url: tabUrl });
});

/**
 * Opens the convrtr Quick Popup.
 * Tries chrome.action.openPopup() first (native toolbar popup, Chrome 127+),
 * falling back to a dedicated compact floating window.
 */
async function openQuickPopup() {
	try {
		const focusedWindow = await chrome.windows.getLastFocused({
			populate: false,
		});

		// Attempt native toolbar popup via Chrome 127+ API
		if (typeof chrome.action?.openPopup === "function") {
			try {
				await chrome.action.setPopup({ popup: "popup.html" });
				await chrome.action.openPopup({ windowId: focusedWindow?.id });
				// Restore empty popup so subsequent icon clicks continue opening the side panel
				setTimeout(async () => {
					await chrome.action.setPopup({ popup: "" }).catch(() => {});
				}, 500);
				return;
			} catch (openErr) {
				console.warn("[convrtr:bg] chrome.action.openPopup fallback:", openErr);
			}
		}

		// Floating popup window (resilient across all browser versions)
		const width = 580;
		const height = 640;
		const left =
			focusedWindow?.left !== undefined && focusedWindow.width
				? Math.max(0, focusedWindow.left + focusedWindow.width - width - 40)
				: 200;
		const top = focusedWindow?.top !== undefined ? focusedWindow.top + 60 : 80;

		await chrome.windows.create({
			url: chrome.runtime.getURL("popup.html"),
			type: "popup",
			width,
			height,
			left,
			top,
			focused: true,
		});
	} catch (err) {
		console.error("[convrtr:bg] Failed to open quick popup:", err);
	}
}

// Handle keyboard shortcuts (Command+Shift+Comma / Command+Shift+C / Command+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
	if (command === "open_popup") {
		try {
			await openQuickPopup();
		} catch (err) {
			console.error("[convrtr:bg] Error opening popup from shortcut:", err);
		}
	} else if (command === "open_side_panel") {
		try {
			const currentWindow = await chrome.windows.getCurrent();
			if (currentWindow.id) {
				await chrome.sidePanel.open({ windowId: currentWindow.id });
			}
		} catch (err) {
			console.error(
				"[convrtr:bg] Error opening side panel from shortcut:",
				err,
			);
		}
	} else if (command === "capture_tab") {
		try {
			const currentWindow = await chrome.windows.getCurrent();
			await captureTabToConvrtr(currentWindow.id);
		} catch (err) {
			console.error("[convrtr:bg] Error capturing tab from shortcut:", err);
		}
	}
});

// Listen for messages from popup, side panel, or client components
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message?.type === "OPEN_POPUP") {
		(async () => {
			try {
				await openQuickPopup();
				sendResponse({ ok: true });
			} catch (err) {
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true;
	}

	if (message?.type === "OPEN_SIDE_PANEL") {
		(async () => {
			try {
				const currentWindow = await chrome.windows.getCurrent();
				if (currentWindow.id) {
					await chrome.sidePanel.open({ windowId: currentWindow.id });
					sendResponse({ ok: true });
				} else {
					sendResponse({ ok: false, error: "No active window" });
				}
			} catch (err) {
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true; // Keep channel open for async response
	}

	if (message?.type === "OPEN_FULL_TAB") {
		(async () => {
			try {
				const tabUrl = chrome.runtime.getURL("tab.html");
				const tab = await chrome.tabs.create({ url: tabUrl });
				sendResponse({ ok: true, tabId: tab.id });
			} catch (err) {
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true;
	}

	if (message?.type === "CAPTURE_TAB") {
		(async () => {
			try {
				await captureTabToConvrtr();
				sendResponse({ ok: true });
			} catch (err) {
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true;
	}

	if (message?.type === "EXTRACT_PAGE_ASSETS") {
		(async () => {
			try {
				const [activeTab] = await chrome.tabs.query({
					active: true,
					currentWindow: true,
				});
				if (activeTab?.id) {
					await extractPageAssets(activeTab.id, activeTab.windowId);
					sendResponse({ ok: true });
				} else {
					sendResponse({ ok: false, error: "No active tab" });
				}
			} catch (err) {
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true;
	}

	if (message?.type === "SET_CONVERSION_BADGE") {
		updateExtensionBadge(message.status, message.count);
		sendResponse({ ok: true });
		return false;
	}
});
