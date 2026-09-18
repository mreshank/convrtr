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
					background: #0a0a0a;
					color: #e5e5e5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
					display: flex;
					flex-direction: column;
					overflow: hidden;
				}
				.browser-chrome {
					height: 44px;
					background: #121212;
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
					background: #1a1a1a;
					border: 1px solid #282828;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 0 12px;
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 11px;
					color: #888888;
				}
				.address-bar span { color: #cccccc; margin-right: 4px; }
				.content-area {
					flex: 1;
					display: flex;
					height: calc(800px - 44px);
				}
				.web-viewport {
					flex: 1;
					background: #0e0e0e;
					padding: 40px 48px;
					display: flex;
					flex-direction: column;
					border-right: 1px solid #222222;
					overflow: hidden;
				}
				.article-category {
					font-family: ui-monospace, monospace;
					font-size: 11px;
					color: #777777;
					text-transform: uppercase;
					letter-spacing: 1px;
					margin-bottom: 8px;
				}
				.article-title {
					font-size: 28px;
					font-weight: 700;
					color: #ffffff;
					margin-bottom: 16px;
					line-height: 1.2;
				}
				.article-body {
					font-size: 14px;
					line-height: 1.7;
					color: #999999;
					margin-bottom: 24px;
				}
				.media-card {
					border: 1px solid #222222;
					background: #141414;
					padding: 16px;
					display: flex;
					align-items: center;
					gap: 16px;
					border-radius: 4px;
				}
				.media-thumb {
					width: 72px;
					height: 72px;
					background: #1e1e1e;
					border: 1px solid #2a2a2a;
					display: flex;
					align-items: center;
					justify-content: center;
					font-family: ui-monospace, monospace;
					font-size: 11px;
					color: #666666;
				}
				.media-meta {
					flex: 1;
				}
				.media-name {
					font-size: 13px;
					font-weight: 600;
					color: #ffffff;
					margin-bottom: 4px;
				}
				.media-sub {
					font-family: ui-monospace, monospace;
					font-size: 11px;
					color: #777777;
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
					<span>https://</span>developer.mozilla.org/en-US/docs/WebAssembly
				</div>
			</div>
			<div class="content-area">
				<div class="web-viewport">
					<div class="article-category">Documentation</div>
					<div class="article-title">WebAssembly Architecture &amp; Client-Side Media</div>
					<div class="article-body">
						WebAssembly provides a portable binary-code format for executable programs, enabling high-performance client-side image, video, and document processing directly within modern web browsers without server uploads.
					</div>
					<div class="media-card">
						<div class="media-thumb">PNG</div>
						<div class="media-meta">
							<div class="media-name">diagram-architecture-overview.png</div>
							<div class="media-sub">2048 x 1536 px &bull; 1.8 MB &bull; Ready for conversion</div>
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
					background: #0a0a0a;
					color: #e5e5e5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
					display: flex;
					flex-direction: column;
					position: relative;
					overflow: hidden;
				}
				.browser-chrome {
					height: 44px;
					background: #121212;
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
					background: #1a1a1a;
					border: 1px solid #282828;
					border-radius: 4px;
					display: flex;
					align-items: center;
					padding: 0 12px;
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 11px;
					color: #888888;
				}
				.address-bar span { color: #cccccc; margin-right: 4px; }
				.desktop-canvas {
					flex: 1;
					padding: 48px 64px;
					background: #0e0e0e;
					position: relative;
				}
				.bg-article-title {
					font-size: 32px;
					font-weight: 700;
					color: #ffffff;
					margin-bottom: 16px;
				}
				.bg-article-body {
					font-size: 15px;
					line-height: 1.8;
					color: #888888;
					max-width: 600px;
					margin-bottom: 24px;
				}
				.popup-modal-shadow {
					position: absolute;
					top: 16px;
					right: 48px;
					width: 520px;
					height: 680px;
					box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 0 1px #333333;
					border-radius: 6px;
					overflow: hidden;
					background: #000000;
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
					<span>https://</span>developer.mozilla.org/en-US/docs/Web/Media/Formats
				</div>
			</div>
			<div class="desktop-canvas">
				<div class="bg-article-title">Media Container Formats &amp; Web Codecs</div>
				<div class="bg-article-body">
					Digital media formats encompass container specifications and compressed bitstreams. Client-side conversion enables seamless transcoding between raster graphics, audio tracks, and document formats directly on the end-user device.
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
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					padding: 36px;
					position: relative;
					overflow: hidden;
					border: 1px solid #222222;
				}
				.brand {
					display: flex;
					align-items: center;
					gap: 12px;
				}
				.brand-mark {
					width: 32px;
					height: 32px;
					background: #ffffff;
					clip-path: polygon(33% 13%, 82% 50%, 33% 87%, 25% 77%, 61% 50%, 25% 23%);
				}
				.brand-title {
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 22px;
					font-weight: 800;
					letter-spacing: 3px;
					color: #ffffff;
				}
				.middle {
					margin-top: 12px;
				}
				.headline {
					font-size: 22px;
					font-weight: 700;
					line-height: 1.2;
					color: #ffffff;
					margin-bottom: 8px;
				}
				.subline {
					font-size: 13px;
					color: #888888;
					line-height: 1.5;
				}
				.tag-strip {
					font-family: ui-monospace, monospace;
					font-size: 10px;
					color: #666666;
					letter-spacing: 1px;
					text-transform: uppercase;
				}
			</style>
		</head>
		<body>
			<div class="brand">
				<div class="brand-mark"></div>
				<div class="brand-title">CONVRTR</div>
			</div>
			<div class="middle">
				<div class="headline">In-Browser File Converter</div>
				<div class="subline">Fast, private media and document conversion directly inside your browser.</div>
			</div>
			<div class="tag-strip">
				100% Client-Side &bull; Zero Server Uploads
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
					background: #000000;
					color: #ffffff;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					padding: 64px 80px;
					position: relative;
					overflow: hidden;
					border: 1px solid #1a1a1a;
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
					width: 44px;
					height: 44px;
					background: #ffffff;
					clip-path: polygon(33% 13%, 82% 50%, 33% 87%, 25% 77%, 61% 50%, 25% 23%);
				}
				.brand-title {
					font-family: ui-monospace, SFMono-Regular, monospace;
					font-size: 32px;
					font-weight: 800;
					letter-spacing: 4px;
					color: #ffffff;
				}
				.hero {
					margin: 24px 0;
				}
				.headline {
					font-size: 48px;
					font-weight: 800;
					line-height: 1.1;
					letter-spacing: -1px;
					color: #ffffff;
					margin-bottom: 16px;
				}
				.subline {
					font-size: 20px;
					color: #888888;
					max-width: 800px;
					line-height: 1.6;
				}
				.footer-strip {
					display: flex;
					justify-content: space-between;
					align-items: center;
					border-top: 1px solid #1a1a1a;
					padding-top: 24px;
				}
				.footer-note {
					font-family: ui-monospace, monospace;
					font-size: 12px;
					color: #666666;
					letter-spacing: 1px;
					text-transform: uppercase;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<div class="brand">
					<div class="brand-mark"></div>
					<div class="brand-title">CONVRTR</div>
				</div>
			</div>
			<div class="hero">
				<div class="headline">Private In-Browser File Converter</div>
				<div class="subline">
					Convert media and documents locally on your device with WebAssembly. No server uploads, no queues, and full offline capability.
				</div>
			</div>
			<div class="footer-strip">
				<div class="footer-note">Client-Side WebAssembly &bull; Zero Server Uploads &bull; Open Source</div>
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
