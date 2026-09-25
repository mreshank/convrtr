/**
 * convrtr — Background Service Worker (Manifest V3)
 *
 * Manages context menus, side panel and popup view orchestration,
 * keyboard shortcuts, dynamic icon badging, and Omnibox search.
 *
 * Strict policy: Zero emojis in code, logs, and comments.
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

// Action click listener ensuring side panel opens on icon click
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
			id: "convrtr_open_popup",
			title: "Open Quick Popup (Command+Shift+,)",
			contexts: ["page"],
		});

		chrome.contextMenus.create({
			id: "convrtr_open_sidepanel",
			title: "Open Side Panel (Command+Shift+C)",
			contexts: ["page"],
		});

		chrome.contextMenus.create({
			id: "convrtr_open_studio",
			title: "Open Full Studio Tab (Command+Shift+O)",
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
		// 1. Open Quick Popup explicitly
		if (info.menuItemId === "convrtr_open_popup") {
			await openQuickPopup(tab.windowId);
			return;
		}

		// 2. Open Side Panel explicitly
		if (info.menuItemId === "convrtr_open_sidepanel") {
			await chrome.sidePanel.open({ windowId: tab.windowId });
			return;
		}

		// 3. Open Studio Tab explicitly
		if (info.menuItemId === "convrtr_open_studio") {
			const tabUrl = chrome.runtime.getURL("tab.html");
			await chrome.tabs.create({ url: tabUrl });
			return;
		}

		// Open Side Panel immediately for other contextual staging actions
		await chrome.sidePanel.open({ windowId: tab.windowId });

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
async function openQuickPopup(targetWindowId?: number) {
	try {
		const focusedWindow = targetWindowId
			? await chrome.windows.get(targetWindowId)
			: await chrome.windows.getLastFocused({ populate: false });

		const winId = focusedWindow?.id;

		// Close side panel if open in that window to ensure mutual exclusivity
		if (winId && typeof chrome.sidePanel?.close === "function") {
			chrome.sidePanel.close({ windowId: winId }).catch(() => {});
		}

		// Attempt native toolbar popup via Chrome 127+ API
		if (typeof chrome.action?.openPopup === "function") {
			try {
				await chrome.action.setPopup({ popup: "popup.html" });
				await chrome.action.openPopup({ windowId: winId });
				// Restore empty popup so subsequent icon clicks continue opening the side panel
				setTimeout(async () => {
					await chrome.action.setPopup({ popup: "" }).catch(() => {});
				}, 500);
				return;
			} catch (openErr) {
				console.warn("[convrtr:bg] chrome.action.openPopup fallback:", openErr);
			}
		}

		// Floating popup window fallback
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

// Handle keyboard shortcuts (Command+Shift+Comma / Command+Shift+C / Command+Shift+O)
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
	} else if (command === "open_studio") {
		try {
			const tabUrl = chrome.runtime.getURL("tab.html");
			await chrome.tabs.create({ url: tabUrl });
		} catch (err) {
			console.error(
				"[convrtr:bg] Error opening studio tab from shortcut:",
				err,
			);
		}
	}
});

// Listen for messages from popup, side panel, or client components
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message?.type === "OPEN_POPUP") {
		(async () => {
			try {
				await openQuickPopup(message.windowId);
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
				let winId = message.windowId;
				if (!winId) {
					const currentWindow = await chrome.windows.getCurrent();
					winId = currentWindow?.id;
				}
				if (winId) {
					await chrome.sidePanel.open({ windowId: winId });
					sendResponse({ ok: true });
				} else {
					sendResponse({ ok: false, error: "No active window" });
				}
			} catch (err) {
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true;
	}

	if (message?.type === "CLOSE_SIDE_PANEL") {
		(async () => {
			try {
				let winId = message.windowId;
				if (!winId) {
					const win = await chrome.windows.getLastFocused();
					winId = win?.id;
				}
				if (winId && typeof chrome.sidePanel?.close === "function") {
					await chrome.sidePanel.close({ windowId: winId }).catch(() => {});
				}
				sendResponse({ ok: true });
			} catch (err) {
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true;
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

	if (message?.type === "CLOSE_TAB") {
		(async () => {
			try {
				if (message.tabId) {
					await chrome.tabs.remove(message.tabId);
				}
				sendResponse({ ok: true });
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
