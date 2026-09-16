/**
 * convrtr — Background Service Worker (Manifest V3)
 *
 * Manages context menus, side panel triggers, keyboard shortcuts,
 * and media handoff from web pages into the convrtr Side Panel.
 */

// Setup context menus on installation or update
chrome.runtime.onInstalled.addListener(async () => {
	try {
		// Context menu items
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
			id: "convrtr_open_sidepanel",
			title: "Open convrtr Side Panel",
			contexts: ["page"],
		});

		// Configure side panel behavior: action icon shows popup with quick actions
		if (chrome.sidePanel?.setPanelBehavior) {
			await chrome.sidePanel.setPanelBehavior({
				openPanelOnActionClick: false,
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
		// 1. Open the Side Panel immediately
		await chrome.sidePanel.open({ windowId: tab.windowId });

		// 2. Handle selected text/code
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

		// 3. Handle media URL or link URL
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

// Handle keyboard shortcuts (e.g. Command+Shift+C / Ctrl+Shift+C)
chrome.commands.onCommand.addListener(async (command) => {
	if (command === "open_side_panel") {
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
	}
});

// Listen for messages from popup or side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
});
