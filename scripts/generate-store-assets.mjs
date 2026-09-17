#!/usr/bin/env node

/**
 * convrtr — Chrome Web Store Asset Generator
 *
 * Generates official store listing assets adhering to Chrome Web Store specifications:
 * - Screenshots: 1280x800 PNG (Tab Studio, Docked Side Panel, Quick Popup)
 * - Small Promo Tile: 440x280 PNG
 *
 * Adheres strictly to zero-emojis, dark mode brutalist aesthetics.
 */

import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "..");
const distExt = resolve(root, "dist-extension");
const storeAssetsDir = resolve(root, "store-assets");

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".wasm": "application/wasm",
	".png": "image/png",
	".svg": "image/svg+xml",
	".json": "application/json",
};

async function startStaticServer(port = 4899) {
	const server = createServer(async (req, res) => {
		const cleanPath = req.url.split("?")[0].replace(/^\//, "") || "tab.html";
		const filePath = join(distExt, cleanPath);
		try {
			const data = await readFile(filePath);
			res.writeHead(200, {
				"Content-Type":
					MIME_TYPES[extname(filePath)] || "application/octet-stream",
			});
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end("Not found");
		}
	});

	await new Promise((res) => server.listen(port, res));
	return {
		url: `http://localhost:${port}`,
		close: () => new Promise((res) => server.close(res)),
	};
}

async function generateStoreAssets() {
	console.log(
		"[convrtr:store] Generating Chrome Web Store promotional assets...",
	);
	await mkdir(storeAssetsDir, { recursive: true });

	const server = await startStaticServer(4899);
	const browser = await chromium.launch();

	try {
		// 1. Screenshot 1: Tab Studio (1280x800)
		console.log("  → Capturing screenshot 1: Full Tab Studio (1280x800)...");
		const page1 = await browser.newPage({
			viewport: { width: 1280, height: 800 },
		});
		await page1.goto(`${server.url}/tab.html`);
		await page1.waitForSelector("header", { timeout: 5000 });
		await page1.waitForTimeout(600);
		await page1.screenshot({
			path: join(storeAssetsDir, "screenshot-1-tab-studio.png"),
		});
		await page1.close();

		// 2. Screenshot 2: Native Docked Side Panel Showcase (1280x800)
		console.log("  → Capturing screenshot 2: Docked Side Panel (1280x800)...");
		const page2 = await browser.newPage({
			viewport: { width: 1280, height: 800 },
		});
		const sidepanelHtml = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<style>
				* { box-sizing: border-box; margin: 0; padding: 0; }
				body {
					width: 1280px;
					height: 800px;
					background: #080808;
					color: #e5e5e5;
					font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
					display: flex;
					flex-direction: column;
					overflow: hidden;
				}
				.browser-chrome {
					height: 44px;
					background: #111111;
					border-bottom: 1px solid #222222;
					display: flex;
					align-items: center;
					padding: 0 16px;
					gap: 12px;
				}
				.traffic-lights {
					display: flex;
					gap: 8px;
				}
				.dot { width: 11px; height: 11px; border-radius: 50%; }
				.dot-red { background: #333333; }
				.dot-yellow { background: #333333; }
				.dot-green { background: #333333; }
				.address-bar {
					flex: 1;
					height: 28px;
					background: #181818;
					border: 1px solid #262626;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 0 12px;
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 11px;
					color: #888888;
					letter-spacing: 0.5px;
				}
				.address-bar span { color: #ffffff; margin-right: 6px; }
				.browser-action-icon {
					height: 28px;
					padding: 0 10px;
					background: #202020;
					border: 1px solid #333333;
					border-radius: 4px;
					display: flex;
					align-items: center;
					gap: 6px;
					font-family: ui-monospace, monospace;
					font-size: 11px;
					color: #38ef7d;
					font-weight: 600;
				}
				.content-area {
					flex: 1;
					display: flex;
					height: calc(800px - 44px);
				}
				.web-viewport {
					flex: 1;
					background: #0d0d0d;
					padding: 48px;
					display: flex;
					flex-direction: column;
					justify-content: center;
					border-right: 1px solid #222222;
				}
				.hero-tag {
					font-family: ui-monospace, monospace;
					font-size: 11px;
					color: #888888;
					text-transform: uppercase;
					letter-spacing: 2px;
					margin-bottom: 12px;
				}
				.hero-title {
					font-size: 38px;
					font-weight: 700;
					line-height: 1.15;
					letter-spacing: -1px;
					color: #ffffff;
					margin-bottom: 16px;
				}
				.hero-desc {
					font-size: 15px;
					line-height: 1.6;
					color: #888888;
					max-width: 540px;
					margin-bottom: 28px;
				}
				.specs-grid {
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 16px;
					max-width: 540px;
				}
				.spec-box {
					background: #141414;
					border: 1px solid #222222;
					padding: 14px 16px;
				}
				.spec-num {
					font-family: ui-monospace, monospace;
					font-size: 20px;
					font-weight: 700;
					color: #ffffff;
					margin-bottom: 4px;
				}
				.spec-label {
					font-family: ui-monospace, monospace;
					font-size: 10px;
					color: #666666;
					text-transform: uppercase;
					letter-spacing: 1px;
				}
				.sidepanel-frame-wrapper {
					width: 440px;
					height: 100%;
					background: #000000;
					position: relative;
				}
				iframe {
					width: 100%;
					height: 100%;
					border: none;
				}
			</style>
		</head>
		<body>
			<div class="browser-chrome">
				<div class="traffic-lights">
					<div class="dot dot-red"></div>
					<div class="dot dot-yellow"></div>
					<div class="dot dot-green"></div>
				</div>
				<div class="address-bar">
					<span>convrtr.mreshank.com</span>/tools
				</div>
				<div class="browser-action-icon">
					<span>[SIDE PANEL DOCKED]</span>
				</div>
			</div>
			<div class="content-area">
				<div class="web-viewport">
					<div class="hero-tag">CHROME EXTENSION INTEGRATION</div>
					<div class="hero-title">CONVERT WHILE YOU BROWSE.</div>
					<div class="hero-desc">
						Dock convrtr alongside any active web page. Drag images, media, text, and local files directly into the panel without losing context.
					</div>
					<div class="specs-grid">
						<div class="spec-box">
							<div class="spec-num">200 TOOLS</div>
							<div class="spec-label">DEDICATED CONVERTERS</div>
						</div>
						<div class="spec-box">
							<div class="spec-num">147 ENGINES</div>
							<div class="spec-label">LOCAL CLIENT-SIDE</div>
						</div>
						<div class="spec-box">
							<div class="spec-num">ZERO UPLOADS</div>
							<div class="spec-label">100% PRIVATE &amp; OFFLINE</div>
						</div>
						<div class="spec-box">
							<div class="spec-num">MULTI-HOP</div>
							<div class="spec-label">AUTOMATIC GRAPH ROUTING</div>
						</div>
					</div>
				</div>
				<div class="sidepanel-frame-wrapper">
					<iframe src="${server.url}/sidepanel.html"></iframe>
				</div>
			</div>
		</body>
		</html>`;
		await page2.setContent(sidepanelHtml);
		await page2.waitForTimeout(1000);
		await page2.screenshot({
			path: join(storeAssetsDir, "screenshot-2-sidepanel.png"),
		});
		await page2.close();

		// 3. Screenshot 3: Quick Popup Surface (1280x800)
		console.log("  → Capturing screenshot 3: Quick Popup (1280x800)...");
		const page3 = await browser.newPage({
			viewport: { width: 1280, height: 800 },
		});
		const popupShowcaseHtml = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<style>
				* { box-sizing: border-box; margin: 0; padding: 0; }
				body {
					width: 1280px;
					height: 800px;
					background: #080808;
					color: #e5e5e5;
					font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
					display: flex;
					flex-direction: column;
					position: relative;
					overflow: hidden;
				}
				.browser-chrome {
					height: 44px;
					background: #111111;
					border-bottom: 1px solid #222222;
					display: flex;
					align-items: center;
					padding: 0 16px;
					gap: 12px;
				}
				.traffic-lights {
					display: flex;
					gap: 8px;
				}
				.dot { width: 11px; height: 11px; border-radius: 50%; }
				.dot-red { background: #333333; }
				.dot-yellow { background: #333333; }
				.dot-green { background: #333333; }
				.address-bar {
					flex: 1;
					height: 28px;
					background: #181818;
					border: 1px solid #262626;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 0 12px;
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 11px;
					color: #888888;
				}
				.address-bar span { color: #ffffff; }
				.browser-actions {
					display: flex;
					gap: 8px;
				}
				.action-btn {
					height: 28px;
					padding: 0 10px;
					background: #1a1a1a;
					border: 1px solid #333333;
					border-radius: 4px;
					font-family: ui-monospace, monospace;
					font-size: 10px;
					color: #ffffff;
					display: flex;
					align-items: center;
				}
				.action-btn.active {
					background: #ffffff;
					color: #000000;
					border-color: #ffffff;
					font-weight: 600;
				}
				.desktop-canvas {
					flex: 1;
					display: flex;
					align-items: center;
					justify-content: center;
					background: radial-gradient(circle at center, #151515 0%, #080808 100%);
					position: relative;
				}
				.popup-modal-shadow {
					position: absolute;
					top: 16px;
					right: 64px;
					width: 480px;
					height: 640px;
					box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 0 1px #333333;
					border-radius: 8px;
					overflow: hidden;
					background: #000000;
				}
				iframe {
					width: 100%;
					height: 100%;
					border: none;
				}
				.overlay-callout {
					position: absolute;
					left: 100px;
					bottom: 120px;
					max-width: 460px;
				}
				.callout-badge {
					font-family: ui-monospace, monospace;
					font-size: 11px;
					letter-spacing: 2px;
					color: #888888;
					text-transform: uppercase;
					margin-bottom: 12px;
				}
				.callout-title {
					font-size: 32px;
					font-weight: 700;
					line-height: 1.2;
					letter-spacing: -0.5px;
					color: #ffffff;
					margin-bottom: 12px;
				}
				.callout-desc {
					font-size: 14px;
					line-height: 1.6;
					color: #888888;
				}
				.callout-keys {
					display: inline-flex;
					gap: 6px;
					margin-top: 16px;
				}
				.key-chip {
					font-family: ui-monospace, monospace;
					font-size: 12px;
					padding: 6px 10px;
					background: #1c1c1c;
					border: 1px solid #333333;
					border-radius: 4px;
					color: #ffffff;
				}
			</style>
		</head>
		<body>
			<div class="browser-chrome">
				<div class="traffic-lights">
					<div class="dot dot-red"></div>
					<div class="dot dot-yellow"></div>
					<div class="dot dot-green"></div>
				</div>
				<div class="address-bar">
					<span>convrtr.mreshank.com</span>/tools
				</div>
				<div class="browser-actions">
					<div class="action-btn active">[CONVRTR POPUP]</div>
				</div>
			</div>
			<div class="desktop-canvas">
				<div class="overlay-callout">
					<div class="callout-badge">INSTANT KEYBOARD ACCESS</div>
					<div class="callout-title">HIGH-SPEED QUICK POPUP.</div>
					<div class="callout-desc">
						Summon convrtr instantly anywhere in Chrome with a dedicated keyboard shortcut. Convert files, extract page media, and switch smoothly to docked side panel or full tab with one click.
					</div>
					<div class="callout-keys">
						<span class="key-chip">COMMAND</span>
						<span class="key-chip">SHIFT</span>
						<span class="key-chip">COMMA</span>
					</div>
				</div>
				<div class="popup-modal-shadow">
					<iframe src="${server.url}/popup.html"></iframe>
				</div>
			</div>
		</body>
		</html>`;
		await page3.setContent(popupShowcaseHtml);
		await page3.waitForTimeout(1000);
		await page3.screenshot({
			path: join(storeAssetsDir, "screenshot-3-popup.png"),
		});
		await page3.close();

		// 4. Promo Small Tile (440x280)
		console.log("  → Capturing promo tile: Small Marquee Tile (440x280)...");
		const page4 = await browser.newPage({
			viewport: { width: 440, height: 280 },
		});
		const promoTileHtml = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<style>
				* { box-sizing: border-box; margin: 0; padding: 0; }
				body {
					width: 440px;
					height: 280px;
					background: #000000;
					color: #ffffff;
					font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					padding: 28px;
					position: relative;
					overflow: hidden;
					border: 1px solid #222222;
				}
				.top-row {
					display: flex;
					justify-content: space-between;
					align-items: flex-start;
				}
				.brand {
					display: flex;
					align-items: center;
					gap: 10px;
				}
				.brand-mark {
					width: 28px;
					height: 28px;
					background: #ffffff;
					clip-path: polygon(33% 13%, 82% 50%, 33% 87%, 25% 77%, 61% 50%, 25% 23%);
				}
				.brand-title {
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 20px;
					font-weight: 800;
					letter-spacing: 3px;
					color: #ffffff;
				}
				.tag-chip {
					font-family: ui-monospace, monospace;
					font-size: 9px;
					padding: 4px 8px;
					background: #141414;
					border: 1px solid #333333;
					color: #38ef7d;
					letter-spacing: 1px;
					font-weight: 600;
				}
				.middle {
					margin-top: 8px;
				}
				.headline {
					font-size: 24px;
					font-weight: 800;
					line-height: 1.15;
					letter-spacing: -0.5px;
					color: #ffffff;
					margin-bottom: 6px;
				}
				.subline {
					font-size: 12px;
					color: #888888;
					line-height: 1.4;
				}
				.bottom-metrics {
					display: flex;
					gap: 18px;
					border-top: 1px solid #1a1a1a;
					padding-top: 12px;
				}
				.metric {
					display: flex;
					flex-direction: column;
				}
				.metric-val {
					font-family: ui-monospace, monospace;
					font-size: 13px;
					font-weight: 700;
					color: #ffffff;
				}
				.metric-lbl {
					font-family: ui-monospace, monospace;
					font-size: 8px;
					color: #666666;
					letter-spacing: 1px;
					text-transform: uppercase;
				}
			</style>
		</head>
		<body>
			<div class="top-row">
				<div class="brand">
					<div class="brand-mark"></div>
					<div class="brand-title">CONVRTR</div>
				</div>
				<div class="tag-chip">100% LOCAL</div>
			</div>
			<div class="middle">
				<div class="headline">UNIVERSAL LOCAL FILE CONVERTER</div>
				<div class="subline">Side Panel &bull; Quick Popup &bull; Viewport Capture &bull; Deep Extraction</div>
			</div>
			<div class="bottom-metrics">
				<div class="metric">
					<span class="metric-val">200 TOOLS</span>
					<span class="metric-lbl">CONVERTERS</span>
				</div>
				<div class="metric">
					<span class="metric-val">147 ENGINES</span>
					<span class="metric-lbl">WASM &amp; CODECS</span>
				</div>
				<div class="metric">
					<span class="metric-val">0 UPLOADS</span>
					<span class="metric-lbl">PURE OFFLINE</span>
				</div>
			</div>
		</body>
		</html>`;
		await page4.setContent(promoTileHtml);
		await page4.waitForTimeout(400);
		await page4.screenshot({
			path: join(storeAssetsDir, "promo-small-tile.png"),
		});
		await page4.close();

		// 5. Marquee Promo Tile (1400x560)
		console.log("  → Capturing marquee tile: Large Promo Tile (1400x560)...");
		const page5 = await browser.newPage({
			viewport: { width: 1400, height: 560 },
		});
		const marqueeTileHtml = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<style>
				* { box-sizing: border-box; margin: 0; padding: 0; }
				body {
					width: 1400px;
					height: 560px;
					background: #050505;
					color: #ffffff;
					font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					padding: 60px 72px;
					position: relative;
					overflow: hidden;
					border: 1px solid #1a1a1a;
				}
				.bg-grid {
					position: absolute;
					top: 0; left: 0; right: 0; bottom: 0;
					background-image: linear-gradient(#111111 1px, transparent 1px), linear-gradient(to right, #111111 1px, transparent 1px);
					background-size: 40px 40px;
					opacity: 0.4;
					z-index: 1;
				}
				.content {
					position: relative;
					z-index: 2;
					height: 100%;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
				}
				.header {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
				.brand {
					display: flex;
					align-items: center;
					gap: 16px;
				}
				.brand-mark {
					width: 40px;
					height: 40px;
					background: #ffffff;
					clip-path: polygon(33% 13%, 82% 50%, 33% 87%, 25% 77%, 61% 50%, 25% 23%);
				}
				.brand-title {
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 28px;
					font-weight: 800;
					letter-spacing: 4px;
					color: #ffffff;
				}
				.badge-group {
					display: flex;
					gap: 10px;
				}
				.badge {
					font-family: ui-monospace, monospace;
					font-size: 11px;
					padding: 6px 12px;
					background: #111111;
					border: 1px solid #262626;
					letter-spacing: 1.5px;
					font-weight: 600;
				}
				.badge.accent {
					color: #38ef7d;
					border-color: #225533;
					background: #091a10;
				}
				.hero {
					margin: 24px 0;
				}
				.headline {
					font-size: 52px;
					font-weight: 800;
					line-height: 1.05;
					letter-spacing: -1.5px;
					color: #ffffff;
					margin-bottom: 12px;
				}
				.subline {
					font-size: 18px;
					color: #888888;
					max-width: 820px;
					line-height: 1.5;
				}
				.footer-strip {
					display: flex;
					justify-content: space-between;
					align-items: flex-end;
					border-top: 1px solid #1c1c1c;
					padding-top: 24px;
				}
				.metrics {
					display: flex;
					gap: 40px;
				}
				.metric {
					display: flex;
					flex-direction: column;
				}
				.metric-val {
					font-family: ui-monospace, monospace;
					font-size: 24px;
					font-weight: 700;
					color: #ffffff;
				}
				.metric-lbl {
					font-family: ui-monospace, monospace;
					font-size: 10px;
					color: #666666;
					letter-spacing: 1.5px;
					text-transform: uppercase;
					margin-top: 2px;
				}
				.feature-chips {
					display: flex;
					gap: 8px;
				}
				.chip {
					font-family: ui-monospace, monospace;
					font-size: 11px;
					padding: 6px 12px;
					background: #141414;
					border: 1px solid #262626;
					color: #cccccc;
				}
			</style>
		</head>
		<body>
			<div class="bg-grid"></div>
			<div class="content">
				<div class="header">
					<div class="brand">
						<div class="brand-mark"></div>
						<div class="brand-title">CONVRTR</div>
					</div>
					<div class="badge-group">
						<div class="badge accent">100% PRIVATE &amp; OFFLINE</div>
						<div class="badge">CHROME EXTENSION V0.2.1</div>
					</div>
				</div>
				<div class="hero">
					<div class="headline">UNIVERSAL LOCAL FILE CONVERTER</div>
					<div class="subline">
						Convert, compress, extract, and inspect media directly in your browser. Side panel dock, instant quick popup, active viewport capture, and deep page asset extraction with zero cloud dependencies.
					</div>
				</div>
				<div class="footer-strip">
					<div class="metrics">
						<div class="metric">
							<span class="metric-val">200 TOOLS</span>
							<span class="metric-lbl">DEDICATED CONVERTERS</span>
						</div>
						<div class="metric">
							<span class="metric-val">147 ENGINES</span>
							<span class="metric-lbl">WASM &amp; LOCAL CODECS</span>
						</div>
						<div class="metric">
							<span class="metric-val">0 BYTES</span>
							<span class="metric-lbl">REMOTE UPLOAD LIMIT</span>
						</div>
					</div>
					<div class="feature-chips">
						<div class="chip">SIDE PANEL</div>
						<div class="chip">QUICK POPUP ⌘⇧,</div>
						<div class="chip">PAGE CAPTURE ⌘⇧S</div>
						<div class="chip">MULTI-HOP GRAPH</div>
					</div>
				</div>
			</div>
		</body>
		</html>`;
		await page5.setContent(marqueeTileHtml);
		await page5.waitForTimeout(400);
		await page5.screenshot({
			path: join(storeAssetsDir, "promo-marquee-tile.png"),
		});
		await page5.close();

		console.log(
			"[convrtr:store] Store assets generated successfully in store-assets/:",
		);
		console.log("  - store-assets/icon-128.png (128x128)");
		console.log("  - store-assets/screenshot-1-tab-studio.png (1280x800)");
		console.log("  - store-assets/screenshot-2-sidepanel.png (1280x800)");
		console.log("  - store-assets/screenshot-3-popup.png (1280x800)");
		console.log("  - store-assets/promo-small-tile.png (440x280)");
		console.log("  - store-assets/promo-marquee-tile.png (1400x560)");
	} finally {
		await browser.close();
		await server.close();
	}
}

generateStoreAssets().catch((err) => {
	console.error("[convrtr:store] Asset generation failed:", err);
	process.exit(1);
});
